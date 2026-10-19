"use client";

/**
 * Skiper UI — Skiper89 (Scroll Progress 001)
 * Reference: https://skiper-ui.com/v1/skiper89
 * Author: Gxuri (@Gur__vi)
 * Free React Component under Skiper UI terms.
 * Adapted for Clio Academic Archive design system.
 */

import React, { useState, type RefObject } from "react";
import NumberFlow from "@number-flow/react";
import {
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { cn } from "@/lib/utils";

export interface Skiper89Props {
  /** Optional container element whose scroll position is tracked */
  containerRef?: RefObject<HTMLElement | null>;
  /** Optional target element whose scroll position across the viewport is tracked */
  targetRef?: RefObject<HTMLElement | null>;
  /** Optional custom styling classes */
  className?: string;
  /** Custom accessible label for screen readers */
  ariaLabel?: string;
}

const Skiper89 = ({
  containerRef,
  targetRef,
  className,
  ariaLabel = "Reading scroll progress",
}: Skiper89Props = {}) => {
  // Binds to target or container if provided; defaults to window scroll (zero props required)
  const { scrollYProgress } = useScroll(
    containerRef || targetRef
      ? {
          ...(containerRef ? { container: containerRef as RefObject<HTMLElement> } : {}),
          ...(targetRef ? { target: targetRef as RefObject<HTMLElement> } : {}),
        }
      : undefined
  );

  const [progressPercent, setProgressPercent] = useState<number>(0);
  const shouldReduceMotion = useReducedMotion();

  const clampedProgress = useTransform(scrollYProgress, (value: number) =>
    Math.min(Math.max(value, 0), 1)
  );

  const progressAsPercent = useTransform(clampedProgress, (value: number) =>
    Math.round(value * 100)
  );

  useMotionValueEvent(progressAsPercent, "change", (value: number) => {
    setProgressPercent(value);
  });

  const svgRadius = 18;
  const circumference = 2 * Math.PI * svgRadius;

  return (
    <motion.div
      drag
      dragMomentum={false}
      whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
      role="status"
      aria-live="polite"
      aria-label={`${ariaLabel}: ${progressPercent}%`}
      className={cn(
        "group fixed top-24 right-4 sm:right-6 z-30 flex cursor-grab flex-col items-center select-none active:cursor-grabbing touch-none",
        className
      )}
    >
      {/* Percentage tag: reveals smoothly on hover or drag */}
      <div className="pointer-events-none absolute -top-8 flex h-6 items-center justify-center rounded-none border border-ink/20 bg-paper/95 px-2 py-0.5 shadow-xs backdrop-blur-sm transition-opacity duration-200 opacity-0 group-hover:opacity-100 group-active:opacity-100">
        <NumberFlow
          value={progressPercent}
          className="meta-mono text-[11px] font-semibold tabular-nums text-ink"
          suffix="%"
        />
      </div>

      {/* Circular Progress Ring matching Clio Academic Palette */}
      <div
        className="flex size-12 items-center justify-center rounded-2xl border border-ink/15 bg-card/95 text-ink shadow-sm backdrop-blur-md transition-colors hover:border-oxblood/40"
        title={`Reading progress: ${progressPercent}% (Draggable)`}
      >
        <svg
          className="size-10 select-none"
          viewBox="0 0 48 48"
          role="presentation"
          aria-hidden="true"
        >
          {/* Subtle background track circle */}
          <circle
            cx="24"
            cy="24"
            r={svgRadius}
            stroke="currentColor"
            strokeWidth="2.5"
            className="text-ink/15"
            fill="none"
          />
          {/* Animated active progress arc in Clio signature oxblood */}
          <motion.circle
            cx="24"
            cy="24"
            r={svgRadius}
            stroke="#7A1F1D"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference}`}
            style={{
              pathLength: clampedProgress,
              rotate: -90,
              transformOrigin: "50% 50%",
            }}
          />
        </svg>
      </div>
    </motion.div>
  );
};

export { Skiper89 };
