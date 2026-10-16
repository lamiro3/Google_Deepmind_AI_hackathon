"use client";

import React, { useState } from "react";
import {
  KPOP_ARTISTS,
  KPOP_GENRES,
  Track,
  YoutubeReference,
} from "@/types/komposer";
import { audioEngine } from "@/lib/audioEngine";
import { Language } from "@/lib/i18n";
import {
  Check,
  Loader2,
  Plus,
  Sliders,
  Sparkles,
  Trash2,
  Wand2,
  X,
  Youtube,
} from "lucide-react";

interface ComposeStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  defaultArtists?: string[];
  onTrackCreated: (newTrack: Track, updatedDashboard: unknown) => void;
  lang?: Language;
}

const SAMPLE_YOUTUBE_REFS: Record<string, { url: string; title: string }> = {
  newjeans: {
    url: "https://www.youtube.com/watch?v=pSUydWEqKwE",
    title: "NewJeans (뉴진스) 'Ditto' Official MV",
  },
  aespa: {
    url: "https://www.youtube.com/watch?v=phuiiNCxRMg",
    title: "aespa 에스파 'Supernova' MV",
  },
  day6: {
    url: "https://www.youtube.com/watch?v=vnS_jn2uibs",
    title: "DAY6 '한 페이지가 될 수 있게' M/V",
  },
  iu: {
    url: "https://www.youtube.com/watch?v=JleoAppaxi0",
    title: "IU 'Love wins all' MV",
  },
  bts: {
    url: "https://www.youtube.com/watch?v=gdZLi9oWNZg",
    title: "BTS (방탄소년단) 'Dynamite' Official MV",
  },
  blackpink: {
    url: "https://www.youtube.com/watch?v=gQlMMD8auMs",
    title: "BLACKPINK - 'Pink Venom' M/V",
  },
  seventeen: {
    url: "https://www.youtube.com/watch?v=-GQg25oP0S4",
    title: "SEVENTEEN (세븐틴) '손오공' Official MV",
  },
  lesserafim: {
    url: "https://www.youtube.com/watch?v=n6B5gQXlB-0",
    title: "LE SSERAFIM (르세라핌) 'CRAZY' OFFICIAL MV",
  },
  straykids: {
    url: "https://www.youtube.com/watch?v=TQTlCHxyuu8",
    title: "Stray Kids '신메뉴(God's Menu)' M/V",
  },
  ive: {
    url: "https://www.youtube.com/watch?v=Y8JFxS1HlDo",
    title: "IVE 아이브 'LOVE DIVE' MV",
  },
  gdragon: {
    url: "https://www.youtube.com/watch?v=NMjhjrBIrG8",
    title: "G-DRAGON - POWER (Official Video)",
  },
  riize: {
    url: "https://www.youtube.com/watch?v=iUw3LPM7OBU",
    title: "RIIZE 라이즈 'Get A Guitar' MV",
  },
};

const MOOD_PRESETS = [
  "몽환적 & 아련한 Y2K (Dreamy & Nostalgic)",
  "강렬한 쇠맛 & 하이퍼 에너지 (Fierce & Futuristic)",
  "벅차오르는 청춘 페스티벌 (Euphoric & Youthful)",
  "세련된 심야 드라이브 (Chic & Groovy Night)",
  "폭발적인 월드투어 떼창 (Explosive Stadium Anthem)",
];

