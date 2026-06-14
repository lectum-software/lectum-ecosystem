"use client";

import type { LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  size?: "sm" | "md";
  value: 1 | -1;
};

const ICON_PULSE_MS = 180;
const COUNTER_PULSE_MS = 180;
const POSITIVE_DELTA_MS = 300;

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
  size = "md",
  value,
}: VoteActionButtonProps) => {
  const isUpvote = value === 1;
  const isActive = currentVote === value;
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

  const handleVote = () => {
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
    <button
      aria-label={label}
      aria-pressed={isActive}
      className={cn(
        "relative inline-flex items-center rounded-full text-xs font-bold transition-[background-color,color,transform] duration-200 active:scale-[0.97] disabled:opacity-60",
        "text-muted hover:bg-surface-muted hover:text-foreground",
        size === "sm" ? "h-8 gap-1 px-2" : "h-9 gap-1.5 px-2.5",
        isActive &&
          (isUpvote
            ? "bg-success/10 text-success hover:bg-success/15 hover:text-success"
            : "bg-danger/10 text-danger hover:bg-danger/15 hover:text-danger"),
        className,
      )}
      disabled={disabled}
      onClick={handleVote}
      title={label}
      type="button"
    >
      {positiveDeltaVisible ? (
        <span
          className={cn(
            "pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] font-black text-success transition-all duration-200",
            positiveDeltaLeaving ? "-translate-y-2 opacity-0" : "translate-y-0 opacity-100",
          )}
        >
          +1
        </span>
      ) : null}
      <Icon
        className={cn(
          "shrink-0 transition-transform duration-200 ease-out",
          size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4",
          iconPulsing ? "scale-[1.15]" : "scale-100",
        )}
        aria-hidden="true"
      />
      {typeof count === "number" ? (
        <span
          className={cn(
            "tabular-nums transition-all duration-200",
            counterPulsing ? "scale-105 opacity-90" : "scale-100 opacity-100",
          )}
        >
          {count.toLocaleString("pt-BR")}
        </span>
      ) : null}
    </button>
  );
};
