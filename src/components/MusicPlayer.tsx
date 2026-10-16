"use client";

import React, { useEffect, useRef, useState } from "react";
import { Track } from "@/types/komposer";
import { audioEngine } from "@/lib/audioEngine";
import AlbumCover from "./AlbumCover";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Heart,
  ListMusic,
  Maximize2,
  Mic2,
  Pause,
  Play,
  Repeat,
  Share2,
  SkipBack,
  SkipForward,
  Sparkles,
  Volume2,
  VolumeX,
  Youtube,
} from "lucide-react";

interface MusicPlayerProps {
  currentTrack: Track | null;
  queue: Track[];
  isFullscreen: boolean;
  onToggleFullscreen: (val?: boolean) => void;
  onSelectTrack: (track: Track) => void;
  onNextTrack: () => void;
  onPrevTrack: () => void;
  onToggleLike: (trackId: string) => void;
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export default function MusicPlayer({
  currentTrack,
  queue,
  isFullscreen,
  onToggleFullscreen,
  onSelectTrack,
  onNextTrack,
  onPrevTrack,
  onToggleLike,
}: MusicPlayerProps) {
  const [engineState, setEngineState] = useState(() => audioEngine.getState());
  const [freqBars, setFreqBars] = useState<number[]>(() => Array(24).fill(8));
  const [activeTab, setActiveTab] = useState<"lyrics" | "analysis" | "queue">("lyrics");
  const [copiedToast, setCopiedToast] = useState(false);

  const activeLyricRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const unsub = audioEngine.subscribe(() => {
      setEngineState({ ...audioEngine.getState() });
    });
    return unsub;
  }, []);

  // Animation loop for real-time audio spectrum bars
  useEffect(() => {
    let rafId: number;
    const updateSpectrum = () => {
      if (audioEngine.getState().isPlaying) {
        const data = audioEngine.getFrequencyData();
        const bars: number[] = [];
        for (let i = 0; i < 24; i++) {
          const val = data[i] || 0;
          bars.push(Math.max(8, Math.min(100, Math.round((val / 255) * 100))));
        }
        setFreqBars(bars);
      } else {
        setFreqBars((prev) => prev.map((v) => Math.max(8, Math.floor(v * 0.85))));
      }
      rafId = requestAnimationFrame(updateSpectrum);
    };
    rafId = requestAnimationFrame(updateSpectrum);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const track = currentTrack || engineState.currentTrack;

  // Determine current active lyric index
  const activeLyricIndex = React.useMemo(() => {
    if (!track || !track.lyrics.length) return 0;
    let idx = 0;
    for (let i = 0; i < track.lyrics.length; i++) {
      if (engineState.currentTime >= track.lyrics[i].time) {
        idx = i;
      } else {
        break;
      }
    }
    return idx;
  }, [track, engineState.currentTime]);

  useEffect(() => {
    if (isFullscreen && activeTab === "lyrics" && activeLyricRef.current) {
      activeLyricRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeLyricIndex, isFullscreen, activeTab]);

  if (!track) return null;

  const currentLyric = track.lyrics[activeLyricIndex] || track.lyrics[0];
  const progressPercent =
    track.duration > 0
      ? Math.min(100, (engineState.currentTime / track.duration) * 100)
      : 0;

  const handleShare = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(
        `[Komposer] ${track.title} - ${track.artistNames.join(" × ")} 스타일 AI 생성곡 들어보세요!`
      );
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2200);
    }
  };

  return (
    <>
      {/* 1. FULLSCREEN EXPANDABLE MUSIC APP VIEW */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-zinc-950/95 backdrop-blur-3xl text-white flex flex-col overflow-hidden animate-in fade-in duration-200">
          {/* Dynamic Ambient Album Color Glow */}
          <div
            className="absolute -top-32 -left-32 w-[34rem] h-[34rem] rounded-full blur-[130px] opacity-35 pointer-events-none"
            style={{ background: track.coverConfig.gradientFrom }}
          />
          <div
            className="absolute -bottom-32 -right-32 w-[34rem] h-[34rem] rounded-full blur-[130px] opacity-35 pointer-events-none"
            style={{ background: track.coverConfig.gradientTo }}
          />

          {/* Top Header Bar */}
          <div className="relative z-10 flex items-center justify-between px-4 sm:px-8 py-4 border-b border-white/10">
            <button
              onClick={() => onToggleFullscreen(false)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/15 text-sm font-medium transition"
            >
              <ChevronDown className="w-4 h-4" />
              <span>미니 플레이어로 축소</span>
            </button>

            <div className="text-center hidden sm:block">
              <p className="text-[11px] uppercase tracking-[0.2em] text-pink-400 font-bold">
                KOMPOSER AI STREAMING PLAYER
              </p>
              <p className="text-xs text-zinc-400">
                {track.isCollab ? "드림 콜라보 AI 생성 트랙" : "아티스트 시그니처 AI 트랙"} ·{" "}
                {track.bpm} BPM · {track.musicalKey}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/10 hover:bg-white/15 text-xs font-medium transition"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{copiedToast ? "공유 문구 복사됨!" : "트랙 공유"}</span>
              </button>
            </div>
          </div>

          {/* Main Fullscreen Body */}
          <div className="relative z-10 flex-1 overflow-y-auto px-4 sm:px-8 py-6 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column: Album Art + Spectrum + Transport Controls */}
            <div className="lg:col-span-5 flex flex-col items-center text-center">
              <AlbumCover
                config={track.coverConfig}
                title={track.title}
                isCollab={track.isCollab}
                isPlaying={engineState.isPlaying}
                size="lg"
                className="mb-6 shadow-2xl shadow-pink-500/20"
              />

              <div className="flex flex-wrap items-center justify-center gap-1.5 mb-2">
                {track.isCollab && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gradient-to-r from-pink-500 to-violet-500 text-white">
                    <Sparkles className="w-3 h-3" />
                    COLLAB {track.collabRatio}:{100 - track.collabRatio}
                  </span>
                )}
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-zinc-200">
                  {track.genre}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-zinc-300">
                  {track.bpm} BPM · {track.musicalKey}
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-1">
                {track.title}
              </h2>
              <p className="text-sm sm:text-base text-pink-300 font-medium mb-1">
                {track.artistNames.join(" × ")} Style
              </p>
              <p className="text-xs text-zinc-400 mb-5">
                작곡가(Producer): <span className="text-zinc-200 font-semibold">{track.creatorName}</span> ({track.creatorHandle})
              </p>

              {/* Real-time 24-Bar Audio Spectrum Visualizer */}
              <div className="w-full max-w-md h-12 flex items-end justify-center gap-1 px-4 mb-4">
                {freqBars.map((height, idx) => (
                  <div
                    key={idx}
                    className="flex-1 rounded-full transition-all duration-75"
                    style={{
                      height: `${height}%`,
                      background:
                        idx % 2 === 0
                          ? track.coverConfig.gradientFrom
                          : track.coverConfig.accentColor,
                      opacity: engineState.isPlaying ? 0.9 : 0.3,
                    }}
                  />
                ))}
              </div>

              {/* Progress Scrubber */}
              <div className="w-full max-w-md mb-4">
                <input
                  type="range"
                  min={0}
                  max={track.duration}
                  step={0.2}
                  value={engineState.currentTime}
                  onChange={(e) => audioEngine.seek(Number(e.target.value))}
                  className="w-full h-2 bg-white/15 rounded-lg appearance-none cursor-pointer accent-pink-500"
                />
                <div className="flex justify-between text-xs text-zinc-400 mt-1.5 font-mono">
                  <span>{formatTime(engineState.currentTime)}</span>
                  <span className="text-pink-400 font-semibold">
                    {currentLyric?.section || "PLAYING"}
                  </span>
                  <span>{formatTime(track.duration)}</span>
                </div>
              </div>

              {/* Fullscreen Transport Buttons */}
              <div className="flex items-center justify-center gap-5">
                <button
                  onClick={() => audioEngine.toggleRepeat()}
                  className={`p-2.5 rounded-full transition ${
                    engineState.isRepeat
                      ? "bg-pink-500/20 text-pink-400 border border-pink-500/40"
                      : "text-zinc-400 hover:text-white hover:bg-white/10"
                  }`}
                  title="한 곡 반복"
                >
                  <Repeat className="w-5 h-5" />
                </button>

                <button
                  onClick={onPrevTrack}
                  className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
                  title="이전 곡"
                >
                  <SkipBack className="w-5 h-5" />
                </button>

                <button
                  onClick={() => audioEngine.togglePlay()}
                  className="w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-600 hover:scale-105 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-pink-500/30 transition"
                >
                  {engineState.isPlaying ? (
                    <Pause className="w-7 h-7 fill-current" />
                  ) : (
                    <Play className="w-7 h-7 fill-current ml-0.5" />
                  )}
                </button>

                <button
                  onClick={onNextTrack}
                  className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
                  title="다음 곡"
                >
                  <SkipForward className="w-5 h-5" />
                </button>

                <button
                  onClick={() => onToggleLike(track.id)}
                  className={`p-2.5 rounded-full transition ${
                    track.isLiked
                      ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                      : "text-zinc-400 hover:text-white hover:bg-white/10"
                  }`}
                  title="좋아요"
                >
                  <Heart className={`w-5 h-5 ${track.isLiked ? "fill-current" : ""}`} />
                </button>
              </div>
            </div>

            {/* Right Column: Tabs for Synced Lyrics / AI Style & YouTube Reference / Queue */}
            <div className="lg:col-span-7 flex flex-col h-[500px] sm:h-[560px] bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl">
              {/* Tab Selector */}
              <div className="flex items-center border-b border-white/10 p-2 gap-2 bg-black/20">
                <button
                  onClick={() => setActiveTab("lyrics")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition ${
                    activeTab === "lyrics"
                      ? "bg-gradient-to-r from-pink-500/90 to-violet-600/90 text-white shadow"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Mic2 className="w-4 h-4" />
                  <span>실시간 싱크 가사 & 파트</span>
                </button>
                <button
                  onClick={() => setActiveTab("analysis")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition ${
                    activeTab === "analysis"
                      ? "bg-gradient-to-r from-pink-500/90 to-violet-600/90 text-white shadow"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>AI 스타일 분석 & 원곡 MV</span>
                </button>
                <button
                  onClick={() => setActiveTab("queue")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition ${
                    activeTab === "queue"
                      ? "bg-gradient-to-r from-pink-500/90 to-violet-600/90 text-white shadow"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <ListMusic className="w-4 h-4" />
                  <span>재생목록 ({queue.length})</span>
                </button>
              </div>

              {/* Tab Content 1: Time-Synced Lyrics */}
              {activeTab === "lyrics" && (
                <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-3">
                  <div className="flex items-center justify-between text-xs text-zinc-400 pb-2 border-b border-white/10">
                    <span>가사를 클릭하면 해당 파트로 즉시 이동합니다</span>
                    <span className="text-pink-400 font-semibold">
                      {track.isCollab ? "콜라보 보컬 파트 분배 적용됨" : "솔로 시그니처 보컬"}
                    </span>
                  </div>

                  {track.lyrics.map((line, index) => {
                    const isActive = index === activeLyricIndex;
                    const isCollabPart = line.vocal.toLowerCase().includes("collab") || line.vocal.toLowerCase().includes("harmony");

                    return (
                      <button
                        key={index}
                        ref={isActive ? activeLyricRef : null}
                        onClick={() => {
                          audioEngine.seek(line.time);
                          if (!engineState.isPlaying) audioEngine.play();
                        }}
                        className={`w-full text-left p-4 rounded-2xl transition-all duration-200 border ${
                          isActive
                            ? "bg-gradient-to-r from-pink-500/20 via-violet-500/20 to-transparent border-pink-500/50 scale-[1.01] shadow-lg"
                            : "bg-white/[0.02] border-transparent hover:bg-white/[0.06] opacity-65 hover:opacity-95"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-white/10 text-zinc-300 tracking-wider">
                              {line.section}
                            </span>
                            <span
                              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                                isCollabPart
                                  ? "bg-gradient-to-r from-pink-500 to-violet-500 text-white"
                                  : index % 2 === 0
                                    ? "bg-sky-500/25 text-sky-300 border border-sky-400/30"
                                    : "bg-fuchsia-500/25 text-fuchsia-300 border border-fuchsia-400/30"
                              }`}
                            >
                              🎤 {line.vocal}
                            </span>
                          </div>
                          <span className="text-xs font-mono text-zinc-400">
                            {formatTime(line.time)}
                          </span>
                        </div>

                        <p
                          className={`text-base sm:text-xl font-bold leading-snug ${
                            isActive ? "text-white" : "text-zinc-300"
                          }`}
                        >
                          {line.line}
                        </p>
                        {line.subline && (
                          <p
                            className={`text-xs sm:text-sm mt-1 ${
                              isActive ? "text-pink-300" : "text-zinc-500"
                            }`}
                          >
                            {line.subline}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Tab Content 2: AI Style Analysis & YouTube Reference */}
              {activeTab === "analysis" && (
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-pink-500/15 via-violet-500/10 to-transparent border border-pink-500/30">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-pink-400 mb-2 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      AI 작곡 프로듀싱 노트 (Style Analysis)
                    </h4>
                    <p className="text-sm sm:text-base text-zinc-100 leading-relaxed">
                      {track.styleAnalysis}
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-violet-400 mb-2">
                      콜라보 킬링 파트 & 보컬 디렉팅
                    </h4>
                    <p className="text-sm text-zinc-200 leading-relaxed">
                      {track.collabPoint}
                    </p>
                    {track.isCollab && (
                      <div className="mt-4">
                        <div className="flex justify-between text-xs font-bold text-zinc-300 mb-1.5">
                          <span>{track.artistNames[0]} ({track.collabRatio}%)</span>
                          <span>{track.artistNames[1]} ({100 - track.collabRatio}%)</span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden flex">
                          <div
                            className="bg-pink-500 h-full"
                            style={{ width: `${track.collabRatio}%` }}
                          />
                          <div
                            className="bg-violet-500 h-full"
                            style={{ width: `${100 - track.collabRatio}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* YouTube Reference Links */}
                  <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-red-400 mb-3 flex items-center gap-1.5">
                      <Youtube className="w-4 h-4" />
                      스타일 학습에 사용된 유튜브 MV / 음원 레퍼런스
                    </h4>
                    {track.youtubeRefs && track.youtubeRefs.length > 0 ? (
                      <div className="space-y-2.5">
                        {track.youtubeRefs.map((yt, idx) => (
                          <a
                            key={idx}
                            href={yt.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between p-3 rounded-xl bg-black/40 hover:bg-black/60 border border-white/10 transition group"
                          >
                            <div className="min-w-0 pr-3">
                              <p className="text-sm font-semibold text-white truncate group-hover:text-pink-400 transition">
                                {yt.title}
                              </p>
                              <p className="text-xs text-zinc-400 truncate">
                                {yt.author || yt.url}
                              </p>
                            </div>
                            <ExternalLink className="w-4 h-4 text-zinc-400 group-hover:text-white shrink-0" />
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-400">
                        아티스트 대표곡 음원 데이터를 기반으로 생성되었습니다.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Tab Content 3: Play Queue */}
              {activeTab === "queue" && (
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {queue.map((item, idx) => {
                    const isCurrent = item.id === track.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => onSelectTrack(item)}
                        className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition ${
                          isCurrent
                            ? "bg-pink-500/20 border border-pink-500/40"
                            : "hover:bg-white/5 border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xs font-mono text-zinc-500 w-5 text-center">
                            {idx + 1}
                          </span>
                          <AlbumCover
                            config={item.coverConfig}
                            title={item.title}
                            size="xs"
                            isPlaying={isCurrent && engineState.isPlaying}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate">
                              {item.title}
                            </p>
                            <p className="text-xs text-zinc-400 truncate">
                              {item.artistNames.join(" × ")}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-zinc-400 font-mono ml-2">
                          {formatTime(item.duration)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. PERSISTENT DOCKED MINI PLAYER (항상 화면 하단에 상시 표시) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/90 backdrop-blur-2xl border-t border-white/15 shadow-2xl">
        {/* Top Interactive Seek Bar */}
        <div className="relative w-full h-1.5 bg-white/10 group cursor-pointer">
          <div
            className="h-full bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 transition-all duration-100"
            style={{ width: `${progressPercent}%` }}
          />
          <input
            type="range"
            min={0}
            max={track.duration}
            step={0.2}
            value={engineState.currentTime}
            onChange={(e) => audioEngine.seek(Number(e.target.value))}
            aria-label="Seek time"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          {/* Left: Track Info & Click to Expand */}
          <div
            onClick={() => onToggleFullscreen(true)}
            className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group"
          >
            <AlbumCover
              config={track.coverConfig}
              title={track.title}
              isCollab={track.isCollab}
              isPlaying={engineState.isPlaying}
              size="sm"
              className="shrink-0 group-hover:scale-105 transition"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-extrabold text-white truncate group-hover:text-pink-400 transition">
                  {track.title}
                </p>
                {track.isCollab && (
                  <span className="hidden sm:inline-flex px-1.5 py-0.5 text-[9px] font-extrabold rounded bg-pink-500/20 text-pink-300 border border-pink-500/30 shrink-0">
                    COLLAB
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 truncate">
                {track.artistNames.join(" × ")}
              </p>
              {/* Live Mini Synced Lyric Line Ticker */}
              {currentLyric && (
                <p className="text-[11px] text-pink-300/90 truncate mt-0.5 font-medium">
                  ♪ [{currentLyric.vocal}] {currentLyric.line}
                </p>
              )}
            </div>
          </div>

          {/* Center: Transport Controls */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={onPrevTrack}
              className="p-2 rounded-full text-zinc-300 hover:text-white hover:bg-white/10 transition"
              title="이전 곡"
            >
              <SkipBack className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <button
              onClick={() => audioEngine.togglePlay()}
              className="w-11 h-11 rounded-full bg-gradient-to-r from-pink-500 to-violet-600 hover:brightness-110 text-white flex items-center justify-center shadow-md shadow-pink-500/25 transition"
              title={engineState.isPlaying ? "일시정지" : "재생"}
            >
              {engineState.isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={onNextTrack}
              className="p-2 rounded-full text-zinc-300 hover:text-white hover:bg-white/10 transition"
              title="다음 곡"
            >
              <SkipForward className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <span className="hidden md:inline-block text-xs font-mono text-zinc-400 pl-1">
              {formatTime(engineState.currentTime)} / {formatTime(track.duration)}
            </span>
          </div>

          {/* Right: Like, Volume, Fullscreen Toggle */}
          <div className="flex items-center justify-end gap-2 sm:gap-3 flex-1">
            {/* Mini Visualizer Indicator */}
            <div className="hidden lg:flex items-end gap-0.5 h-6 px-2">
              {freqBars.slice(0, 8).map((h, i) => (
                <div
                  key={i}
                  className="w-1 rounded-full bg-pink-400 transition-all duration-75"
                  style={{
                    height: `${Math.max(15, h * 0.7)}%`,
                    opacity: engineState.isPlaying ? 0.9 : 0.3,
                  }}
                />
              ))}
            </div>

            <button
              onClick={() => onToggleLike(track.id)}
              className={`p-2 rounded-full transition ${
                track.isLiked
                  ? "text-rose-400 bg-rose-500/15"
                  : "text-zinc-400 hover:text-white hover:bg-white/10"
              }`}
              title="좋아요"
            >
              <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${track.isLiked ? "fill-current" : ""}`} />
            </button>

            {/* Volume Control */}
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                onClick={() => audioEngine.toggleMute()}
                className="p-1.5 text-zinc-400 hover:text-white transition"
              >
                {engineState.isMuted || engineState.volume === 0 ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={engineState.isMuted ? 0 : engineState.volume}
                onChange={(e) => audioEngine.setVolume(Number(e.target.value))}
                className="w-16 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-pink-500"
              />
            </div>

            <button
              onClick={() => onToggleFullscreen(!isFullscreen)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white border border-white/10 transition"
            >
              {isFullscreen ? (
                <>
                  <ChevronDown className="w-4 h-4" />
                  <span className="hidden sm:inline">접기</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-pink-400" />
                  <span className="hidden sm:inline">전체화면 / 가사</span>
                  <ChevronUp className="w-3.5 h-3.5 sm:hidden" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