export default function ComposeStudioModal({
  isOpen,
  onClose,
  userId,
  defaultArtists = ["aespa", "newjeans"],
  onTrackCreated,
  lang = "ko",
}: ComposeStudioModalProps) {
  const isKo = lang === "ko";

  const [selectedArtistIds, setSelectedArtistIds] = useState<string[]>(
    defaultArtists.length > 0 ? defaultArtists.slice(0, 2) : ["aespa", "newjeans"]
  );
  const [customArtistName, setCustomArtistName] = useState("");
  const [collabRatio, setCollabRatio] = useState(50);
  const [youtubeInput, setYoutubeInput] = useState("");
  const [youtubeRefs, setYoutubeRefs] = useState<YoutubeReference[]>([
    {
      url: "https://www.youtube.com/watch?v=phuiiNCxRMg",
      videoId: "phuiiNCxRMg",
      title: "aespa 에스파 'Supernova' MV",
      author: "SMTOWN",
    },
    {
      url: "https://www.youtube.com/watch?v=pSUydWEqKwE",
      videoId: "pSUydWEqKwE",
      title: "NewJeans (뉴진스) 'Ditto' Official MV",
      author: "HYBE LABELS",
    },
  ]);
  const [isFetchingYt, setIsFetchingYt] = useState(false);

  const [selectedGenre, setSelectedGenre] = useState(KPOP_GENRES[0].id);
  const [selectedMood, setSelectedMood] = useState(MOOD_PRESETS[0]);
  const [customBpm, setCustomBpm] = useState<number>(130);
  const [customPrompt, setCustomPrompt] = useState("");

  const [isComposing, setIsComposing] = useState(false);
  const [composeStep, setComposeStep] = useState(0);
  const [vocalProgress, setVocalProgress] = useState<{
    ready: number;
    total: number;
    member: string;
    section: string;
  } | null>(null);

  if (!isOpen) return null;

  const toggleArtist = (artistId: string) => {
    setSelectedArtistIds((prev) => {
      if (prev.includes(artistId)) {
        if (prev.length === 1) return prev;
        return prev.filter((id) => id !== artistId);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), artistId];
      }
      return [...prev, artistId];
    });
  };

  const handleAddYoutubeUrl = async (urlToAdd?: string) => {
    const raw = (urlToAdd || youtubeInput).trim();
    if (!raw) return;
    setIsFetchingYt(true);
    try {
      const res = await fetch(`/api/youtube-info?url=${encodeURIComponent(raw)}`);
      const data = await res.json();
      if (data && data.title) {
        setYoutubeRefs((prev) => [...prev, data]);
      } else {
        setYoutubeRefs((prev) => [
          ...prev,
          { url: raw, title: "YouTube K-POP MV Reference", author: "YouTube" },
        ]);
      }
      if (!urlToAdd) setYoutubeInput("");
    } catch {
      setYoutubeRefs((prev) => [
        ...prev,
        { url: raw, title: "YouTube K-POP MV Reference", author: "YouTube" },
      ]);
      if (!urlToAdd) setYoutubeInput("");
    } finally {
      setIsFetchingYt(false);
    }
  };

  const handleQuickFillArtistMVs = () => {
    const refs: YoutubeReference[] = [];
    for (const id of selectedArtistIds) {
      const sample = SAMPLE_YOUTUBE_REFS[id];
      if (sample) {
        refs.push({
          url: sample.url,
          title: sample.title,
          author: "Official MV",
        });
      }
    }
    if (refs.length > 0) {
      setYoutubeRefs(refs);
    }
  };

  const handleComposeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isComposing) return;

    setIsComposing(true);
    setComposeStep(1);
    setVocalProgress(null);

    const stepTimer1 = setTimeout(() => setComposeStep(2), 600);

    try {
      const res = await fetch("/api/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          selectedArtistIds,
          customArtistName,
          collabRatio,
          youtubeRefs,
          genre: selectedGenre,
          mood: selectedMood,
          bpm: customBpm,
          customPrompt,
        }),
      });

      const data = await res.json();
      clearTimeout(stepTimer1);

      if (data?.track) {
        setComposeStep(3);
        await audioEngine.preloadTrackVocalsWithProgress(
          data.track,
          (ready, total, member, section) => {
            setVocalProgress({ ready, total, member, section });
          }
        );

        setComposeStep(4);
        setTimeout(() => {
          setIsComposing(false);
          setVocalProgress(null);
          onTrackCreated(data.track, data.dashboard);
          onClose();
        }, 350);
      } else {
        setIsComposing(false);
      }
    } catch (err) {
      console.error("Failed to compose:", err);
      clearTimeout(stepTimer1);
      setIsComposing(false);
      setVocalProgress(null);
    }
  };

  const selectedArtistObjects = selectedArtistIds
    .map((id) => KPOP_ARTISTS.find((a) => a.id === id))
    .filter(Boolean);

  const isCollab =
    selectedArtistObjects.length > 1 || Boolean(customArtistName.trim());

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-zinc-900 border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Top Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center shrink-0">
              <Wand2 className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-white truncate">
              {isKo ? "새 K-POP 생성 음악 작곡" : "Compose New K-POP Track"}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isComposing}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleComposeSubmit}
          className="p-5 space-y-5 overflow-y-auto flex-1"
        >
          {/* STEP 1: Select Artists */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-bold text-white">
                {isKo
                  ? "1. 아티스트 선택 (최대 3팀 콜라보)"
                  : "1. Select Artists (Up to 3 for Collab)"}
              </label>
              <span className="text-xs text-pink-400 font-medium">
                {selectedArtistObjects.map((a) => a?.name).join(" × ")}
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {KPOP_ARTISTS.map((artist) => {
                const isSelected = selectedArtistIds.includes(artist.id);
                return (
                  <button
                    type="button"
                    key={artist.id}
                    onClick={() => toggleArtist(artist.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition ${
                      isSelected
                        ? "bg-pink-500/15 border-pink-500/50 text-white"
                        : "bg-white/[0.03] border-white/10 text-zinc-300 hover:bg-white/[0.07]"
                    }`}
                  >
                    <div className="min-w-0 pr-1">
                      <p className="font-bold text-xs text-white truncate">
                        {artist.name}
                      </p>
                      <p className="text-[11px] text-zinc-400 truncate">
                        {artist.koreanName}
                      </p>
                    </div>
                    {isSelected && (
                      <span className="w-4 h-4 rounded-full bg-pink-500 text-white flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Collab Ratio Slider */}
            {isCollab && selectedArtistObjects.length >= 2 && (
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 flex items-center gap-1">
                    <Sliders className="w-3.5 h-3.5 text-pink-400" />
                    {isKo ? "콜라보 스타일 비중" : "Collab Style Ratio"}
                  </span>
                  <span className="font-mono text-white">
                    {selectedArtistObjects[0]?.name} {collabRatio}% :{" "}
                    {selectedArtistObjects[1]?.name} {100 - collabRatio}%
                  </span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={80}
                  step={5}
                  value={collabRatio}
                  onChange={(e) => setCollabRatio(parseInt(e.target.value, 10))}
                  className="w-full accent-pink-500 h-1.5 bg-white/15 rounded-lg cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* STEP 2: YouTube References */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                <Youtube className="w-4 h-4 text-red-400" />
                <span>
                  {isKo
                    ? "2. 참고 유튜브 뮤직비디오"
                    : "2. Reference YouTube MVs"}
                </span>
              </label>
              <button
                type="button"
                onClick={handleQuickFillArtistMVs}
                className="text-xs text-pink-400 hover:text-pink-300 font-medium"
              >
                {isKo ? "선택 가수 대표 MV 자동채우기" : "Auto-fill Artist MVs"}
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={youtubeInput}
                onChange={(e) => setYoutubeInput(e.target.value)}
                placeholder={
                  isKo ? "유튜브 링크 붙여넣기..." : "Paste YouTube URL..."
                }
                className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-pink-500"
              />
              <button
                type="button"
                onClick={() => handleAddYoutubeUrl()}
                disabled={isFetchingYt || !youtubeInput.trim()}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-40 text-xs font-semibold text-white flex items-center gap-1 transition shrink-0"
              >
                {isFetchingYt ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                <span>{isKo ? "추가" : "Add"}</span>
              </button>
            </div>

            {youtubeRefs.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {youtubeRefs.map((ref, idx) => (
                  <div
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-300 max-w-full"
                  >
                    <Youtube className="w-3 h-3 text-red-400 shrink-0" />
                    <span className="truncate max-w-[220px]">{ref.title}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setYoutubeRefs((prev) =>
                          prev.filter((_, i) => i !== idx)
                        )
                      }
                      className="text-zinc-500 hover:text-red-400 shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* STEP 3: Genre, Mood & Tempo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                {isKo ? "장르" : "Genre"}
              </label>
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-white/10 text-xs sm:text-sm text-white focus:outline-none focus:border-pink-500"
              >
                {KPOP_GENRES.map((g) => (
                  <option key={g.id} value={g.id}>
                    {isKo ? g.name : g.id}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                {isKo ? "분위기" : "Mood"}
              </label>
              <select
                value={selectedMood}
                onChange={(e) => setSelectedMood(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-white/10 text-xs sm:text-sm text-white focus:outline-none focus:border-pink-500"
              >
                {MOOD_PRESETS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                {isKo ? `템포 (${customBpm} BPM)` : `Tempo (${customBpm} BPM)`}
              </label>
              <input
                type="range"
                min={85}
                max={170}
                value={customBpm}
                onChange={(e) => setCustomBpm(parseInt(e.target.value, 10))}
                className="w-full accent-pink-500 h-2 bg-white/15 rounded-lg cursor-pointer mt-2"
              />
            </div>
          </div>

          {/* Optional Concept Input */}
          <div>
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder={
                isKo
                  ? "원하는 곡 컨셉 한 줄 입력 (선택, 예: 한밤중 서울 드라이브)"
                  : "Optional concept note (e.g., Midnight drive in Seoul)"
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-pink-500"
            />
          </div>

          {/* Progress Status when Composing */}
          {isComposing && (
            <div className="p-4 rounded-2xl bg-pink-500/10 border border-pink-500/30 space-y-2">
              <div className="flex items-center gap-2.5 text-sm font-bold text-white">
                <Loader2 className="w-4 h-4 text-pink-400 animate-spin shrink-0" />
                <span>
                  {composeStep === 1 &&
                    (isKo
                      ? "아티스트 스타일 및 MV 분석 중..."
                      : "Analyzing artist style & MV...")}
                  {composeStep === 2 &&
                    (isKo
                      ? "Gemini Lyria 사운드 & 가사 생성 중..."
                      : "Generating Lyria audio & lyrics...")}
                  {composeStep === 3 &&
                    (isKo
                      ? "가수 멤버별 AI 보컬 합성 중..."
                      : "Synthesizing member vocals...")}
                  {composeStep === 4 &&
                    (isKo ? "마스터링 완료!" : "Mastering complete!")}
                </span>
              </div>
              {vocalProgress && (
                <p className="text-xs text-pink-200 font-mono">
                  [{vocalProgress.section}] {vocalProgress.member} (
                  {vocalProgress.ready}/{vocalProgress.total})
                </p>
              )}
            </div>
          )}

          {/* Submit Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isComposing}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs sm:text-sm font-semibold text-zinc-300 transition"
            >
              {isKo ? "취소" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={isComposing}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-400 hover:to-violet-500 text-xs sm:text-sm font-bold text-white shadow-lg shadow-pink-500/25 flex items-center gap-2 transition disabled:opacity-50"
            >
              {isComposing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isKo ? "생성 중..." : "Composing..."}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{isKo ? "생성 음악 작곡하기" : "Compose Track"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
