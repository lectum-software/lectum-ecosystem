import type { RequestHandler } from "express";
import { send } from "@/helpers/return";
import { error } from "@/helpers/translate";

type LimiterOptions = {
  window?: number;
  max?: number;
};

type LimiterEntry = {
  count: number;
  resetAt: number;
};

const DEFAULT_MAX_STORE_ENTRIES = 50_000;

const parsePositiveNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const getLimiter = (options: LimiterOptions = {}): RequestHandler => {
  const defaultWindowMinutes = parsePositiveNumber(process.env.RATE_LIMIT_TIME, 10);
  const defaultMaxRequests = parsePositiveNumber(process.env.RATE_LIMIT_RETRIES, 1000);
  const windowMs = parsePositiveNumber(options.window, defaultWindowMinutes) * 60 * 1000;
  const maxRequests = parsePositiveNumber(options.max, defaultMaxRequests);
  const maxStoreEntries = Math.floor(
    parsePositiveNumber(process.env.RATE_LIMIT_STORE_MAX_ENTRIES, DEFAULT_MAX_STORE_ENTRIES),
  );
  const store = new Map<string, LimiterEntry>();
  let lastCleanup = Date.now();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const current = store.get(key);

    if (now - lastCleanup > windowMs) {
      lastCleanup = now;
      for (const [entryKey, entry] of store.entries()) {
        if (entry.resetAt <= now) store.delete(entryKey);
      }
    }

    const setRateLimitHeaders = (entry: LimiterEntry) => {
      res.setHeader("RateLimit-Limit", String(maxRequests));
      res.setHeader("RateLimit-Remaining", String(Math.max(0, maxRequests - entry.count)));
      res.setHeader("RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));
    };

    if (!current || current.resetAt <= now) {
      if (!current && store.size >= maxStoreEntries) {
        const oldestKey = store.keys().next().value;
        if (oldestKey) store.delete(oldestKey);
      }

      const nextEntry = {
        count: 1,
        resetAt: now + windowMs,
      };
      store.set(key, nextEntry);
      setRateLimitHeaders(nextEntry);
      return next();
    }

    current.count += 1;
    setRateLimitHeaders(current);

    if (current.count > maxRequests) {
      res.setHeader("Retry-After", Math.ceil((current.resetAt - now) / 1000));
      return send(res, {
        status: 429,
        ...error("too_many_requests", {}),
      });
    }

    return next();
  };
};
