import { isIP } from "node:net";
import type { Request } from "express";

function normalizeIp(value: string | undefined) {
  if (!value || value.length > 64 || value.includes("%")) return null;
  const ip = value.trim();
  const family = isIP(ip);
  if (!family) return null;
  if (ip.toLowerCase().startsWith("::ffff:") && isIP(ip.slice(7)) === 4) return ip.slice(7);
  return family === 6 ? new URL(`http://[${ip}]/`).hostname : ip;
}

// Observations only: matching a caller-supplied header does not prove its authenticity.
// Do not return addresses, hashes, cookies, tokens or the User-Agent.
export function proxyDiagnosticReport(req: Request) {
  const rawForwarded = req.get("x-forwarded-for");
  const bounded = !rawForwarded || rawForwarded.length <= 2048;
  const forwarded = bounded && rawForwarded ? rawForwarded.split(",") : [];
  const normalized = forwarded.map(normalizeIp);
  const validChain = bounded && normalized.length <= 32 && normalized.every(Boolean);
  const client = normalizeIp(req.ip);
  const cloudflare = normalizeIp(req.get("cf-connecting-ip"));
  const setting: unknown = req.app.get("trust proxy");
  return {
    trust_proxy: typeof setting === "boolean" || typeof setting === "number" ? setting : "custom",
    forwarded_chain_valid: validChain,
    forwarded_hops: validChain ? normalized.length : null,
    cloudflare_header_valid: cloudflare !== null,
    resolved_ip_valid: client !== null,
    resolved_matches_cloudflare_header: client && cloudflare ? client === cloudflare : null,
    resolved_matches_nearest_forwarded:
      client && validChain && normalized.length ? client === normalized.at(-1) : null,
    cloudflare_matches_farthest_forwarded:
      cloudflare && validChain && normalized.length ? cloudflare === normalized[0] : null,
    verification: "requires_controlled_external_probe",
  };
}
