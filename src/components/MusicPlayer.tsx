"use client";

import React, { useEffect, useRef, useState } from "react";
import { Track } from "@/types/komposer";
import { audioEngine } from "@/lib/audioEngine";
import { Language } from "@/lib/i18n";
import AlbumCover from "./AlbumCover";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Heart,
  ListMusic,
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
  lang?: Language;
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
  lang = "ko",
}: MusicPlayerProps) {
  const isKo = lang === "ko";
  const [engineState, setEngineState] = useState(() => audioEngine.getState());
  const [activeTab, setActiveTab] = useState<"lyrics" | "analysis" | "queue">("lyrics");
  const [copiedToast, setCopiedToast] = useState(false);

  const activeLyricRef = useRef<HTMLButtonElement | null>(null);
  const lyricsContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const unsub = audioEngine.subscribe(() => {
      setEngineState({ ...audioEngine.getState() });
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (isFullscreen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isFullscreen]);

  const track = currentTrack || engineState.currentTrack;

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
    if (
      isFullscreen &&
      activeTab === "lyrics" &&
      lyricsContainerRef.current &&
      activeLyricRef.current
    ) {
      const container = lyricsContainerRef.current;
      const activeEl = activeLyricRef.current;
      const containerRect = container.getBoundingClientRect();
      const activeRect = activeEl.getBoundingClientRect();
      const offsetWithinContainer =
        activeRect.top - containerRect.top + container.scrollTop;
      const targetScrollTop =
        offsetWithinContainer -
        container.clientHeight / 2 +
        activeRect.height / 2;
      const maxScrollTop = Math.max(
        0,
        container.scrollHeight - container.clientHeight
      );
      container.scrollTo({
        top: Math.max(0, Math.min(maxScrollTop, targetScrollTop)),
        behavior: "smooth",
      });
    }
  }, [activeLyricIndex, isFullscreen, activeTab]);

  if (!track) return null;

  const isPlaying =
    engineState.isPlaying && engineState.currentTrack?.id === track.id;
  const duration = engineState.duration || track.duration || 36;
  const currentTime =
    engineState.currentTrack?.id === track.id ? engineState.currentTime : 0;
  const progressPercent =
    duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  const handlePlayPause = () => {
    if (engineState.currentTrack?.id !== track.id) {
      audioEngine.loadTrack(track, true);
    } else {
      audioEngine.togglePlay();
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (engineState.currentTrack?.id !== track.id) {
      audioEngine.loadTrack(track, true);
    }
    audioEngine.seek(newTime);
  };

  const handleShare = () => {
    if (typeof window !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2000);
    }
  };

  const artistLabel = (track.artistNames || track.artists).join(" × ");

  return (
    <>
      {/* FULLSCREEN OVERLAY */}
      {isFullscreen && (
        <div className="fixed inset-0 h-[100dvh] max-h-[100dvh] z-50 bg-zinc-950/95 backdrop-blur-2xl text-white flex flex-col overflow-hidden animate-in fade-in duration-200">
          {/* Dynamic Ambient Glow */}
          <div
            className="pointer-events-none absolute -top-36 -left-36 w-[28rem] h-[28rem] rounded-full blur-3xl opacity-25"
            style={{ background: track.coverConfig.gradientFrom }}
          />
          <div
            className="pointer-events-none absolute -bottom-36 -right-36 w-[28rem] h-[28rem] rounded-full blur-3xl opacity-25"
            style={{ background: track.coverConfig.gradientTo }}
          />

          {/* Top Bar */}
          <div className="shrink-0 relative z-20 flex items-center justify-between px-4 sm:px-8 py-4 border-b border-white/10 bg-zinc-950/80 backdrop-blur-md">
            <button
              onClick={() => onToggleFullscreen(false)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs sm:text-sm font-medium transition shrink-0"
            >
              <ChevronDown className="w-4 h-4" />
              <span>{isKo ? "접기" : "Minimize"}</span>
            </button>

            <div className="flex items-center gap-2 min-w-0 px-3">
              <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse shrink-0" />
              <span className="text-xs font-semibold text-zinc-300 truncate">
                {track.title} — {artistLabel}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium transition"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {copiedToast
                    ? isKo
                      ? "복사됨!"
                      : "Copied!"
                    : isKo
                      ? "공유"
                      : "Share"}
                </span>
              </button>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="relative z-10 flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 sm:p-8 overflow-y-auto lg:overflow-hidden">
            {/* Left Column: Cover + Controls */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center gap-5 min-h-0">
              <AlbumCover
                config={track.coverConfig}
                title={track.title}
                isCollab={track.isCollab}
                size="lg"
                isPlaying={isPlaying}
              />

              {/* Track Title & Artist */}
              <div className="text-center max-w-md w-full px-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-zinc-300 text-[11px] font-medium mb-2">
                  <span>{track.genre}</span>
                  <span>·</span>
                  <span>{track.bpm} BPM</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white truncate">
                  {track.title}
                </h2>
                <p className="text-sm text-zinc-400 mt-1 truncate">
                  {artistLabel}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full max-w-md space-y-1.5 px-2">
                <input
                  type="range"
                  min={0}
                  max={duration}
                  step={0.1}
                  value={currentTime}
                  onChange={handleSeekChange}
                  className="w-full accent-pink-500 h-1.5 bg-white/15 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-xs text-zinc-400 font-mono">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Transport Controls */}
              <div className="flex items-center justify-center gap-4 sm:gap-6">
                <button
                  onClick={() => onToggleLike(track.id)}
                  className={`p-2.5 rounded-full border transition ${
                    track.isLiked
                      ? "bg-pink-500/20 border-pink-500/50 text-pink-400"
                      : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"
                  }`}
                  title={isKo ? "좋아요" : "Like"}
                >
                  <Heart
                    className={`w-5 h-5 ${track.isLiked ? "fill-pink-500" : ""}`}
                  />
                </button>

                <button
                  onClick={onPrevTrack}
                  className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white transition"
                  title={isKo ? "이전 곡" : "Previous"}
                >
                  <SkipBack className="w-5 h-5" />
                </button>

                <button
                  onClick={handlePlayPause}
                  className="w-14 h-14 rounded-full bg-gradient-to-tr from-pink-500 to-violet-500 text-white flex items-center justify-center shadow-lg shadow-pink-500/25 hover:scale-105 transition"
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6 fill-white" />
                  ) : (
                    <Play className="w-6 h-6 fill-white ml-0.5" />
                  )}
                </button>

                <button
                  onClick={onNextTrack}
                  className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white transition"
                  title={isKo ? "다음 곡" : "Next"}
                >
                  <SkipForward className="w-5 h-5" />
                </button>

                <button
                  onClick={() => audioEngine.toggleRepeat()}
                  className={`p-2.5 rounded-full border transition ${
                    engineState.isRepeat
                      ? "bg-violet-500/20 border-violet-500/50 text-violet-300"
                      : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"
                  }`}
                  title={isKo ? "반복 재생" : "Loop"}
                >
                  <Repeat className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Right Column: Clean 3-Tab Panel */}
            <div className="lg:col-span-7 flex flex-col bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden min-h-[300px] max-h-[55vh] lg:max-h-full lg:min-h-0 lg:h-full">
              {/* Tab Bar */}
              <div className="shrink-0 flex border-b border-white/10 bg-black/20 p-1.5 gap-1.5">
                <button
                  onClick={() => setActiveTab("lyrics")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
                    activeTab === "lyrics"
                      ? "bg-white/10 text-white"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Mic2 className="w-4 h-4 text-pink-400" />
                  <span>{isKo ? "가사" : "Lyrics"}</span>
                </button>
                <button
                  onClick={() => setActiveTab("analysis")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
                    activeTab === "analysis"
                      ? "bg-white/10 text-white"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  <span>{isKo ? "곡 정보" : "Track Info"}</span>
                </button>
                <button
                  onClick={() => setActiveTab("queue")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
                    activeTab === "queue"
                      ? "bg-white/10 text-white"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <ListMusic className="w-4 h-4 text-cyan-400" />
                  <span>
                    {isKo ? `재생목록 (${queue.length})` : `Queue (${queue.length})`}
                  </span>
                </button>
              </div>

              {/* Tab Content */}
              <div
                ref={lyricsContainerRef}
                className="relative flex-1 min-h-0 overflow-y-auto p-4 sm:p-6"
              >
                {activeTab === "lyrics" && (
                  <div className="space-y-2.5 pb-6">
                    {track.lyrics.map((line, i) => {
                      const isActive = i === activeLyricIndex;
                      return (
                        <button
                          key={i}
                          ref={isActive ? activeLyricRef : null}
                          onClick={() => {
                            if (engineState.currentTrack?.id !== track.id) {
                              audioEngine.loadTrack(track, true);
                            }
                            audioEngine.seek(line.time);
                          }}
                          className={`w-full text-left p-3.5 rounded-xl transition-all border ${
                            isActive
                              ? "bg-white/10 border-pink-500/40 text-white shadow-sm"
                              : "bg-transparent border-transparent text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                          }`}
                        >
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span
                              className={`font-semibold ${
                                isActive ? "text-pink-300" : "text-zinc-500"
                              }`}
                            >
                              [{line.section}] {line.vocal}
                            </span>
                            <span className="font-mono text-zinc-500">
                              {formatTime(line.time)}
                            </span>
                          </div>
                          <p
                            className={`font-bold leading-snug ${
                              isActive ? "text-base sm:text-lg text-white" : "text-sm"
                            }`}
                          >
                            {line.line}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}

                {activeTab === "analysis" && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-pink-400 mb-1.5">
                        {isKo ? "AI 작곡 스타일 요약" : "AI Style Summary"}
                      </h4>
                      <p className="text-sm text-zinc-200 leading-relaxed">
                        {track.styleAnalysis}
                      </p>
                    </div>

                    {track.collabPoint && (
                      <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-violet-400 mb-1.5">
                          {isKo ? "콜라보 / 편곡 포인트" : "Collab & Arrangement Point"}
                        </h4>
                        <p className="text-sm text-zinc-200 leading-relaxed">
                          {track.collabPoint}
                        </p>
                      </div>
                    )}

                    {track.youtubeRefs && track.youtubeRefs.length > 0 && (
                      <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-red-400 mb-2.5 flex items-center gap-1.5">
                          <Youtube className="w-4 h-4" />
                          <span>
                            {isKo ? "참고 유튜브 뮤직비디오" : "Reference YouTube MVs"}
                          </span>
                        </h4>
                        <div className="space-y-2">
                          {track.youtubeRefs.map((ref, idx) => (
                            <a
                              key={idx}
                              href={ref.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-between p-2.5 rounded-lg bg-black/30 hover:bg-white/10 border border-white/5 transition text-xs"
                            >
                              <span className="font-medium text-zinc-200 truncate pr-2">
                                {ref.title}
                              </span>
                              <ExternalLink className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "queue" && (
                  <div className="space-y-1.5">
                    {queue.map((item, idx) => {
                      const isCurrent = item.id === track.id;
                      return (
                        <div
                          key={item.id}
                          onClick={() => onSelectTrack(item)}
                          className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition ${
                            isCurrent
                              ? "bg-pink-500/15 border border-pink-500/30"
                              : "hover:bg-white/5 border border-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-xs font-mono text-zinc-500 w-4 text-center shrink-0">
                              {idx + 1}
                            </span>
                            <AlbumCover
                              config={item.coverConfig}
                              title={item.title}
                              isCollab={item.isCollab}
                              size="sm"
                            />
                            <div className="min-w-0">
                              <p
                                className={`text-sm font-bold truncate ${
                                  isCurrent ? "text-pink-300" : "text-white"
                                }`}
                              >
                                {item.title}
                              </p>
                              <p className="text-xs text-zinc-400 truncate">
                                {(item.artistNames || item.artists).join(" × ")}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs text-zinc-500 font-mono shrink-0 ml-2">
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
        </div>
      )}

      {/* PERSISTENT BOTTOM MINI-PLAYER BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-xl border-t border-white/10 text-white shadow-2xl">
        {/* Top slim progress bar */}
        <div className="relative w-full h-1 bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-pink-500 via-violet-500 to-cyan-400 transition-all duration-150"
            style={{ width: `${progressPercent}%` }}
          />
          <input
            type="range"
            min={0}
            max={duration}
            step={0.1}
            value={currentTime}
            onChange={handleSeekChange}
            aria-label="Seek timeline"
            className="absolute inset-0 w-full h-3 -top-1 opacity-0 cursor-pointer"
          />
        </div>

        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-3">
          {/* Left: Track Info */}
          <div
            onClick={() => onToggleFullscreen(true)}
            className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group"
          >
            <AlbumCover
              config={track.coverConfig}
              title={track.title}
              isCollab={track.isCollab}
              size="sm"
              isPlaying={isPlaying}
            />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm text-white truncate group-hover:text-pink-300 transition">
                {track.title}
              </p>
              <p className="text-xs text-zinc-400 truncate">{artistLabel}</p>
            </div>
          </div>

          {/* Center: Transport Controls */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <button
              onClick={onPrevTrack}
              className="p-2 rounded-full text-zinc-300 hover:text-white hover:bg-white/10 transition"
              title={isKo ? "이전 곡" : "Previous"}
            >
              <SkipBack className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <button
              onClick={handlePlayPause}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white text-zinc-950 flex items-center justify-center shadow-md hover:scale-105 transition"
              title={isPlaying ? (isKo ? "일시정지" : "Pause") : isKo ? "재생" : "Play"}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-zinc-950" />
              ) : (
                <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-zinc-950 ml-0.5" />
              )}
            </button>

            <button
              onClick={onNextTrack}
              className="p-2 rounded-full text-zinc-300 hover:text-white hover:bg-white/10 transition"
              title={isKo ? "다음 곡" : "Next"}
            >
              <SkipForward className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <span className="hidden md:inline-block text-xs font-mono text-zinc-400 min-w-[72px] text-center">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Right: Like, Volume & Expand */}
          <div className="flex items-center justify-end gap-2 sm:gap-3 flex-1 shrink-0">
            <button
              onClick={() => onToggleLike(track.id)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium border transition ${
                track.isLiked
                  ? "bg-pink-500/20 border-pink-500/40 text-pink-300"
                  : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"
              }`}
            >
              <Heart
                className={`w-3.5 h-3.5 ${track.isLiked ? "fill-pink-500 text-pink-500" : ""}`}
              />
              <span className="hidden sm:inline">{track.likesCount}</span>
            </button>

            <div className="hidden lg:flex items-center gap-1.5">
              <button
                onClick={() =>
                  audioEngine.setVolume(engineState.volume > 0 ? 0 : 0.85)
                }
                className="text-zinc-400 hover:text-white p-1"
              >
                {engineState.volume === 0 ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={engineState.volume}
                onChange={(e) =>
                  audioEngine.setVolume(parseFloat(e.target.value))
                }
                aria-label="Volume"
                className="w-20 accent-pink-500 h-1 bg-white/15 rounded-lg cursor-pointer"
              />
            </div>

            <button
              onClick={() => onToggleFullscreen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-semibold text-white transition"
            >
              <ChevronUp className="w-3.5 h-3.5 text-pink-400" />
              <span className="hidden sm:inline">
                {isKo ? "가사 · 전체화면" : "Lyrics · Expand"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
