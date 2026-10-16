"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  KPOP_ARTISTS,
  KPOP_GENRES,
  Track,
  UserProfile,
} from "@/types/komposer";
import { audioEngine } from "@/lib/audioEngine";
import {
  detectDefaultLanguage,
  Language,
  translateMatchReason,
} from "@/lib/i18n";
import AlbumCover from "@/components/AlbumCover";
import MusicPlayer from "@/components/MusicPlayer";
import ComposeStudioModal from "@/components/ComposeStudioModal";
import {
  Check,
  Disc3,
  Flame,
  Globe,
  Heart,
  LogIn,
  LogOut,
  Music2,
  Pause,
  Play,
  Plus,
  SlidersHorizontal,
  Sparkles,
  User,
  UserCheck,
  UserX,
  Wand2,
  X,
} from "lucide-react";

interface DashboardData {
  user: UserProfile | null;
  allTracks: Track[];
  top10Tracks: Track[];
  newestTracks: Track[];
  recommendedTracks: Track[];
  myTracks: Track[];
  likedTracks: Track[];
}

type MainView = "main" | "mypage";
type MyPageTab = "created" | "liked" | "preferences";

export default function KomposerApp() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<MainView>("main");
  const [myPageTab, setMyPageTab] = useState<MyPageTab>("created");
  const [artistFilter, setArtistFilter] = useState<string>("all");

  // Language state (defaults to Korean in Korea, English elsewhere)
  const [lang, setLang] = useState<Language>("ko");

  // Modals
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeDefaultArtists, setComposeDefaultArtists] = useState<string[]>([
    "aespa",
    "newjeans",
  ]);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [loginEmailInput, setLoginEmailInput] = useState("producer@komposer.ai");
  const [loginPasswordInput, setLoginPasswordInput] = useState("komposer123");
  const [loginNameInput, setLoginNameInput] = useState("K-Producer 지민");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Player state
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isFullscreenPlayer, setIsFullscreenPlayer] = useState(false);
  const [engineState, setEngineState] = useState(() => audioEngine.getState());

  // Preferences form state in My Page
  const [prefArtists, setPrefArtists] = useState<string[]>([]);
  const [prefGenres, setPrefGenres] = useState<string[]>([]);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    setLang(detectDefaultLanguage());
  }, []);

  const handleSelectLanguage = (newLang: Language) => {
    setLang(newLang);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("komposer_lang", newLang);
    }
  };

  const isKo = lang === "ko";
  const isLoggedIn = Boolean(dashboard?.user);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/bootstrap");
      const data: DashboardData = await res.json();
      setDashboard(data);
      if (data.user) {
        setPrefArtists(data.user.favoriteArtists);
        setPrefGenres(data.user.favoriteGenres);
      } else {
        setPrefArtists(["aespa", "newjeans"]);
        setPrefGenres(["Y2K / UK Garage", "Hyperpop / Metallic"]);
      }
      if (!currentTrack && data.top10Tracks.length > 0) {
        setCurrentTrack(data.top10Tracks[0]);
      }
    } catch (e) {
      console.error("Failed to load Komposer dashboard:", e);
    } finally {
      setLoading(false);
    }
  }, [currentTrack]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    const unsub = audioEngine.subscribe(() => {
      const st = audioEngine.getState();
      setEngineState({ ...st });
      if (st.currentTrack) {
        setCurrentTrack(st.currentTrack);
      }
    });
    return unsub;
  }, []);

  const handleLoginSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: authMode,
          email: loginEmailInput.trim() || "producer@komposer.ai",
          password: loginPasswordInput || "komposer123",
          name: loginNameInput.trim() || "K-Producer 지민",
        }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) {
        setAuthError(
          data?.error || (isKo ? "로그인에 실패했습니다." : "Sign in failed.")
        );
      } else if (data?.top10Tracks) {
        setDashboard(data as DashboardData);
        if (data.user) {
          setPrefArtists(data.user.favoriteArtists);
          setPrefGenres(data.user.favoriteGenres);
        }
        setIsLoginModalOpen(false);
      }
    } catch (err) {
      console.error("Login failed:", err);
      setAuthError(isKo ? "네트워크 오류가 발생했습니다." : "Network error.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    setAuthLoading(true);
    setIsComposeOpen(false);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "logout" }),
      });
      const data = await res.json();
      if (data?.top10Tracks) {
        setDashboard(data as DashboardData);
      }
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setAuthLoading(false);
    }
  };

  const queue = useMemo(() => {
    if (!dashboard) return [];
    const map = new Map<string, Track>();
    [
      ...dashboard.top10Tracks,
      ...dashboard.newestTracks,
      ...dashboard.recommendedTracks,
    ].forEach((t) => map.set(t.id, t));
    return Array.from(map.values());
  }, [dashboard]);

  const handlePlayTrack = (track: Track) => {
    setCurrentTrack(track);
    if (engineState.currentTrack?.id === track.id) {
      audioEngine.togglePlay();
    } else {
      audioEngine.loadTrack(track, true);
      fetch(`/api/tracks/${track.id}/play`, {
        method: "POST",
      }).catch(() => {});
    }
  };

  const handleNextTrack = () => {
    if (!queue.length || !currentTrack) return;
    const idx = queue.findIndex((t) => t.id === currentTrack.id);
    const next = queue[(idx + 1) % queue.length];
    handlePlayTrack(next);
  };

  const handlePrevTrack = () => {
    if (!queue.length || !currentTrack) return;
    const idx = queue.findIndex((t) => t.id === currentTrack.id);
    const prev = queue[(idx - 1 + queue.length) % queue.length];
    handlePlayTrack(prev);
  };

  const handleToggleLike = async (trackId: string) => {
    if (!dashboard) return;
    try {
      const res = await fetch(`/api/tracks/${trackId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: dashboard.user?.id || "user-demo-1",
        }),
      });
      const data = await res.json();
      if (data?.dashboard) {
        setDashboard(data.dashboard as DashboardData);
        if (currentTrack && currentTrack.id === trackId) {
          const updated = (data.dashboard as DashboardData).allTracks.find(
            (t: Track) => t.id === trackId
          );
          if (updated) setCurrentTrack(updated);
        }
      }
    } catch (e) {
      console.error("Failed to toggle like:", e);
    }
  };

  const handleSavePreferences = async () => {
    if (!dashboard?.user) {
      setIsLoginModalOpen(true);
      return;
    }
    setSavingPrefs(true);
    try {
      const res = await fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: dashboard.user.id,
          favoriteArtists: prefArtists,
          favoriteGenres: prefGenres,
        }),
      });
      const data = await res.json();
      if (data?.top10Tracks) {
        setDashboard(data as DashboardData);
        setSavedToast(true);
        setTimeout(() => setSavedToast(false), 2200);
      }
    } catch (e) {
      console.error("Failed to save preferences:", e);
    } finally {
      setSavingPrefs(false);
    }
  };

  const openComposeWithArtists = (artistIds: string[]) => {
    if (!isLoggedIn) return;
    setComposeDefaultArtists(artistIds);
    setIsComposeOpen(true);
  };

  const filteredTop10 = useMemo(() => {
    if (!dashboard) return [];
    if (artistFilter === "all") return dashboard.top10Tracks;
    return dashboard.top10Tracks.filter((t) =>
      t.artists.includes(artistFilter)
    );
  }, [dashboard, artistFilter]);

  const filteredNewReleases = useMemo(() => {
    if (!dashboard) return [];
    if (artistFilter === "all") return dashboard.newestTracks;
    return dashboard.newestTracks.filter((t) =>
      t.artists.includes(artistFilter)
    );
  }, [dashboard, artistFilter]);

  if (loading || !dashboard) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-violet-600 flex items-center justify-center animate-pulse">
          <Disc3 className="w-6 h-6 text-white animate-spin" />
        </div>
        <p className="text-sm font-bold text-zinc-300">
          {isKo ? "Komposer 불러오는 중..." : "Loading Komposer..."}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-28 selection:bg-pink-500 selection:text-white">
      {/* Subtle Ambient Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-48 left-1/4 w-[28rem] h-[28rem] bg-pink-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-32 w-[28rem] h-[28rem] bg-violet-600/10 rounded-full blur-3xl" />
      </div>

      {/* STICKY HEADER */}
      <header className="sticky top-0 z-30 bg-zinc-950/85 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Brand Logo */}
          <button
            onClick={() => setActiveView("main")}
            className="flex items-center gap-2.5 text-left shrink-0"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 via-violet-500 to-cyan-400 flex items-center justify-center shadow-md shadow-pink-500/20">
              <Music2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg sm:text-xl font-black tracking-tight bg-gradient-to-r from-white via-pink-200 to-violet-300 bg-clip-text text-transparent">
              Komposer
            </span>
          </button>

          {/* Center: Desktop View Switcher */}
          <nav className="hidden md:flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setActiveView("main")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                activeView === "main"
                  ? "bg-white text-zinc-950 shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {isKo ? "메인 화면" : "Home"}
            </button>
            <button
              onClick={() => setActiveView("mypage")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeView === "mypage"
                  ? "bg-white text-zinc-950 shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>{isKo ? "마이페이지" : "My Page"}</span>
            </button>
          </nav>

          {/* Right: Language + Compose + Auth Status */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Language Switcher */}
            <div className="flex items-center bg-white/[0.05] p-0.5 rounded-lg border border-white/10">
              <Globe className="w-3.5 h-3.5 text-zinc-400 ml-1.5 mr-1 hidden sm:block" />
              <button
                onClick={() => handleSelectLanguage("ko")}
                className={`px-2 py-1 rounded-md text-[11px] font-bold transition ${
                  lang === "ko"
                    ? "bg-pink-500 text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                KO
              </button>
              <button
                onClick={() => handleSelectLanguage("en")}
                className={`px-2 py-1 rounded-md text-[11px] font-bold transition ${
                  lang === "en"
                    ? "bg-pink-500 text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                EN
              </button>
            </div>

            {/* Compose Button */}
            {isLoggedIn && (
              <button
                onClick={() =>
                  openComposeWithArtists(
                    prefArtists.length ? prefArtists : ["aespa", "newjeans"]
                  )
                }
                className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-400 hover:to-violet-500 text-white font-bold text-xs shadow-md shadow-pink-500/20 transition"
              >
                <Wand2 className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">
                  {isKo ? "작곡하기" : "Compose"}
                </span>
              </button>
            )}

            {/* Login / Logout Status Button */}
            {isLoggedIn && dashboard.user ? (
              <div className="flex items-center gap-1.5 pl-2 pr-1.5 py-1 rounded-xl bg-white/[0.05] border border-white/10">
                <button
                  onClick={() => setActiveView("mypage")}
                  className="flex items-center gap-1.5 text-left"
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                    style={{
                      backgroundColor: dashboard.user.avatarColor || "#ec4899",
                    }}
                  >
                    {dashboard.user.name.slice(0, 1)}
                  </div>
                  <span className="text-xs font-bold text-white hidden lg:inline max-w-[96px] truncate">
                    {dashboard.user.name}
                  </span>
                </button>
                <button
                  onClick={handleLogout}
                  disabled={authLoading}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-red-500/20 text-zinc-300 hover:text-red-300 text-[11px] font-semibold transition"
                  title={isKo ? "로그아웃" : "Sign Out"}
                >
                  <LogOut className="w-3 h-3" />
                  <span className="hidden sm:inline">
                    {isKo ? "로그아웃" : "Sign Out"}
                  </span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-200 transition"
              >
                <div className="relative flex items-center justify-center shrink-0">
                  <UserX className="w-3.5 h-3.5 text-amber-300" />
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                </div>
                <span className="text-[11px] sm:text-xs font-bold whitespace-nowrap">
                  {isKo ? "미로그인 · 로그인" : "Not Logged In · Sign In"}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile 2-Tab Navigation Bar */}
        <div className="flex md:hidden border-t border-white/10 bg-zinc-950/90 px-4 py-1.5 gap-2">
          <button
            onClick={() => setActiveView("main")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
              activeView === "main"
                ? "bg-white text-zinc-950"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            {isKo ? "메인 화면" : "Home"}
          </button>
          <button
            onClick={() => setActiveView("mypage")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
              activeView === "mypage"
                ? "bg-white text-zinc-950"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            {isKo ? "마이페이지" : "My Page"}
          </button>
        </div>
      </header>

      {/* MAIN CONTENT CONTAINER */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-10">
        {activeView === "main" ? (
          <>
            {/* HERO BANNER (Clean & Focused) */}
            <section className="relative rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-br from-zinc-900 via-zinc-900/95 to-violet-950/40 p-6 sm:p-8">
              <div className="max-w-2xl space-y-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-300 text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isKo ? "AI K-POP 작곡 플랫폼" : "AI K-POP Music Studio"}</span>
                </div>

                <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight text-white">
                  {isKo
                    ? "내가 좋아하는 K-POP 가수의 스타일로 새로운 신곡을 작곡하세요"
                    : "Compose New Songs in Your Favorite K-POP Artist's Style"}
                </h1>

                <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                  {isKo
                    ? "단독 스타일은 물론 꿈꾸던 두 그룹의 콜라보까지, 아티스트 음색과 파트가 살아있는 생성 음악을 만들고 공유해보세요."
                    : "Create and share AI-generated K-POP tracks with authentic member vocals, solo styles, or dream group collaborations."}
                </p>

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  {isLoggedIn && (
                    <button
                      onClick={() =>
                        openComposeWithArtists(
                          prefArtists.length ? prefArtists : ["aespa", "newjeans"]
                        )
                      }
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-zinc-950 font-extrabold text-xs sm:text-sm hover:bg-pink-100 transition shadow-lg"
                    >
                      <Wand2 className="w-4 h-4 text-pink-600" />
                      <span>
                        {isKo ? "새 생성 음악 작곡하기" : "Compose New Track"}
                      </span>
                    </button>
                  )}

                  {dashboard.top10Tracks[0] && (
                    <button
                      onClick={() => handlePlayTrack(dashboard.top10Tracks[0])}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-xs sm:text-sm transition"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>{isKo ? "인기 1위 곡 듣기" : "Play #1 Track"}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Clean Artist Filter Strip */}
              <div className="mt-6 pt-5 border-t border-white/10 flex items-center gap-2 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setArtistFilter("all")}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition ${
                    artistFilter === "all"
                      ? "bg-pink-500 text-white"
                      : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {isKo ? "전체 가수" : "All Artists"}
                </button>
                {KPOP_ARTISTS.map((artist) => (
                  <button
                    key={artist.id}
                    onClick={() =>
                      setArtistFilter(
                        artistFilter === artist.id ? "all" : artist.id
                      )
                    }
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition ${
                      artistFilter === artist.id
                        ? "bg-white text-zinc-950 font-bold"
                        : "bg-white/5 text-zinc-300 hover:bg-white/10"
                    }`}
                  >
                    {artist.name}
                  </button>
                ))}
              </div>
            </section>

            {/* SECTION 1: TOP 10 POPULAR TRACKS */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-400" />
                  <h2 className="text-lg sm:text-xl font-extrabold text-white">
                    {isKo ? "인기 TOP 10 생성 음악" : "Top 10 Popular Tracks"}
                  </h2>
                </div>
                <span className="text-xs text-zinc-400">
                  {isKo ? "실시간 차트" : "Live Chart"}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {filteredTop10.map((track, index) => {
                  const isTrackPlaying =
                    engineState.isPlaying &&
                    engineState.currentTrack?.id === track.id;
                  const artistNames = (
                    track.artistNames || track.artists
                  ).join(" × ");

                  return (
                    <div
                      key={track.id}
                      onClick={() => handlePlayTrack(track)}
                      className={`group flex items-center justify-between gap-3 p-3 rounded-2xl border cursor-pointer transition ${
                        isTrackPlaying
                          ? "bg-pink-500/10 border-pink-500/40"
                          : "bg-zinc-900/60 hover:bg-zinc-900 border-white/10"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span
                          className={`w-6 text-center font-black text-sm shrink-0 ${
                            index < 3 ? "text-pink-400" : "text-zinc-500"
                          }`}
                        >
                          {index + 1}
                        </span>

                        <AlbumCover
                          config={track.coverConfig}
                          title={track.title}
                          isCollab={track.isCollab}
                          size="sm"
                          isPlaying={isTrackPlaying}
                        />

                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-sm text-white truncate group-hover:text-pink-300 transition">
                            {track.title}
                          </p>
                          <p className="text-xs text-zinc-400 truncate mt-0.5">
                            {artistNames} · {track.genre}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleLike(track.id);
                          }}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                            track.isLiked
                              ? "bg-pink-500/20 text-pink-300"
                              : "bg-white/5 text-zinc-400 hover:text-white"
                          }`}
                        >
                          <Heart
                            className={`w-3.5 h-3.5 ${
                              track.isLiked ? "fill-pink-500 text-pink-500" : ""
                            }`}
                          />
                          <span>{track.likesCount}</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayTrack(track);
                          }}
                          className={`w-8 h-8 rounded-xl flex items-center justify-center transition ${
                            isTrackPlaying
                              ? "bg-pink-500 text-white"
                              : "bg-white/10 text-white group-hover:bg-white group-hover:text-zinc-950"
                          }`}
                        >
                          {isTrackPlaying ? (
                            <Pause className="w-3.5 h-3.5 fill-current" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* SECTION 2: AI RECOMMENDED TRACKS (ONLY WHEN LOGGED IN) */}
            {isLoggedIn && dashboard.user && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-violet-400" />
                    <h2 className="text-lg sm:text-xl font-extrabold text-white">
                      {isKo
                        ? `${dashboard.user.name}님을 위한 취향 저격 AI 추천 음악`
                        : `Recommended for ${dashboard.user.name}`}
                    </h2>
                  </div>
                  <button
                    onClick={() => {
                      setActiveView("mypage");
                      setMyPageTab("preferences");
                    }}
                    className="text-xs text-violet-300 hover:text-white font-semibold"
                  >
                    {isKo ? "취향 설정 변경 →" : "Edit Taste →"}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {dashboard.recommendedTracks.slice(0, 4).map((track) => {
                    const isTrackPlaying =
                      engineState.isPlaying &&
                      engineState.currentTrack?.id === track.id;
                    const artistNames = (
                      track.artistNames || track.artists
                    ).join(" × ");

                    return (
                      <div
                        key={track.id}
                        onClick={() => handlePlayTrack(track)}
                        className="group p-4 rounded-2xl bg-zinc-900/70 hover:bg-zinc-900 border border-white/10 hover:border-violet-500/40 transition cursor-pointer flex flex-col justify-between gap-3"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <AlbumCover
                              config={track.coverConfig}
                              title={track.title}
                              isCollab={track.isCollab}
                              size="md"
                              isPlaying={isTrackPlaying}
                            />
                            {track.matchScore && (
                              <span className="px-2.5 py-1 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300 text-[11px] font-bold">
                                {track.matchScore}% Match
                              </span>
                            )}
                          </div>

                          <div>
                            <h3 className="font-bold text-sm text-white truncate group-hover:text-violet-300 transition">
                              {track.title}
                            </h3>
                            <p className="text-xs text-zinc-400 truncate mt-0.5">
                              {artistNames}
                            </p>
                          </div>

                          {track.matchReasons && track.matchReasons[0] && (
                            <p className="text-xs text-zinc-400 line-clamp-1">
                              {translateMatchReason(track.matchReasons[0], lang)}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                          <span className="text-[11px] text-zinc-500 truncate">
                            {track.genre}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleLike(track.id);
                              }}
                              className={`p-1.5 rounded-lg transition ${
                                track.isLiked
                                  ? "text-pink-400"
                                  : "text-zinc-400 hover:text-white"
                              }`}
                            >
                              <Heart
                                className={`w-4 h-4 ${
                                  track.isLiked ? "fill-pink-500" : ""
                                }`}
                              />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePlayTrack(track);
                              }}
                              className="w-7 h-7 rounded-lg bg-white text-zinc-950 flex items-center justify-center"
                            >
                              {isTrackPlaying ? (
                                <Pause className="w-3.5 h-3.5 fill-current" />
                              ) : (
                                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* SECTION 3: NEWLY COMPOSED TRACKS */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Disc3 className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-lg sm:text-xl font-extrabold text-white">
                    {isKo ? "새로 생성된 음악" : "Newly Composed Tracks"}
                  </h2>
                </div>
                {isLoggedIn && (
                  <button
                    onClick={() =>
                      openComposeWithArtists(
                        prefArtists.length ? prefArtists : ["aespa", "newjeans"]
                      )
                    }
                    className="text-xs text-pink-400 hover:text-pink-300 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isKo ? "직접 작곡하기" : "Compose Yours"}</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredNewReleases.map((track) => {
                  const isTrackPlaying =
                    engineState.isPlaying &&
                    engineState.currentTrack?.id === track.id;
                  const artistNames = (
                    track.artistNames || track.artists
                  ).join(" × ");

                  return (
                    <div
                      key={track.id}
                      onClick={() => handlePlayTrack(track)}
                      className="group p-4 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-white/10 transition cursor-pointer flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <AlbumCover
                          config={track.coverConfig}
                          title={track.title}
                          isCollab={track.isCollab}
                          size="sm"
                          isPlaying={isTrackPlaying}
                        />
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-sm text-white truncate group-hover:text-pink-300 transition">
                            {track.title}
                          </h3>
                          <p className="text-xs text-zinc-400 truncate mt-0.5">
                            {artistNames}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                        <span className="text-zinc-400 truncate pr-2">
                          {track.genre} · {track.bpm} BPM
                        </span>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleLike(track.id);
                            }}
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg transition ${
                              track.isLiked
                                ? "text-pink-400 bg-pink-500/15"
                                : "text-zinc-400 hover:text-white bg-white/5"
                            }`}
                          >
                            <Heart
                              className={`w-3.5 h-3.5 ${
                                track.isLiked ? "fill-pink-500" : ""
                              }`}
                            />
                            <span>{track.likesCount}</span>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlayTrack(track);
                            }}
                            className="w-7 h-7 rounded-lg bg-white/10 group-hover:bg-white group-hover:text-zinc-950 text-white flex items-center justify-center transition"
                          >
                            {isTrackPlaying ? (
                              <Pause className="w-3.5 h-3.5 fill-current" />
                            ) : (
                              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        ) : (
          /* MY PAGE VIEW */
          <div className="space-y-6">
            {/* Profile Header Card */}
            {isLoggedIn && dashboard.user ? (
              <div className="p-6 rounded-3xl bg-zinc-900/80 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black text-white shrink-0"
                    style={{
                      backgroundColor: dashboard.user.avatarColor || "#ec4899",
                    }}
                  >
                    {dashboard.user.name.slice(0, 1)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl font-black text-white">
                        {dashboard.user.name}
                      </h1>
                      <span className="text-xs text-zinc-400">
                        {dashboard.user.handle}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">
                      {isKo ? "작곡한 곡" : "Composed"} {dashboard.myTracks.length} ·{" "}
                      {isKo ? "좋아요" : "Liked"} {dashboard.likedTracks.length} ·{" "}
                      {isKo ? "선호 가수" : "Artists"} {prefArtists.length}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openComposeWithArtists(prefArtists)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 text-xs font-bold text-white"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>{isKo ? "새 곡 작곡" : "New Track"}</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-red-500/20 border border-white/10 text-xs font-semibold text-zinc-300 hover:text-red-300 transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{isKo ? "로그아웃" : "Sign Out"}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-3xl bg-zinc-900/80 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300 shrink-0">
                    <UserX className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-extrabold text-white">
                      {isKo
                        ? "현재 로그인되어 있지 않습니다"
                        : "You are not signed in"}
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {isKo
                        ? "로그인하면 맞춤 AI 추천 음악과 내 선호 가수/장르 설정을 저장할 수 있습니다."
                        : "Sign in to unlock AI recommendations and save your favorite artists & genres."}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 text-xs font-bold text-white flex items-center gap-1.5 shrink-0"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{isKo ? "로그인하기" : "Sign In"}</span>
                </button>
              </div>
            )}

            {/* My Page Sub-Tabs */}
            <div className="flex gap-2 border-b border-white/10 pb-3 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setMyPageTab("created")}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shrink-0 transition ${
                  myPageTab === "created"
                    ? "bg-white text-zinc-950"
                    : "bg-white/5 text-zinc-400 hover:text-white"
                }`}
              >
                {isKo
                  ? `내가 생성한 음악 (${dashboard.myTracks.length})`
                  : `My Composed Tracks (${dashboard.myTracks.length})`}
              </button>
              <button
                onClick={() => setMyPageTab("liked")}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shrink-0 transition ${
                  myPageTab === "liked"
                    ? "bg-white text-zinc-950"
                    : "bg-white/5 text-zinc-400 hover:text-white"
                }`}
              >
                {isKo
                  ? `좋아요 표시한 음악 (${dashboard.likedTracks.length})`
                  : `Liked Tracks (${dashboard.likedTracks.length})`}
              </button>
              <button
                onClick={() => setMyPageTab("preferences")}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shrink-0 transition flex items-center gap-1.5 ${
                  myPageTab === "preferences"
                    ? "bg-white text-zinc-950"
                    : "bg-white/5 text-zinc-400 hover:text-white"
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>
                  {isKo ? "선호 가수 · 장르 설정" : "Favorite Artists & Genres"}
                </span>
              </button>
            </div>

            {/* Tab 1 & 2: Created or Liked Tracks */}
            {(myPageTab === "created" || myPageTab === "liked") && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(myPageTab === "created"
                  ? dashboard.myTracks
                  : dashboard.likedTracks
                ).map((track: Track) => {
                  const isTrackPlaying =
                    engineState.isPlaying &&
                    engineState.currentTrack?.id === track.id;
                  return (
                    <div
                      key={track.id}
                      onClick={() => handlePlayTrack(track)}
                      className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-white/10 cursor-pointer transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <AlbumCover
                          config={track.coverConfig}
                          title={track.title}
                          isCollab={track.isCollab}
                          size="sm"
                          isPlaying={isTrackPlaying}
                        />
                        <div className="min-w-0">
                          <h3 className="font-bold text-sm text-white truncate">
                            {track.title}
                          </h3>
                          <p className="text-xs text-zinc-400 truncate mt-0.5">
                            {(track.artistNames || track.artists).join(" × ")} ·{" "}
                            {track.genre}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleLike(track.id);
                          }}
                          className={`p-2 rounded-xl border transition ${
                            track.isLiked
                              ? "bg-pink-500/20 border-pink-500/40 text-pink-400"
                              : "bg-white/5 border-white/10 text-zinc-400"
                          }`}
                        >
                          <Heart
                            className={`w-4 h-4 ${
                              track.isLiked ? "fill-pink-500" : ""
                            }`}
                          />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayTrack(track);
                          }}
                          className="w-9 h-9 rounded-xl bg-white text-zinc-950 flex items-center justify-center"
                        >
                          {isTrackPlaying ? (
                            <Pause className="w-4 h-4 fill-current" />
                          ) : (
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tab 3: Favorite Artists & Genres Selector */}
            {myPageTab === "preferences" && (
              <div className="p-6 rounded-3xl bg-zinc-900/70 border border-white/10 space-y-6">
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-white">
                    {isKo ? "선호하는 K-POP 가수 선택" : "Favorite K-POP Artists"}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {KPOP_ARTISTS.map((artist) => {
                      const active = prefArtists.includes(artist.id);
                      return (
                        <button
                          key={artist.id}
                          onClick={() =>
                            setPrefArtists((prev) =>
                              prev.includes(artist.id)
                                ? prev.filter((id) => id !== artist.id)
                                : [...prev, artist.id]
                            )
                          }
                          className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition ${
                            active
                              ? "bg-pink-500/15 border-pink-500/50 text-white"
                              : "bg-white/[0.03] border-white/10 text-zinc-400 hover:text-white"
                          }`}
                        >
                          <div className="min-w-0 pr-1">
                            <p className="text-xs font-bold truncate">
                              {artist.name}
                            </p>
                            <p className="text-[11px] text-zinc-500 truncate">
                              {artist.koreanName}
                            </p>
                          </div>
                          {active && (
                            <Check className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-white">
                    {isKo ? "선호하는 장르 선택" : "Favorite Genres"}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {KPOP_GENRES.map((genre) => {
                      const active = prefGenres.includes(genre.id);
                      return (
                        <button
                          key={genre.id}
                          onClick={() =>
                            setPrefGenres((prev) =>
                              prev.includes(genre.id)
                                ? prev.filter((g) => g !== genre.id)
                                : [...prev, genre.id]
                            )
                          }
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition ${
                            active
                              ? "bg-violet-500/20 border-violet-500/50 text-white"
                              : "bg-white/[0.03] border-white/10 text-zinc-400 hover:text-white"
                          }`}
                        >
                          {isKo ? genre.name : genre.id}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
                  {savedToast && (
                    <span className="text-xs text-emerald-400 font-semibold">
                      {isKo ? "저장되었습니다!" : "Preferences saved!"}
                    </span>
                  )}
                  <button
                    onClick={handleSavePreferences}
                    disabled={savingPrefs}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 text-xs sm:text-sm font-bold text-white shadow-lg shadow-pink-500/20 transition"
                  >
                    {savingPrefs
                      ? isKo
                        ? "저장 중..."
                        : "Saving..."
                      : isKo
                        ? "취향 설정 저장"
                        : "Save Preferences"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* LOGIN MODAL */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-white/15 rounded-3xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    {isKo ? "Komposer 로그인" : "Sign In to Komposer"}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {isKo
                      ? "맞춤 AI 추천과 마이페이지를 이용하세요"
                      : "Unlock personalized AI picks & My Page"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsLoginModalOpen(false)}
                className="p-1.5 rounded-full bg-white/5 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setAuthMode("login")}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                  authMode === "login"
                    ? "bg-white text-zinc-950"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {isKo ? "로그인" : "Sign In"}
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("register")}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                  authMode === "register"
                    ? "bg-white text-zinc-950"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {isKo ? "새 계정 시작" : "Register"}
              </button>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  {isKo ? "이메일" : "Email"}
                </label>
                <input
                  type="email"
                  value={loginEmailInput}
                  onChange={(e) => setLoginEmailInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              {authMode === "register" && (
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    {isKo ? "작곡가 닉네임" : "Producer Name"}
                  </label>
                  <input
                    type="text"
                    value={loginNameInput}
                    onChange={(e) => setLoginNameInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-pink-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  {isKo ? "비밀번호" : "Password"}
                </label>
                <input
                  type="password"
                  value={loginPasswordInput}
                  onChange={(e) => setLoginPasswordInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              {authError && (
                <p className="text-xs text-red-400 font-medium">{authError}</p>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-400 hover:to-violet-500 text-sm font-bold text-white shadow-lg shadow-pink-500/20 transition"
              >
                {authLoading
                  ? isKo
                    ? "처리 중..."
                    : "Please wait..."
                  : authMode === "login"
                    ? isKo
                      ? "로그인하기"
                      : "Sign In"
                    : isKo
                      ? "가입 및 로그인"
                      : "Create Account"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* COMPOSE STUDIO MODAL */}
      <ComposeStudioModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        userId={dashboard.user?.id || "user-demo-1"}
        defaultArtists={composeDefaultArtists}
        lang={lang}
        onTrackCreated={(newTrack, updatedDashboard) => {
          if (updatedDashboard) {
            setDashboard(updatedDashboard as DashboardData);
          }
          setCurrentTrack(newTrack);
          audioEngine.loadTrack(newTrack, true);
        }}
      />

      {/* PERSISTENT MUSIC PLAYER */}
      <MusicPlayer
        currentTrack={currentTrack}
        queue={queue}
        isFullscreen={isFullscreenPlayer}
        onToggleFullscreen={(val) =>
          setIsFullscreenPlayer((prev) =>
            typeof val === "boolean" ? val : !prev
          )
        }
        onSelectTrack={(track) => handlePlayTrack(track)}
        onNextTrack={handleNextTrack}
        onPrevTrack={handlePrevTrack}
        onToggleLike={handleToggleLike}
        lang={lang}
      />
    </div>
  );
}
