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
  onClick?: () => void;
}

export default function AlbumCover({
  config,
  title,
  isCollab = false,
  isPlaying = false,
  size = "md",
  className = "",
  onClick,
}: AlbumCoverProps) {
  const sizeClasses = {
    xs: "w-10 h-10 rounded-lg shrink-0",
    sm: "w-12 h-12 rounded-xl shrink-0",
    md: "w-20 h-20 sm:w-24 sm:h-24 rounded-2xl shrink-0",
    lg: "w-52 h-52 sm:w-64 sm:h-64 rounded-3xl shrink-0",
    xl: "w-64 h-64 sm:w-80 sm:h-80 rounded-3xl shrink-0",
  }[size];

  const isLarge = size === "lg" || size === "xl";

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden select-none shadow-lg border border-white/15 ${
        onClick ? "cursor-pointer" : ""
      } ${sizeClasses} ${className}`}
      style={{
        backgroundImage: `linear-gradient(135deg, ${config.gradientFrom} 0%, ${config.gradientVia} 52%, ${config.gradientTo} 100%)`,
      }}
    >
      {/* Decorative SVG Generative Pattern Overlay */}
      <svg
        viewBox="0 0 200 200"
        className={`absolute inset-0 w-full h-full opacity-40 mix-blend-screen pointer-events-none ${
          isPlaying ? "animate-spin-slow" : ""
        }`}
      >
        <circle cx="100" cy="100" r="68" stroke="white" strokeWidth="1.2" fill="none" opacity="0.5" />
        <circle cx="100" cy="100" r="42" stroke="white" strokeWidth="1" strokeDasharray="5 4" fill="none" opacity="0.6" />
        {config.patternType === "cyber_chrome" && (
          <path
            d="M100 18 L107 90 L182 100 L107 110 L100 182 L93 110 L18 100 L93 90 Z"
            fill="white"
            fillOpacity="0.2"
          />
        )}
        {config.patternType === "y2k_dream" && (
          <path
            d="M45 65 Q100 20 155 65 T155 135 Q100 180 45 135 Z"
            fill="white"
            fillOpacity="0.14"
          />
        )}
      </svg>

      {/* Subtle gloss gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-white/10 pointer-events-none" />

      {/* Collab badge only on md/lg/xl */}
      {isCollab && (size === "md" || isLarge) && (
        <div className="absolute top-2 right-2 z-10">
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-black/60 text-pink-300 backdrop-blur-md border border-pink-400/30">
            <Sparkles className="w-2.5 h-2.5 text-pink-400" />
            {isLarge && <span>COLLAB</span>}
          </span>
        </div>
      )}

      {/* Center Disc / Vinyl Core */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {isLarge ? (
          <div
            className={`w-16 h-16 rounded-full bg-black/50 backdrop-blur-md border border-white/25 flex items-center justify-center shadow-inner ${
              isPlaying ? "animate-spin-slow" : ""
            }`}
          >
            <div className="w-4 h-4 rounded-full bg-white/90 shadow" />
          </div>
        ) : (
          <Disc3
            className={`${
              size === "md" ? "w-7 h-7" : "w-4 h-4"
            } text-white/85 drop-shadow ${isPlaying ? "animate-spin" : ""}`}
          />
        )}
      </div>

      {/* Title caption only on large fullscreen cover */}
      {isLarge && (
        <div className="absolute bottom-3.5 left-4 right-4 z-10 text-center">
          <p className="text-[10px] font-bold tracking-widest uppercase text-white/75 truncate">
            {config.conceptKeyword}
          </p>
          <p className="text-xs font-extrabold text-white truncate mt-0.5 drop-shadow">
            {title}
          </p>
        </div>
      )}
    </div>
  );
}
