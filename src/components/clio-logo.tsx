'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface ClioEmblemProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number;
}

/**
 * The official Clio Classical "C" Emblem:
 * Deep burgundy monogram with integrated fluted column motif and central diamond.
 */
export function ClioEmblem({ className, size = 32, ...props }: ClioEmblemProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      fill="none"
      className={cn('shrink-0 select-none', className)}
      aria-hidden="true"
      {...props}
    >
      <defs>
        <linearGradient id="clioEmblemGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#8E2522" />
          <stop offset="50%" stopColor="#7A1F1D" />
          <stop offset="100%" stopColor="#581514" />
        </linearGradient>
      </defs>

      <g transform="translate(256, 256)">
        {/* Classical Roman C Outer & Inner Bowl */}
        <path
          d="
            M 116 -128
            C 134 -128, 146 -114, 146 -98
            C 146 -80, 130 -66, 112 -66
            C 98 -66, 88 -76, 78 -88
            C 52 -122, 10 -144, -40 -144
            C -118 -144, -172 -88, -172 0
            C -172 88, -118 144, -40 144
            C 10 144, 52 122, 78 88
            C 88 76, 98 66, 112 66
            C 130 66, 146 80, 146 98
            C 146 114, 134 128, 116 128
            C 82 128, 54 168, -38 168
            C -138 168, -204 96, -204 0
            C -204 -96, -138 -168, -38 -168
            C 54 -168, 82 -128, 116 -128
            Z
          "
          fill="url(#clioEmblemGrad)"
        />

        {/* Integrated Classical Column */}
        <g id="clio-column">
          {/* Capital */}
          <rect x="-140" y="-124" width="60" height="12" rx="2" fill="#7A1F1D" />
          <path d="M -136 -112 L -126 -100 L -94 -100 L -84 -112 Z" fill="#581514" />
          <rect x="-130" y="-100" width="40" height="5" rx="1" fill="#7A1F1D" />

          {/* Shaft background and fluting channels */}
          <rect x="-126" y="-95" width="32" height="190" fill="#581514" />
          <rect x="-124" y="-92" width="6" height="184" rx="3" fill="#F4EFEB" />
          <rect x="-114" y="-92" width="6" height="184" rx="3" fill="#F4EFEB" />
          <rect x="-104" y="-92" width="6" height="184" rx="3" fill="#F4EFEB" />

          {/* Base */}
          <rect x="-130" y="95" width="40" height="5" rx="1" fill="#7A1F1D" />
          <path d="M -126 100 L -136 112 L -84 112 L -94 100 Z" fill="#581514" />
          <rect x="-140" y="112" width="60" height="14" rx="2" fill="#7A1F1D" />
        </g>

        {/* Central Classical Diamond Accent */}
        <g transform="translate(48, 0)">
          <polygon points="0,-36 36,0 0,36 -36,0" fill="url(#clioEmblemGrad)" />
          <polygon points="0,-18 18,0 0,18 -18,0" fill="#F4EFEB" />
          <polygon points="0,-8 8,0 0,8 -8,0" fill="#7A1F1D" />
        </g>
      </g>
    </svg>
  );
}

interface ClioLogoProps {
  className?: string;
  showSubtitle?: boolean;
}

/**
 * Compact Navbar Clio Brand:
 * C emblem + "Clio" wordmark + optional "ACADEMIC ARCHIVE" descriptor
 */
export function ClioNavbarBrand({ className, showSubtitle = true }: ClioLogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <ClioEmblem size={28} className="text-oxblood" />
      <div className="flex items-baseline gap-2.5">
        <span className="font-display text-2xl tracking-tight font-medium text-ink leading-none">
          Clio
        </span>
        {showSubtitle && (
          <>
            <span className="hidden sm:inline-block h-3.5 w-px bg-ink/20" aria-hidden="true" />
            <span className="hidden sm:inline meta-mono text-[10px] sm:text-[11px] text-ash tracking-[0.14em] uppercase">
              Academic Archive
            </span>
          </>
        )}
      </div>
    </div>
  );
}

export default ClioEmblem;
