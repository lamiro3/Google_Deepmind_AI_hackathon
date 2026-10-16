"use client";

import React from "react";
import { CoverArtConfig } from "@/types/komposer";
import { Disc3, Sparkles } from "lucide-react";

interface AlbumCoverProps {
  config: CoverArtConfig;
  title: string;
  isCollab?: boolean;
  isPlaying?: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

export default function AlbumCover({
  config,
  title,
  isCollab = false,
  isPlaying = false,
  size = "md",
  className = "",
}: AlbumCoverProps) {
  const sizeClasses = {
    xs: "w-11 h-11 rounded-lg",
    sm: "w-14 h-14 rounded-xl",
    md: "w-full aspect-square rounded-2xl",
    lg: "w-64 h-64 sm:w-80 sm:h-80 rounded-3xl",
    xl: "w-72 h-72 sm:w-96 sm:h-96 rounded-3xl",
  }[size];

  const isCompact = size === "xs" || size === "sm";

  return (
    <div
      className={`relative overflow-hidden select-none shadow-xl border border-white/15 ${sizeClasses} ${className}`}
      style={{
        backgroundImage: `linear-gradient(135deg, ${config.gradientFrom} 0%, ${config.gradientVia} 52%, ${config.gradientTo} 100%)`,
      }}
    >
      {/* Decorative SVG Generative Pattern Overlay */}
      <svg
        viewBox="0 0 200 200"
        className={`absolute inset-0 w-full h-full opacity-45 mix-blend-screen pointer-events-none ${
          isPlaying ? "animate-spin-slow" : ""
        }`}
      >
        <defs>
          <radialGradient id={`glow-${title.slice(0, 6)}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={config.accentColor} stopOpacity="0.85" />
            <stop offset="100%" stopColor={config.gradientTo} stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx="100" cy="100" r="72" fill={`url(#glow-${title.slice(0, 6)})`} />

        {config.patternType === "cyber_chrome" && (
          <g stroke="white" strokeWidth="1.2" fill="none" opacity="0.7">
            <ellipse cx="100" cy="100" rx="82" ry="32" transform="rotate(30 100 100)" />
            <ellipse cx="100" cy="100" rx="82" ry="32" transform="rotate(-30 100 100)" />
            <circle cx="100" cy="100" r="46" strokeDasharray="4 4" />
            <path d="M100 12 L108 88 L188 100 L108 112 L100 188 L92 112 L12 100 L92 88 Z" fill="white" fillOpacity="0.18" />
          </g>
        )}

        {config.patternType === "y2k_dream" && (
          <g stroke="white" strokeWidth="1.5" fill="none" opacity="0.75">
            <circle cx="100" cy="100" r="68" />
            <circle cx="100" cy="100" r="44" strokeDasharray="6 4" />
            <path d="M45 65 Q100 20 155 65 T155 135 Q100 180 45 135 Z" fill="white" fillOpacity="0.12" />
            <circle cx="65" cy="60" r="6" fill="white" />
            <circle cx="145" cy="135" r="4" fill="white" />
          </g>
        )}

        {config.patternType === "neon_vinyl" && (
          <g stroke="white" fill="none" opacity="0.65">
            <circle cx="100" cy="100" r="84" strokeWidth="1" />
            <circle cx="100" cy="100" r="72" strokeWidth="0.7" />
            <circle cx="100" cy="100" r="60" strokeWidth="1" strokeDasharray="12 6" />
            <circle cx="100" cy="100" r="48" strokeWidth="0.7" />
            <circle cx="100" cy="100" r="22" fill="black" fillOpacity="0.45" strokeWidth="2" />
          </g>
        )}

        {(config.patternType === "band_sunset" ||
          config.patternType === "velvet_noir" ||
          config.patternType === "prism_glass") && (
          <g stroke="white" strokeWidth="1.2" fill="none" opacity="0.65">
            <polygon points="100,18 178,152 22,152" fill="white" fillOpacity="0.12" />
            <polygon points="100,182 178,48 22,48" strokeDasharray="5 5" />
            <circle cx="100" cy="100" r="54" />
          </g>
        )}
      </svg>

      {/* Subtle noise / gloss sheen */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-white/10 pointer-events-none" />

      {/* Top Holographic Collab / Artist Badge */}
      {!isCompact && (
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-1 z-10">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-black/55 text-white backdrop-blur-md border border-white/20 truncate">
            {isCollab && <Sparkles className="w-2.5 h-2.5 text-amber-300 shrink-0" />}
            <span className="truncate">{config.badgeText}</span>
          </span>
          {isCollab && (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-gradient-to-r from-pink-500 to-violet-500 text-white shadow">
              COLLAB
            </span>
          )}
        </div>
      )}

      {/* Center Vinyl Core when large */}
      {(size === "lg" || size === "xl") && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className={`w-20 h-20 rounded-full bg-black/45 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-inner ${
              isPlaying ? "animate-spin-slow" : ""
            }`}
          >
            <div className="w-5 h-5 rounded-full bg-white/90 shadow" />
          </div>
        </div>
      )}

      {/* Bottom Concept & Title Typography */}
      {!isCompact ? (
        <div className="absolute bottom-3 left-3.5 right-3.5 z-10">
          <p
            className="text-[10px] font-extrabold tracking-[0.18em] uppercase mb-0.5 drop-shadow"
            style={{ color: config.accentColor }}
          >
            {config.conceptKeyword}
          </p>
          <h4 className="text-white font-extrabold text-sm sm:text-base leading-tight line-clamp-1 drop-shadow-md">
            {title}
          </h4>
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Disc3
            className={`w-5 h-5 text-white/90 drop-shadow ${
              isPlaying ? "animate-spin" : ""
            }`}
          />
        </div>
      )}
    </div>
  );
}

