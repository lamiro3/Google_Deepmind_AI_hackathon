"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  KPOP_ARTISTS,
  KPOP_GENRES,
  Track,
  UserProfile,
} from "@/types/komposer";
import { audioEngine } from "@/lib/audioEngine";
import AlbumCover from "@/components/AlbumCover";
import MusicPlayer from "@/components/MusicPlayer";
import ComposeStudioModal from "@/components/ComposeStudioModal";
import AuthModal from "@/components/AuthModal";
import {
  Check,
  Clock,
  Crown,
  Disc3,
  Flame,
  Headphones,
  Heart,
  LogIn,
  Mic2,
  Music,
  Pause,
  Play,
  PlusCircle,
  Radio,
  SlidersHorizontal,
  Sparkles,
  Trophy,
  User,
  Wand2,
  Youtube,
} from "lucide-react";

interface DashboardState {
  user: UserProfile;
  allTracks: Track[];
  top10Tracks: Track[];
  newestTracks: Track[];
  recommendedTracks: Track[];
  myTracks: Track[];
  likedTracks: Track[];
}

export default function KomposerHomePage() {
  const [dashboard, setDashboard] = useState<DashboardState | null>(null);
  const [loading, setLoading] = useState(true);

  // Navigation: "home" (1. 메인 화면) | "mypage" (2. 마이페이지)
  const [activeNav, setActiveNav] = useState<"home" | "mypage">("home");
  const [myPageTab, setMyPageTab] = useState<"created" | "liked" | "preferences">("created");

  // Modals & Player State
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [studioPresetArtists, setStudioPresetArtists] = useState<string[]>([
    "newjeans",
    "aespa",
  ]);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isFullscreenPlayer, setIsFullscreenPlayer] = useState(false);

  // Audio playback state
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // My Page preference editing state
  const [favArtists, setFavArtists] = useState<string[]>([]);
  const [favGenres, setFavGenres] = useState<string[]>([]);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  const applyDashboardData = useCallback((data: DashboardState) => {
    setDashboard(data);
    setFavArtists(data.user.favoriteArtists || []);
    setFavGenres(data.user.favoriteGenres || []);
    setCurrentTrack((prev) => {
      if (!prev) {
        const first = data.top10Tracks[0] || data.allTracks[0] || null;
        if (first) {
          audioEngine.loadTrack(first, false);
        }
        return first;
      }
      const updated = data.allTracks.find((t) => t.id === prev.id);
      return updated || prev;
    });
  }, []);

  useEffect(() => {
    fetch("/api/bootstrap")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.user) {
          applyDashboardData(data);
        }
      })
      .finally(() => setLoading(false));
  }, [applyDashboardData]);

  useEffect(() => {
    const unsub = audioEngine.subscribe(() => {
      const state = audioEngine.getState();
      setIsPlaying(state.isPlaying);
      if (state.currentTrack) {
        setCurrentTrack(state.currentTrack);
      }
    });
    return unsub;
  }, []);

  const handlePlayTrack = useCallback(
    (track: Track, openFullscreen = false) => {
      const state = audioEngine.getState();
      if (state.currentTrack?.id === track.id) {
        audioEngine.togglePlay();
      } else {
        setCurrentTrack(track);
        audioEngine.loadTrack(track, true);
        fetch(`/api/tracks/${track.id}/play`, { method: "POST" }).catch(() => {});
      }
      if (openFullscreen) {
        setIsFullscreenPlayer(true);
      }
    },
    []
  );

  const handleNextTrack = useCallback(() => {
    if (!dashboard || !currentTrack) return;
    const list = dashboard.allTracks;
    const idx = list.findIndex((t) => t.id === currentTrack.id);
    const next = list[(idx + 1) % list.length];
    if (next) handlePlayTrack(next);
  }, [dashboard, currentTrack, handlePlayTrack]);

  const handlePrevTrack = useCallback(() => {
    if (!dashboard || !currentTrack) return;
    const list = dashboard.allTracks;
    const idx = list.findIndex((t) => t.id === currentTrack.id);
    const prev = list[(idx - 1 + list.length) % list.length];
    if (prev) handlePlayTrack(prev);
  }, [dashboard, currentTrack, handlePlayTrack]);

  useEffect(() => {
    audioEngine.setOnTrackEnded(() => {
      handleNextTrack();
    });
  }, [handleNextTrack]);

  const handleToggleLike = async (trackId: string) => {
    if (!dashboard) return;
    try {
      const res = await fetch(`/api/tracks/${trackId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: dashboard.user.id }),
      });
      const data = await res.json();
      if (data?.dashboard) {
        applyDashboardData(data.dashboard);
      }
    } catch (e) {
      console.error("Like error:", e);
    }
  };

  const handleSavePreferences = async () => {
    if (!dashboard) return;
    setSavingPrefs(true);
    try {
      const res = await fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: dashboard.user.id,
          favoriteArtists: favArtists,
          favoriteGenres: favGenres,
        }),
      });
      const data = await res.json();
      if (data?.user) {
        applyDashboardData(data);
        setSavedToast(true);
        setTimeout(() => setSavedToast(false), 2500);
      }
    } finally {
      setSavingPrefs(false);
    }
  };

  const toggleFavArtist = (id: string) => {
    setFavArtists((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const toggleFavGenre = (id: string) => {
    setFavGenres((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const openStudioWithArtists = (artistIds?: string[]) => {
    if (artistIds && artistIds.length > 0) {
      setStudioPresetArtists(artistIds);
    } else if (favArtists.length > 0) {
      setStudioPresetArtists(favArtists.slice(0, 2));
    }
    setIsStudioOpen(true);
  };

  if (loading || !dashboard) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center gap-4">
        <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center animate-pulse shadow-2xl shadow-pink-500/30">
          <Disc3 className="w-8 h-8 text-white animate-spin" />
        </div>
        <p className="text-sm font-bold text-zinc-300 tracking-wide">
          Komposer K-POP AI 스튜디오를 불러오는 중...
        </p>
      </div>
    );
  }

  const { user, top10Tracks, newestTracks, recommendedTracks, myTracks, likedTracks } =
    dashboard;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-36 relative">
      {/* Ambient Background Glows */}
      <div className="fixed top-0 left-1/4 w-[38rem] h-[38rem] bg-pink-600/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed top-48 right-1/4 w-[34rem] h-[34rem] bg-violet-600/10 rounded-full blur-[150px] pointer-events-none" />

      {/* TOP NAVIGATION HEADER */}
      <header className="sticky top-0 z-30 bg-zinc-950/85 backdrop-blur-2xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Brand Logo */}
          <div
            onClick={() => setActiveNav("home")}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 via-fuchsia-500 to-violet-600 flex items-center justify-center shadow-lg shadow-pink-500/25 group-hover:scale-105 transition">
              <Disc3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg sm:text-xl font-black tracking-tight bg-gradient-to-r from-white via-pink-200 to-violet-300 bg-clip-text text-transparent">
                  Komposer
                </span>
                <span className="hidden sm:inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                  K-POP AI STUDIO
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 hidden sm:block">
                최애 가수의 스타일과 드림 콜라보로 만드는 나만의 K-POP 신곡
              </p>
            </div>
          </div>

          {/* Center Navigation Pills (1. 메인 화면 / 2. 마이페이지 / 3. 전체화면 플레이어) */}
          <nav className="flex items-center gap-1.5 bg-white/[0.04] p-1.5 rounded-2xl border border-white/10">
            <button
              onClick={() => setActiveNav("home")}
              className={`px-3.5 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition ${
                activeNav === "home"
                  ? "bg-gradient-to-r from-pink-500 to-violet-600 text-white shadow"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Flame className="w-4 h-4" />
              <span>메인 화면</span>
            </button>

            <button
              onClick={() => setActiveNav("mypage")}
              className={`px-3.5 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition ${
                activeNav === "mypage"
                  ? "bg-gradient-to-r from-pink-500 to-violet-600 text-white shadow"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <User className="w-4 h-4" />
              <span>마이페이지</span>
              <span className="hidden md:inline-flex px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white">
                {myTracks.length}
              </span>
            </button>

            <button
              onClick={() => setIsFullscreenPlayer(true)}
              className="px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold text-zinc-300 hover:text-white hover:bg-white/5 flex items-center gap-1.5 transition"
            >
              <Headphones className="w-4 h-4 text-pink-400" />
              <span className="hidden sm:inline">뮤직 플레이어</span>
            </button>
          </nav>

          {/* Right: AI Compose CTA + User Profile Button */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => openStudioWithArtists()}
              className="px-3.5 sm:px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-600 hover:brightness-110 text-xs sm:text-sm font-extrabold text-white flex items-center gap-1.5 shadow-lg shadow-pink-500/25 transition"
            >
              <Wand2 className="w-4 h-4" />
              <span>신곡 작곡하기</span>
            </button>

            <button
              onClick={() => setIsAuthOpen(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-zinc-200 transition"
              title="프로듀서 계정 전환 / 로그인"
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black text-white"
                style={{ backgroundColor: user.avatarColor }}
              >
                {user.name.slice(0, 1)}
              </div>
              <span className="hidden lg:inline">{user.name}</span>
              <LogIn className="w-3.5 h-3.5 text-zinc-400" />
            </button>
          </div>
        </div>
      </header>

      {/* =========================================================
          VIEW 1: 메인 화면 (HOME SCREEN)
          - 인기 상위 10개 생성 음악 (Top 10 Chart)
          - 사용자 취향 맞춤 추천 생성 음악 (Personalized Recommendations)
          - 새로 생성된 생성 음악 (Newly Created Tracks)
         ========================================================= */}
      {activeNav === "home" && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-12 relative z-10">
          {/* HERO BANNER: K-POP COMPOSER & DREAM COLLAB */}
          <section className="relative rounded-3xl overflow-hidden border border-white/15 bg-gradient-to-br from-zinc-900 via-indigo-950/80 to-fuchsia-950/60 p-6 sm:p-10 shadow-2xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/20 border border-pink-500/30 text-pink-300 text-xs font-extrabold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>신곡 공백기, 같은 노래 무한 반복에 지쳤다면?</span>
                </div>

                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-[1.18]">
                  내가 직접 프로듀싱하는{" "}
                  <span className="bg-gradient-to-r from-pink-400 via-fuchsia-400 to-violet-400 bg-clip-text text-transparent">
                    최애 가수의 신곡 & 드림 콜라보
                  </span>
                </h1>

                <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-2xl">
                  유튜브 뮤직비디오와 좋아하는 가수의 스타일을 분석해 세상에 없던{" "}
                  <strong className="text-white">생성 음악</strong>을 만들어 보세요.{" "}
                  뉴진스 × 에스파, 데이식스 × 아이유처럼 두 그룹이 콜라보한 황홀한 사운드도 클릭 한 번으로 탄생합니다.
                </p>

                {/* Quick Collab Presets */}
                <div className="pt-1">
                  <p className="text-xs font-bold text-zinc-400 mb-2">
                    🔥 원클릭 드림 콜라보 스튜디오 바로가기:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { ids: ["newjeans", "aespa"], label: "🐰 뉴진스 × 🪐 에스파" },
                      { ids: ["day6", "iu"], label: "🎸 데이식스 × 💜 아이유" },
                      { ids: ["blackpink", "straykids"], label: "🖤 블랙핑크 × 🧭 스키즈" },
                      { ids: ["seventeen", "lesserafim"], label: "💎 세븐틴 × ⚡ 르세라핌" },
                    ].map((preset, i) => (
                      <button
                        key={i}
                        onClick={() => openStudioWithArtists(preset.ids)}
                        className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-pink-500/25 border border-white/15 hover:border-pink-400/50 text-xs font-bold text-zinc-100 transition"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={() => openStudioWithArtists()}
                    className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-600 hover:scale-[1.02] text-sm font-extrabold text-white flex items-center gap-2 shadow-xl shadow-pink-500/30 transition"
                  >
                    <PlusCircle className="w-5 h-5" />
                    <span>지금 새로운 생성 음악 만들기</span>
                  </button>

                  {top10Tracks[0] && (
                    <button
                      onClick={() => handlePlayTrack(top10Tracks[0], true)}
                      className="px-5 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-sm font-bold text-white flex items-center gap-2 transition"
                    >
                      <Play className="w-4 h-4 fill-current text-pink-400" />
                      <span>인기 1위 트랙 바로 감상 (전체화면)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Featured #1 Track Spotlight Card */}
              {top10Tracks[0] && (
                <div className="lg:col-span-5 flex flex-col items-center lg:items-end">
                  <div className="w-full max-w-sm p-5 rounded-3xl bg-black/45 border border-white/15 backdrop-blur-xl shadow-2xl">
                    <div className="flex items-center justify-between mb-3">
                      <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-amber-300">
                        <Crown className="w-4 h-4 fill-amber-300" />
                        <span>실시간 인기 1위 생성 음악</span>
                      </span>
                      <span className="text-xs font-mono text-zinc-400">
                        {top10Tracks[0].plays.toLocaleString()} Plays
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <div
                        onClick={() => handlePlayTrack(top10Tracks[0])}
                        className="relative cursor-pointer group shrink-0"
                      >
                        <AlbumCover
                          config={top10Tracks[0].coverConfig}
                          title={top10Tracks[0].title}
                          isCollab={top10Tracks[0].isCollab}
                          isPlaying={
                            currentTrack?.id === top10Tracks[0].id && isPlaying
                          }
                          size="sm"
                          className="!w-24 !h-24"
                        />
                        <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                          <Play className="w-8 h-8 text-white fill-current" />
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-pink-400 truncate">
                          {top10Tracks[0].artistNames.join(" × ")}
                        </p>
                        <h3 className="text-base font-extrabold text-white truncate mt-0.5">
                          {top10Tracks[0].title}
                        </h3>
                        <p className="text-xs text-zinc-400 line-clamp-2 mt-1">
                          {top10Tracks[0].styleAnalysis}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-zinc-400">
                        작곡: <strong className="text-zinc-200">{top10Tracks[0].creatorName}</strong>
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePlayTrack(top10Tracks[0])}
                          className="px-3 py-1.5 rounded-xl bg-pink-500 hover:bg-pink-400 text-xs font-extrabold text-white flex items-center gap-1 transition"
                        >
                          {currentTrack?.id === top10Tracks[0].id && isPlaying ? (
                            <>
                              <Pause className="w-3.5 h-3.5 fill-current" />
                              <span>일시정지</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>재생</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handlePlayTrack(top10Tracks[0], true)}
                          className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-zinc-200 transition"
                        >
                          가사 보기
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* =========================================================
              SECTION 1: 현재 가장 인기있는 상위 10개 생성 음악 (TOP 10 CHART)
             ========================================================= */}
          <section className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-amber-400 text-xs font-extrabold uppercase tracking-wider mb-1">
                  <Trophy className="w-4 h-4" />
                  <span>KOMPOSER HOT 10 CHART</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  인기 TOP 10 생성 음악 차트
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400">
                  지금 유저들이 가장 많이 무한 반복 중인 K-POP 생성 음악 & 드림 콜라보 상위 10곡
                </p>
              </div>

              <button
                onClick={() => {
                  if (top10Tracks[0]) handlePlayTrack(top10Tracks[0]);
                }}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-extrabold text-white flex items-center gap-1.5 transition"
              >
                <Play className="w-3.5 h-3.5 fill-current text-pink-400" />
                <span>TOP 10 전체 재생</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {top10Tracks.map((track, idx) => {
                const rank = idx + 1;
                const isThisPlaying =
                  currentTrack?.id === track.id && isPlaying;

                return (
                  <div
                    key={track.id}
                    className={`flex items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all ${
                      currentTrack?.id === track.id
                        ? "bg-gradient-to-r from-pink-500/15 via-violet-500/10 to-transparent border-pink-500/50 shadow-lg"
                        : "bg-white/[0.03] hover:bg-white/[0.06] border-white/10"
                    }`}
                  >
                    {/* Rank Number */}
                    <div className="w-8 text-center shrink-0">
                      <span
                        className={`text-lg font-black ${
                          rank === 1
                            ? "text-amber-400"
                            : rank === 2
                              ? "text-zinc-200"
                              : rank === 3
                                ? "text-amber-600"
                                : "text-zinc-500"
                        }`}
                      >
                        {rank}
                      </span>
                    </div>

                    {/* Album Cover with Play Overlay */}
                    <div
                      onClick={() => handlePlayTrack(track)}
                      className="relative cursor-pointer group shrink-0"
                    >
                      <AlbumCover
                        config={track.coverConfig}
                        title={track.title}
                        isCollab={track.isCollab}
                        isPlaying={isThisPlaying}
                        size="sm"
                      />
                      <div
                        className={`absolute inset-0 rounded-xl bg-black/45 flex items-center justify-center transition ${
                          isThisPlaying
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-100"
                        }`}
                      >
                        {isThisPlaying ? (
                          <Pause className="w-5 h-5 text-white fill-current" />
                        ) : (
                          <Play className="w-5 h-5 text-white fill-current ml-0.5" />
                        )}
                      </div>
                    </div>

                    {/* Track Meta */}
                    <div
                      onClick={() => handlePlayTrack(track)}
                      className="min-w-0 flex-1 cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-extrabold text-white truncate">
                          {track.title}
                        </h3>
                        {track.isCollab && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-gradient-to-r from-pink-500 to-violet-500 text-white shrink-0">
                            COLLAB
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-pink-300 font-semibold truncate mt-0.5">
                        {track.artistNames.join(" × ")}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                        <span>{track.genre}</span>
                        <span>·</span>
                        <span>{track.plays.toLocaleString()}회 재생</span>
                        <span>·</span>
                        <span>by {track.creatorName}</span>
                      </div>
                    </div>

                    {/* Actions: Lyrics / Like / Play */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handlePlayTrack(track, true)}
                        className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition"
                        title="전체화면 및 싱크 가사 보기"
                      >
                        <Mic2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleToggleLike(track.id)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
                          track.isLiked
                            ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            : "bg-white/5 text-zinc-400 hover:text-white"
                        }`}
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${
                            track.isLiked ? "fill-current" : ""
                          }`}
                        />
                        <span>{track.likesCount.toLocaleString()}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* =========================================================
              SECTION 2: 사용자의 취향에 맞춰 플랫폼에서 추천한 생성 음악
             ========================================================= */}
          <section className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-pink-400 text-xs font-extrabold uppercase tracking-wider mb-1">
                  <Sparkles className="w-4 h-4" />
                  <span>AI PERSONALIZED FOR {user.name}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  {user.name}님의 취향 저격 AI 추천 생성 음악
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400">
                  선택하신 선호 가수(
                  <span className="text-pink-300 font-semibold">
                    {user.favoriteArtists
                      .map((id) => KPOP_ARTISTS.find((a) => a.id === id)?.koreanName || id)
                      .join(", ")}
                  </span>
                  )와 선호 장르(
                  <span className="text-violet-300 font-semibold">
                    {user.favoriteGenres.join(", ")}
                  </span>
                  )를 기반으로 매칭된 트랙입니다
                </p>
              </div>

              <button
                onClick={() => {
                  setActiveNav("mypage");
                  setMyPageTab("preferences");
                }}
                className="px-3.5 py-2 rounded-xl bg-pink-500/15 hover:bg-pink-500/25 border border-pink-500/30 text-xs font-bold text-pink-300 flex items-center gap-1.5 transition"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>내 선호 가수·장르 변경하기</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {recommendedTracks.slice(0, 4).map((track) => {
                const isThisPlaying =
                  currentTrack?.id === track.id && isPlaying;
                return (
                  <div
                    key={track.id}
                    className="group rounded-3xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-pink-500/40 p-4 flex flex-col justify-between transition-all shadow-lg"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-gradient-to-r from-pink-500/25 to-violet-500/25 text-pink-300 border border-pink-500/30">
                          🎯 취향 일치 {track.matchScore || 95}%
                        </span>
                        <button
                          onClick={() => handleToggleLike(track.id)}
                          className={`p-1.5 rounded-full transition ${
                            track.isLiked
                              ? "text-rose-400 bg-rose-500/15"
                              : "text-zinc-400 hover:text-white"
                          }`}
                        >
                          <Heart
                            className={`w-4 h-4 ${
                              track.isLiked ? "fill-current" : ""
                            }`}
                          />
                        </button>
                      </div>

                      <div
                        onClick={() => handlePlayTrack(track)}
                        className="relative cursor-pointer mb-3.5"
                      >
                        <AlbumCover
                          config={track.coverConfig}
                          title={track.title}
                          isCollab={track.isCollab}
                          isPlaying={isThisPlaying}
                          size="md"
                        />
                        <div
                          className={`absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center transition ${
                            isThisPlaying
                              ? "opacity-100"
                              : "opacity-0 group-hover:opacity-100"
                          }`}
                        >
                          <div className="w-12 h-12 rounded-full bg-pink-500 text-white flex items-center justify-center shadow-xl">
                            {isThisPlaying ? (
                              <Pause className="w-6 h-6 fill-current" />
                            ) : (
                              <Play className="w-6 h-6 fill-current ml-0.5" />
                            )}
                          </div>
                        </div>
                      </div>

                      <p className="text-xs font-extrabold text-pink-400 truncate">
                        {track.artistNames.join(" × ")}
                      </p>
                      <h3 className="text-base font-extrabold text-white truncate mt-0.5">
                        {track.title}
                      </h3>

                      {track.matchReasons && track.matchReasons.length > 0 && (
                        <p className="text-[11px] text-emerald-300 font-semibold mt-1.5 line-clamp-1">
                          ✓ {track.matchReasons[0]}
                        </p>
                      )}
                      <p className="text-xs text-zinc-400 line-clamp-2 mt-1">
                        {track.styleAnalysis}
                      </p>
                    </div>

                    <div className="pt-3 mt-3 border-t border-white/10 flex items-center justify-between">
                      <span className="text-[11px] text-zinc-400">
                        {track.genre}
                      </span>
                      <button
                        onClick={() => handlePlayTrack(track, true)}
                        className="text-xs font-bold text-pink-300 hover:text-white flex items-center gap-1 transition"
                      >
                        <Mic2 className="w-3.5 h-3.5" />
                        <span>싱크 가사</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* =========================================================
              SECTION 3: 새로 생성된 생성 음악 (NEWLY CREATED TRACKS)
             ========================================================= */}
          <section className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sky-400 text-xs font-extrabold uppercase tracking-wider mb-1">
                  <Clock className="w-4 h-4" />
                  <span>NEWLY DROPPED AI RELEASES</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  새로 생성된 따끈따끈한 생성 음악
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400">
                  방금 스튜디오에서 작곡된 최신 K-POP 생성 음악과 유저들의 실험적인 콜라보 트랙
                </p>
              </div>

              <button
                onClick={() => openStudioWithArtists()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500/20 to-violet-500/20 hover:from-pink-500/30 hover:to-violet-500/30 border border-pink-500/30 text-xs font-extrabold text-pink-300 flex items-center gap-1.5 transition"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>내 신곡도 여기에 등록하기</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {newestTracks.map((track) => {
                const isThisPlaying =
                  currentTrack?.id === track.id && isPlaying;
                return (
                  <div
                    key={track.id}
                    className="group rounded-3xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 p-4 flex flex-col justify-between transition"
                  >
                    <div>
                      <div
                        onClick={() => handlePlayTrack(track)}
                        className="relative cursor-pointer mb-3"
                      >
                        <AlbumCover
                          config={track.coverConfig}
                          title={track.title}
                          isCollab={track.isCollab}
                          isPlaying={isThisPlaying}
                          size="md"
                        />
                        <div
                          className={`absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center transition ${
                            isThisPlaying
                              ? "opacity-100"
                              : "opacity-0 group-hover:opacity-100"
                          }`}
                        >
                          <div className="w-12 h-12 rounded-full bg-white text-zinc-950 flex items-center justify-center shadow-xl">
                            {isThisPlaying ? (
                              <Pause className="w-6 h-6 fill-current" />
                            ) : (
                              <Play className="w-6 h-6 fill-current ml-0.5" />
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-extrabold text-sky-400 truncate">
                          {track.artistNames.join(" × ")}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 shrink-0">
                          {track.bpm} BPM
                        </span>
                      </div>

                      <h3 className="text-base font-extrabold text-white truncate mt-1">
                        {track.title}
                      </h3>

                      <p className="text-xs text-zinc-400 line-clamp-2 mt-1">
                        {track.collabPoint}
                      </p>

                      <div className="flex flex-wrap gap-1 mt-2.5">
                        {track.tags.slice(0, 3).map((tag, i) => (
                          <span
                            key={i}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-zinc-300"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 mt-3 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400">
                      <span className="truncate">by {track.creatorName}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleToggleLike(track.id)}
                          className={`flex items-center gap-1 ${
                            track.isLiked ? "text-rose-400" : "hover:text-white"
                          }`}
                        >
                          <Heart
                            className={`w-3.5 h-3.5 ${
                              track.isLiked ? "fill-current" : ""
                            }`}
                          />
                          <span>{track.likesCount}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </main>
      )}

      {/* =========================================================
          VIEW 2: 마이페이지 (MY PAGE SCREEN)
          - 내가 생성했던 음악들 (My Created Tracks)
          - 좋아요 표시했던 생성 음악들 (Liked Tracks)
          - 내가 좋아하는 장르/가수 선택 창 (Favorite Genres & Artists Selector)
         ========================================================= */}
      {activeNav === "mypage" && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 relative z-10">
          {/* Producer Profile Header Card */}
          <section className="rounded-3xl bg-gradient-to-r from-zinc-900 via-violet-950/50 to-pink-950/40 border border-white/15 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center text-3xl font-black text-white shadow-xl border border-white/20 shrink-0"
                style={{ backgroundColor: user.avatarColor }}
              >
                {user.name.slice(0, 1)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-pink-500/20 text-pink-300 border border-pink-500/30">
                    K-POP AI COMPOSER
                  </span>
                  <span className="text-xs text-zinc-400">{user.handle}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
                  {user.name}님의 마이페이지
                </h1>
                <p className="text-xs sm:text-sm text-zinc-300 mt-1">
                  {user.bio}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-start md:justify-end">
              <div className="px-4 py-2.5 rounded-2xl bg-black/40 border border-white/10 text-center">
                <p className="text-lg font-black text-pink-400">{myTracks.length}</p>
                <p className="text-[11px] text-zinc-400">내가 생성한 음악</p>
              </div>
              <div className="px-4 py-2.5 rounded-2xl bg-black/40 border border-white/10 text-center">
                <p className="text-lg font-black text-rose-400">{likedTracks.length}</p>
                <p className="text-[11px] text-zinc-400">좋아요 표시한 음악</p>
              </div>
              <div className="px-4 py-2.5 rounded-2xl bg-black/40 border border-white/10 text-center">
                <p className="text-lg font-black text-violet-400">
                  {favArtists.length}팀 / {favGenres.length}장르
                </p>
                <p className="text-[11px] text-zinc-400">설정된 취향</p>
              </div>

              <button
                onClick={() => openStudioWithArtists(favArtists)}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-violet-600 hover:brightness-110 text-xs sm:text-sm font-extrabold text-white flex items-center gap-2 shadow-lg transition"
              >
                <Wand2 className="w-4 h-4" />
                <span>최애 가수 조합으로 작곡하기</span>
              </button>
            </div>
          </section>

          {/* My Page 3 Core Sub-Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
            <button
              onClick={() => setMyPageTab("created")}
              className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition ${
                myPageTab === "created"
                  ? "bg-gradient-to-r from-pink-500 to-violet-600 text-white shadow"
                  : "bg-white/5 text-zinc-400 hover:text-white"
              }`}
            >
              <Music className="w-4 h-4" />
              <span>내가 생성했던 음악들 ({myTracks.length})</span>
            </button>

            <button
              onClick={() => setMyPageTab("liked")}
              className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition ${
                myPageTab === "liked"
                  ? "bg-gradient-to-r from-pink-500 to-violet-600 text-white shadow"
                  : "bg-white/5 text-zinc-400 hover:text-white"
              }`}
            >
              <Heart className="w-4 h-4" />
              <span>좋아요 표시했던 생성 음악들 ({likedTracks.length})</span>
            </button>

            <button
              onClick={() => setMyPageTab("preferences")}
              className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition ${
                myPageTab === "preferences"
                  ? "bg-gradient-to-r from-pink-500 to-violet-600 text-white shadow"
                  : "bg-white/5 text-zinc-400 hover:text-white"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>내가 좋아하는 장르 / 가수 선택 창</span>
            </button>
          </div>

          {/* SUB-TAB 1: 내가 생성했던 음악들 */}
          {myPageTab === "created" && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-white">
                    내가 생성했던 음악들
                  </h2>
                  <p className="text-xs text-zinc-400">
                    {user.name}님이 유튜브 레퍼런스와 아티스트 스타일로 직접 프로듀싱한 K-POP 생성 음악입니다
                  </p>
                </div>
                <button
                  onClick={() => openStudioWithArtists()}
                  className="px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-400 text-xs font-extrabold text-white flex items-center gap-1.5 transition"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>새 트랙 작곡</span>
                </button>
              </div>

              {myTracks.length === 0 ? (
                <div className="p-12 rounded-3xl bg-white/[0.02] border border-white/10 text-center space-y-3">
                  <Wand2 className="w-10 h-10 text-pink-400 mx-auto" />
                  <h3 className="text-base font-bold text-white">
                    아직 생성한 음악이 없습니다
                  </h3>
                  <p className="text-xs text-zinc-400">
                    지금 첫 번째 K-POP 생성 음악이나 최애 그룹 콜라보 곡을 만들어 보세요!
                  </p>
                  <button
                    onClick={() => openStudioWithArtists()}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 text-xs font-extrabold text-white"
                  >
                    AI 작곡 스튜디오 열기
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myTracks.map((track) => {
                    const isThisPlaying =
                      currentTrack?.id === track.id && isPlaying;
                    return (
                      <div
                        key={track.id}
                        className="p-4 rounded-3xl bg-white/[0.03] border border-white/10 hover:border-pink-500/40 flex flex-col sm:flex-row gap-4 transition"
                      >
                        <div
                          onClick={() => handlePlayTrack(track)}
                          className="relative cursor-pointer shrink-0 w-28 h-28"
                        >
                          <AlbumCover
                            config={track.coverConfig}
                            title={track.title}
                            isCollab={track.isCollab}
                            isPlaying={isThisPlaying}
                            size="sm"
                            className="!w-28 !h-28"
                          />
                        </div>

                        <div className="min-w-0 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-pink-400 truncate">
                                {track.artistNames.join(" × ")}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-zinc-300">
                                {track.genre}
                              </span>
                            </div>
                            <h3 className="text-base font-extrabold text-white truncate mt-0.5">
                              {track.title}
                            </h3>
                            <p className="text-xs text-zinc-400 line-clamp-2 mt-1">
                              {track.styleAnalysis}
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-3 mt-2 border-t border-white/10">
                            <div className="flex items-center gap-3 text-xs text-zinc-400">
                              <span>▶ {track.plays.toLocaleString()}</span>
                              <span>♥ {track.likesCount.toLocaleString()}</span>
                              {track.youtubeRefs.length > 0 && (
                                <span className="flex items-center gap-1 text-red-400">
                                  <Youtube className="w-3.5 h-3.5" />
                                  MV 레퍼런스 {track.youtubeRefs.length}개
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handlePlayTrack(track)}
                                className="px-3 py-1.5 rounded-xl bg-pink-500 hover:bg-pink-400 text-xs font-extrabold text-white flex items-center gap-1"
                              >
                                {isThisPlaying ? (
                                  <>
                                    <Pause className="w-3.5 h-3.5 fill-current" />
                                    <span>일시정지</span>
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-3.5 h-3.5 fill-current" />
                                    <span>재생</span>
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => handlePlayTrack(track, true)}
                                className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-zinc-200"
                              >
                                가사/분석
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* SUB-TAB 2: 좋아요 표시했던 생성 음악들 */}
          {myPageTab === "liked" && (
            <section className="space-y-4">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-white">
                  좋아요 표시했던 생성 음악들
                </h2>
                <p className="text-xs text-zinc-400">
                  하트를 눌러 보관함에 담아둔 K-POP 생성 음악 플레이리스트입니다
                </p>
              </div>

              {likedTracks.length === 0 ? (
                <div className="p-12 rounded-3xl bg-white/[0.02] border border-white/10 text-center space-y-3">
                  <Heart className="w-10 h-10 text-rose-400 mx-auto" />
                  <h3 className="text-base font-bold text-white">
                    아직 좋아요 표시한 음악이 없습니다
                  </h3>
                  <p className="text-xs text-zinc-400">
                    메인 화면의 TOP 10 차트나 신곡 목록에서 마음에 드는 곡에 하트를 눌러보세요!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {likedTracks.map((track) => {
                    const isThisPlaying =
                      currentTrack?.id === track.id && isPlaying;
                    return (
                      <div
                        key={track.id}
                        className="p-4 rounded-3xl bg-white/[0.03] border border-white/10 flex flex-col justify-between gap-3"
                      >
                        <div className="flex items-center gap-3.5">
                          <div
                            onClick={() => handlePlayTrack(track)}
                            className="cursor-pointer shrink-0"
                          >
                            <AlbumCover
                              config={track.coverConfig}
                              title={track.title}
                              isCollab={track.isCollab}
                              isPlaying={isThisPlaying}
                              size="sm"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-pink-400 truncate">
                              {track.artistNames.join(" × ")}
                            </p>
                            <h3 className="text-sm font-extrabold text-white truncate">
                              {track.title}
                            </h3>
                            <p className="text-[11px] text-zinc-400 truncate">
                              작곡: {track.creatorName} · {track.genre}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-white/10">
                          <button
                            onClick={() => handleToggleLike(track.id)}
                            className="text-xs font-bold text-rose-400 flex items-center gap-1"
                          >
                            <Heart className="w-3.5 h-3.5 fill-current" />
                            <span>좋아요 취소 ({track.likesCount})</span>
                          </button>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handlePlayTrack(track)}
                              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white flex items-center gap-1"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>재생</span>
                            </button>
                            <button
                              onClick={() => handlePlayTrack(track, true)}
                              className="px-2.5 py-1.5 rounded-xl bg-pink-500/20 text-pink-300 text-xs font-bold"
                            >
                              전체화면
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* SUB-TAB 3: 내가 좋아하는 장르 / 가수 선택 창 */}
          {myPageTab === "preferences" && (
            <section className="space-y-6 bg-white/[0.02] border border-white/10 rounded-3xl p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div>
                  <h2 className="text-xl font-black text-white">
                    내가 좋아하는 가수 / 그룹 & 장르 선택 창
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                    여기서 선택한 가수와 장르는 <strong className="text-pink-300">메인 화면의 취향 맞춤 추천 알고리즘</strong>과{" "}
                    <strong className="text-violet-300">AI 콜라보 작곡 스튜디오 기본값</strong>에 즉시 반영됩니다.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {savedToast && (
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <Check className="w-4 h-4" />
                      취향이 저장되어 추천 목록이 업데이트되었습니다!
                    </span>
                  )}
                  <button
                    onClick={handleSavePreferences}
                    disabled={savingPrefs}
                    className="px-5 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-violet-600 hover:brightness-110 text-xs sm:text-sm font-extrabold text-white shadow-lg shadow-pink-500/25 transition"
                  >
                    {savingPrefs ? "저장 중..." : "취향 설정 저장하기"}
                  </button>
                </div>
              </div>

              {/* Favorite K-POP Artists Multi-Select */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-white">
                    1. 좋아하는 K-POP 가수 / 그룹 선택 (다중 선택 가능 · 현재 {favArtists.length}팀 선택됨)
                  </h3>
                  {favArtists.length >= 2 && (
                    <button
                      onClick={() => openStudioWithArtists(favArtists.slice(0, 2))}
                      className="text-xs font-bold text-pink-400 hover:text-pink-300 flex items-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>선택한 가수들로 바로 콜라보 신곡 만들기 →</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {KPOP_ARTISTS.map((artist) => {
                    const selected = favArtists.includes(artist.id);
                    return (
                      <button
                        key={artist.id}
                        type="button"
                        onClick={() => toggleFavArtist(artist.id)}
                        className={`p-4 rounded-2xl border text-left transition-all ${
                          selected
                            ? "bg-gradient-to-br from-pink-500/25 to-violet-600/25 border-pink-500 shadow-lg"
                            : "bg-black/40 border-white/10 hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-extrabold text-white">
                            {artist.koreanName}
                          </span>
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                              selected
                                ? "bg-pink-500 text-white"
                                : "bg-white/10 text-zinc-500"
                            }`}
                          >
                            ✓
                          </span>
                        </div>
                        <p className="text-xs text-pink-300 font-semibold">
                          {artist.name} · {artist.groupType}
                        </p>
                        <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">
                          {artist.signatureSound}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Favorite K-POP Genres Multi-Select */}
              <div className="space-y-3 pt-4 border-t border-white/10">
                <h3 className="text-sm font-extrabold text-white">
                  2. 좋아하는 K-POP 세부 장르 선택 (현재 {favGenres.length}개 선택됨)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {KPOP_GENRES.map((genre) => {
                    const selected = favGenres.includes(genre.id);
                    return (
                      <button
                        key={genre.id}
                        type="button"
                        onClick={() => toggleFavGenre(genre.id)}
                        className={`p-4 rounded-2xl border text-left transition-all ${
                          selected
                            ? "bg-gradient-to-br from-violet-500/25 to-pink-500/20 border-violet-400 shadow-lg"
                            : "bg-black/40 border-white/10 hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-extrabold text-white">
                            {genre.name}
                          </span>
                          {selected && (
                            <Check className="w-4 h-4 text-violet-300" />
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                          {genre.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          )}
        </main>
      )}

      {/* =========================================================
          VIEW 3: 뮤직 플레이어 (PERSISTENT BOTTOM BAR + FULLSCREEN VIEW)
          - 다른 페이지에 있어도 항상 화면 위에 상시 표시
          - 전체화면 전환 시 실시간 싱크 가사 / 콜라보 파트 / 오디오 비주얼라이저 표시
         ========================================================= */}
      <MusicPlayer
        currentTrack={currentTrack}
        queue={dashboard.allTracks}
        isFullscreen={isFullscreenPlayer}
        onToggleFullscreen={(val) =>
          setIsFullscreenPlayer(
            typeof val === "boolean" ? val : !isFullscreenPlayer
          )
        }
        onSelectTrack={(track) => handlePlayTrack(track)}
        onNextTrack={handleNextTrack}
        onPrevTrack={handlePrevTrack}
        onToggleLike={handleToggleLike}
      />

      {/* AI K-POP COMPOSE STUDIO MODAL */}
      <ComposeStudioModal
        isOpen={isStudioOpen}
        onClose={() => setIsStudioOpen(false)}
        userId={user.id}
        defaultArtists={studioPresetArtists}
        onTrackCreated={(newTrack, updatedDashboard) => {
          if (updatedDashboard) {
            applyDashboardData(updatedDashboard as DashboardState);
          }
          setCurrentTrack(newTrack);
          audioEngine.loadTrack(newTrack, true);
          setIsFullscreenPlayer(true);
        }}
      />

      {/* USER LOGIN / REGISTER / ACCOUNT SWITCHER MODAL */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={(updatedDashboard) => {
          applyDashboardData(updatedDashboard as DashboardState);
        }}
      />
    </div>
  );
}

