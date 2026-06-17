"use client";

import type { LucideIcon } from "lucide-react";
import type { MouseEventHandler } from "react";
import { useEffect, useRef, useState } from "react";
import {
  postActionCountClassName,
  postActionIconClassName,
  postActionTextClassName,
} from "@/components/community/post-action-button";
import { cn } from "@/lib/utils";

export type VoteValue = 1 | -1 | null;

type VoteActionButtonProps = {
  className?: string;
  count?: number;
  currentVote: VoteValue;
  disabled?: boolean;
  icon: LucideIcon;
  label: string;
  onVote: (value: 1 | -1) => void;
  showPositiveDelta?: boolean;
  showUpvoteText?: boolean;
  size?: "xs" | "sm" | "md";
  value: 1 | -1;
  variant?: "default" | "ghost";
};

const ICON_PULSE_MS = 180;
const COUNTER_PULSE_MS = 180;
const POSITIVE_DELTA_MS = 300;

const voteSizeClassName = (size: "xs" | "sm" | "md", iconOnly: boolean) => {
  const base =
    size === "xs" ? "h-6 text-[10px]" : size === "sm" ? "h-8 text-[12px]" : "h-9 text-[12px]";

  if (size === "xs") {
    return iconOnly ? `${base} w-6 gap-0 px-0` : `${base} min-w-6 gap-0.5 px-1.5`;
  }

  return iconOnly ? `${base} w-8 gap-0 px-0` : `${base} min-w-8 gap-1.5 px-2.5`;
};

const triggerHapticFeedback = () => {
  if (typeof navigator === "undefined") return;

  const hapticNavigator = navigator as Navigator & {
    vibrate?: (pattern: number | number[]) => boolean;
  };

  hapticNavigator.vibrate?.(10);
};

export const VoteActionButton = ({
  className,
  count,
  currentVote,
  disabled,
  icon: Icon,
  label,
  onVote,
  showPositiveDelta = true,
  showUpvoteText = true,
  size = "md",
  value,
  variant = "default",
}: VoteActionButtonProps) => {
  const isUpvote = value === 1;
  const isActive = currentVote === value;
  const iconOnly = !isUpvote && typeof count !== "number";
  const ghost = variant === "ghost";
  const [iconPulsing, setIconPulsing] = useState(false);
  const [counterPulsing, setCounterPulsing] = useState(false);
  const [positiveDeltaVisible, setPositiveDeltaVisible] = useState(false);
  const [positiveDeltaLeaving, setPositiveDeltaLeaving] = useState(false);
  const previousCountRef = useRef(count);
  const hasMountedRef = useRef(false);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    const timers = timersRef.current;

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof count !== "number") return;

    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      previousCountRef.current = count;
      return;
    }

    if (previousCountRef.current === count) return;

    previousCountRef.current = count;
    setCounterPulsing(true);

    const timer = window.setTimeout(() => {
      setCounterPulsing(false);
    }, COUNTER_PULSE_MS);
    timersRef.current.push(timer);
  }, [count]);

  const setTimer = (callback: () => void, timeout: number) => {
    const timer = window.setTimeout(callback, timeout);
    timersRef.current.push(timer);
  };

  const triggerPositiveDelta = () => {
    setPositiveDeltaVisible(true);
    setPositiveDeltaLeaving(false);

    window.requestAnimationFrame(() => {
      setPositiveDeltaLeaving(true);
    });

    setTimer(() => {
      setPositiveDeltaVisible(false);
      setPositiveDeltaLeaving(false);
    }, POSITIVE_DELTA_MS);
  };

  const handleVote: MouseEventHandler<HTMLButtonElement> = (event) => {
    event.stopPropagation();

    if (disabled) return;

    setIconPulsing(true);
    setTimer(() => {
      setIconPulsing(false);
    }, ICON_PULSE_MS);

    if (isUpvote && showPositiveDelta && currentVote !== 1) {
      triggerPositiveDelta();
    }

    triggerHapticFeedback();
    onVote(value);
  };

  return (
    <span className="relative inline-flex overflow-visible">
      {positiveDeltaVisible ? (
        <span
          className={cn(
            "pointer-events-none absolute -top-3 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap text-[10px] font-black text-success drop-shadow-sm transition-all duration-200 ease-out",
            positiveDeltaLeaving ? "-translate-y-3 opacity-0" : "translate-y-0 opacity-100",
          )}
        >
          +1
        </span>
      ) : null}

      <button
        aria-label={label}
        aria-pressed={isActive}
        className={cn(
          "relative inline-flex items-center justify-center rounded-full text-[12px] font-semibold leading-none tracking-[-0.01em] transition-[background-color,color,transform] duration-200 active:scale-[0.97] disabled:opacity-60",
          ghost
            ? "text-muted hover:bg-transparent hover:text-foreground"
            : "text-muted hover:bg-surface-muted hover:text-foreground",
          voteSizeClassName(size, iconOnly),
          isActive &&
            (ghost
              ? isUpvote
                ? "text-success hover:bg-transparent hover:text-success"
                : "text-danger hover:bg-transparent hover:text-danger"
              : isUpvote
                ? "bg-success/10 text-success hover:bg-success/15 hover:text-success"
                : "bg-danger/10 text-danger hover:bg-danger/15 hover:text-danger"),
          className,
        )}
        disabled={disabled}
        onClick={handleVote}
        title={label}
        type="button"
      >
        <Icon
          className={cn(
            postActionIconClassName(size),
            "transition-transform duration-200 ease-out",
            iconPulsing ? "scale-[1.15]" : "scale-100",
          )}
          strokeWidth={2}
          aria-hidden="true"
        />
        {isUpvote && showUpvoteText ? (
          <span className={postActionTextClassName(size)}>Útil</span>
        ) : null}
        {typeof count === "number" ? (
          <span
            className={cn(
              postActionCountClassName(size),
              "transition-all duration-200",
              counterPulsing ? "scale-105 opacity-90" : "scale-100 opacity-100",
            )}
          >
            {count.toLocaleString("pt-BR")}
          </span>
        ) : null}
      </button>
    </span>
  );
};
