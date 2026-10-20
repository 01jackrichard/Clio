"use client";

import React, { useState } from "react";
import { MotionValue, motion, useTransform, useMotionValueEvent } from "framer-motion";
import { cn } from "@/lib/utils";

export interface DissolveMuseumOverlayProps {
  scrollYProgress: MotionValue<number>;
  className?: string;
}

/**
 * Editorial museum-grade overlay for Clio's Scroll Dissolve Reveal.
 * Presents:
 * - Scene 1: "THE STUDY" · "Every idea begins somewhere." (Jan van der Heyden)
 * - Scene 2: "THE ARCHIVE" · "Knowledge, preserved." (Edward Lamson Henry)
 *
 * Styled with Fraunces, Inter Tight, and JetBrains Mono, transitioning seamlessly
 * with scroll progress without visual overlap or heavy opaque bars.
 */
export function DissolveMuseumOverlay({
  scrollYProgress,
  className,
}: DissolveMuseumOverlayProps) {
  const [activeStage, setActiveStage] = useState<"study" | "archive">("study");

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (latest >= 0.5 && activeStage !== "archive") {
      setActiveStage("archive");
    } else if (latest < 0.5 && activeStage !== "study") {
      setActiveStage("study");
    }
  });

  // Smooth opacity & subtle vertical translation for the central narrative
  const studyOpacity = useTransform(scrollYProgress, [0, 0.32, 0.5], [1, 1, 0]);
  const studyY = useTransform(scrollYProgress, [0, 0.32, 0.5], [0, 0, -10]);

  const archiveOpacity = useTransform(scrollYProgress, [0.48, 0.68, 1], [0, 1, 1]);
  const archiveY = useTransform(scrollYProgress, [0.48, 0.68, 1], [10, 0, 0]);

  // Provenance attribution crossfade
  const attrStudyOpacity = useTransform(scrollYProgress, [0, 0.42, 0.52], [1, 1, 0]);
  const attrArchiveOpacity = useTransform(scrollYProgress, [0.48, 0.6, 1], [0, 1, 1]);

  return (
    <div
      className={cn(
        "absolute inset-0 pointer-events-none flex flex-col justify-between p-4 sm:p-8 md:p-10 z-10",
        className
      )}
      aria-label="Archival reveal narrative overlay"
    >
      {/* ─────────────────────────────────────────────────────────────
          1. TOP ROW: EXHIBITION PLAQUE (LEFT) & STAGE INDICATOR (RIGHT)
          Floating cards leaving the center folio and painting 100% visible
         ───────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        {/* Editorial Exhibition Plaque (Upper Left) */}
        <div className="relative bg-[#0E0E11]/85 backdrop-blur-md p-3.5 sm:p-5 border border-[#F8F3EE]/15 rounded-xs shadow-2xl w-full max-w-[240px] xs:max-w-xs sm:max-w-sm min-h-[116px] sm:min-h-[132px] pointer-events-auto overflow-hidden">
          {/* Front state: THE STUDY */}
          <motion.div
            style={{ opacity: studyOpacity, y: studyY }}
            className="space-y-1 select-none"
          >
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D9534F] shrink-0" />
              <span className="meta-mono text-[9px] sm:text-[11px] uppercase tracking-[0.16em] sm:tracking-[0.2em] text-[#F8F3EE]/80 font-medium whitespace-nowrap">
                FOLIO I<span className="hidden sm:inline"> · PERSONAL SCHOLARSHIP</span>
              </span>
            </div>
            <h3 className="font-display text-lg sm:text-2xl md:text-3xl text-[#F8F3EE] tracking-[0.14em] uppercase font-semibold drop-shadow-sm">
              THE STUDY
            </h3>
            <p className="font-display italic text-xs sm:text-base md:text-lg text-[#F8F3EE]/95 leading-snug drop-shadow-sm">
              Every idea begins somewhere.
            </p>
          </motion.div>

          {/* Back state: THE ARCHIVE */}
          <motion.div
            style={{ opacity: archiveOpacity, y: archiveY }}
            className="absolute inset-0 p-3.5 sm:p-5 space-y-1 select-none"
          >
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D9534F] shrink-0" />
              <span className="meta-mono text-[9px] sm:text-[11px] uppercase tracking-[0.16em] sm:tracking-[0.2em] text-[#F8F3EE]/80 font-medium whitespace-nowrap">
                FOLIO II<span className="hidden sm:inline"> · INSTITUTIONAL RECORD</span>
              </span>
            </div>
            <h3 className="font-display text-lg sm:text-2xl md:text-3xl text-[#F8F3EE] tracking-[0.14em] uppercase font-semibold drop-shadow-sm">
              THE ARCHIVE
            </h3>
            <p className="font-display italic text-xs sm:text-base md:text-lg text-[#F8F3EE]/95 leading-snug drop-shadow-sm">
              Knowledge, preserved.
            </p>
          </motion.div>
        </div>

        {/* Top-Right Curatorial Stage Indicator */}
        <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs tracking-wider meta-mono text-[#F8F3EE]/90 bg-[#0E0E11]/80 backdrop-blur-md px-2.5 sm:px-3.5 py-1.5 sm:py-2 border border-[#F8F3EE]/15 rounded-xs shadow-lg shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D9534F] animate-pulse" />
            <span
              className={cn(
                "transition-colors duration-300 font-medium whitespace-nowrap",
                activeStage === "study"
                  ? "text-[#F8F3EE] font-semibold"
                  : "text-[#F8F3EE]/40"
              )}
            >
              <span className="text-[#D9534F] font-bold mr-0.5 sm:mr-1">01</span>{" "}
              <span className="hidden xs:inline">THE </span>STUDY
            </span>
            <span className="text-[#F8F3EE]/30 select-none">→</span>
            <span
              className={cn(
                "transition-colors duration-300 font-medium whitespace-nowrap",
                activeStage === "archive"
                  ? "text-[#F8F3EE] font-semibold"
                  : "text-[#F8F3EE]/40"
              )}
            >
              <span className="text-[#D9534F] font-bold mr-0.5 sm:mr-1">02</span>{" "}
              <span className="hidden xs:inline">THE </span>ARCHIVE
            </span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. BOTTOM ROW: ATTRIBUTION & PROVENANCE PLAQUE
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs meta-mono text-[#F8F3EE]/85">
        {/* Dynamic Artist Attribution Badge */}
        <div className="relative bg-[#0E0E11]/85 backdrop-blur-md px-3 sm:px-3.5 py-1.5 sm:py-2 border border-[#F8F3EE]/15 rounded-xs shadow-lg max-w-full overflow-hidden">
          {/* Study Attribution (Johann Hamza) */}
          <motion.div
            style={{ opacity: attrStudyOpacity }}
            className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs"
          >
            <span className="text-[#E06D53] font-semibold whitespace-nowrap">Johann Hamza</span>
            <span className="text-[#F8F3EE]/40 hidden sm:inline">·</span>
            <span className="text-[#F8F3EE]/90 italic font-display hidden sm:inline whitespace-nowrap">
              The Library
            </span>
            <span className="text-[#F8F3EE]/50 text-[10px] hidden md:inline whitespace-nowrap">
              · 19th c., Oil on panel
            </span>
          </motion.div>

          {/* Archive Attribution (Edward Lamson Henry) */}
          <motion.div
            style={{ opacity: attrArchiveOpacity }}
            className="absolute inset-0 px-3 sm:px-3.5 py-1.5 sm:py-2 flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs"
          >
            <span className="text-[#E06D53] font-semibold whitespace-nowrap">Edward Lamson Henry</span>
            <span className="text-[#F8F3EE]/40 hidden sm:inline">·</span>
            <span className="text-[#F8F3EE]/90 italic font-display hidden sm:inline whitespace-nowrap">
              Library Interior
            </span>
            <span className="text-[#F8F3EE]/50 text-[10px] hidden md:inline whitespace-nowrap">
              · c. 1900, Watercolour &amp; gouache
            </span>
          </motion.div>
        </div>

        {/* Archival Status Pip */}
        <div className="hidden sm:flex items-center gap-2 bg-[#0E0E11]/80 backdrop-blur-md px-3 py-1.5 border border-[#F8F3EE]/15 rounded-xs text-[11px] text-[#F8F3EE]/75 shadow-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D9534F] animate-pulse" />
          <span>Public Domain · Preserved in Perpetuity</span>
        </div>
      </div>
    </div>
  );
}
