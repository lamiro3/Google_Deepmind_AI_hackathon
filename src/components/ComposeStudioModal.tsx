"use client";

import React, { useState } from "react";
import {
  KPOP_ARTISTS,
  KPOP_GENRES,
  Track,
  YoutubeReference,
} from "@/types/komposer";
import {
  Check,
  KeyRound,
  Loader2,
  Music2,
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
  defaultArtists = ["newjeans", "aespa"],
  onTrackCreated,
}: ComposeStudioModalProps) {
  const [selectedArtistIds, setSelectedArtistIds] = useState<string[]>(
    defaultArtists.length > 0 ? defaultArtists.slice(0, 2) : ["newjeans", "aespa"]
  );
  const [customArtistName, setCustomArtistName] = useState("");
  const [collabRatio, setCollabRatio] = useState(50);
  const [youtubeInput, setYoutubeInput] = useState("");
  const [youtubeRefs, setYoutubeRefs] = useState<YoutubeReference[]>([
    {
      url: "https://www.youtube.com/watch?v=pSUydWEqKwE",
      videoId: "pSUydWEqKwE",
      title: "NewJeans (뉴진스) 'Ditto' Official MV",
      author: "HYBE LABELS",
    },
    {
      url: "https://www.youtube.com/watch?v=phuiiNCxRMg",
      videoId: "phuiiNCxRMg",
      title: "aespa 에스파 'Supernova' MV",
      author: "SMTOWN",
    },
  ]);
  const [isFetchingYt, setIsFetchingYt] = useState(false);

  const [selectedGenre, setSelectedGenre] = useState(KPOP_GENRES[0].id);
  const [selectedMood, setSelectedMood] = useState(MOOD_PRESETS[0]);
  const [customBpm, setCustomBpm] = useState<number>(130);
  const [customPrompt, setCustomPrompt] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [showApiKeyField, setShowApiKeyField] = useState(false);

  const [isComposing, setIsComposing] = useState(false);
  const [composeStep, setComposeStep] = useState(0);

  if (!isOpen) return null;

  const toggleArtist = (artistId: string) => {
    setSelectedArtistIds((prev) => {
      if (prev.includes(artistId)) {
        if (prev.length === 1) return prev; // keep at least 1
        return prev.filter((id) => id !== artistId);
      }
      // Allow up to 3 artists for Collab
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

    const stepTimer1 = setTimeout(() => setComposeStep(2), 700);
    const stepTimer2 = setTimeout(() => setComposeStep(3), 1400);

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
          apiKey: geminiApiKey,
        }),
      });

      const data = await res.json();
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setComposeStep(4);

      if (data?.track) {
        setTimeout(() => {
          setIsComposing(false);
          onTrackCreated(data.track, data.dashboard);
          onClose();
        }, 450);
      } else {
        setIsComposing(false);
      }
    } catch (err) {
      console.error("Failed to compose:", err);
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setIsComposing(false);
    }
  };

  const selectedArtistObjects = selectedArtistIds
    .map((id) => KPOP_ARTISTS.find((a) => a.id === id))
    .filter(Boolean);

  const isCollab =
    selectedArtistObjects.length > 1 || Boolean(customArtistName.trim());

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-zinc-900 border border-white/15 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Top Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-pink-500/10 via-violet-500/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center shadow-lg shadow-pink-500/30">
              <Wand2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
                <span>Komposer AI 작곡 스튜디오</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                  GEMINI + WEB SYNTH
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                좋아하는 K-POP 가수의 유튜브 MV와 스타일을 조합해 세상에 없던 신곡/콜라보 곡을 생성하세요
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleComposeSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* STEP 1: ARTIST & COLLAB SELECTION */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-sm font-extrabold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-pink-500 text-white text-xs flex items-center justify-center font-bold">
                  1
                </span>
                <span>가수/그룹 스타일 선택 (2팀 이상 선택 시 콜라보 자동 활성화!)</span>
              </label>
              <span className="text-xs text-pink-400 font-semibold">
                {isCollab
                  ? `✨ 드림 콜라보 모드 (${selectedArtistObjects.map((a) => a?.koreanName).join(" × ")}${
                      customArtistName ? ` × ${customArtistName}` : ""
                    })`
                  : `🎤 솔로 아티스트 스타일 (${selectedArtistObjects[0]?.koreanName})`}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {KPOP_ARTISTS.map((artist) => {
                const isSelected = selectedArtistIds.includes(artist.id);
                const selectionOrder = selectedArtistIds.indexOf(artist.id) + 1;
                return (
                  <button
                    key={artist.id}
                    type="button"
                    onClick={() => toggleArtist(artist.id)}
                    className={`relative text-left p-3 rounded-2xl border transition-all ${
                      isSelected
                        ? "bg-gradient-to-br from-pink-500/25 to-violet-600/25 border-pink-500 shadow-lg shadow-pink-500/10"
                        : "bg-white/[0.03] border-white/10 hover:bg-white/[0.07]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-extrabold text-white truncate">
                        {artist.name}
                      </span>
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-pink-500 text-[10px] font-extrabold text-white flex items-center justify-center">
                          {selectionOrder}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-300 font-semibold mb-1">
                      {artist.koreanName} · {artist.groupType}
                    </p>
                    <p className="text-[10px] text-zinc-400 line-clamp-1">
                      대표곡: {artist.representativeHits.slice(0, 2).join(", ")}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Collab Blend Slider & Custom Artist Input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {selectedArtistObjects.length >= 2 && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-pink-500/10 to-violet-500/10 border border-pink-500/30">
                  <div className="flex items-center justify-between text-xs font-bold text-white mb-2">
                    <span className="flex items-center gap-1 text-pink-300">
                      <Sliders className="w-3.5 h-3.5" />
                      {selectedArtistObjects[0]?.koreanName} ({collabRatio}%)
                    </span>
                    <span className="text-violet-300">
                      {selectedArtistObjects[1]?.koreanName} ({100 - collabRatio}%)
                    </span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={80}
                    step={5}
                    value={collabRatio}
                    onChange={(e) => setCollabRatio(Number(e.target.value))}
                    className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-pink-500"
                  />
                  <p className="text-[11px] text-zinc-400 mt-1">
                    슬라이더를 조절해 두 아티스트의 사운드·보컬 비중을 블렌딩합니다
                  </p>
                </div>
              )}

              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  직접 추가하고 싶은 가수/그룹 이름 (선택)
                </label>
                <input
                  type="text"
                  value={customArtistName}
                  onChange={(e) => setCustomArtistName(e.target.value)}
                  placeholder="예: QWER, 태연, 투어스(TWS), 키스오브라이프..."
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>
          </div>

          {/* STEP 2: YOUTUBE MV / SONG REFERENCE LINKS */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-sm font-extrabold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-pink-500 text-white text-xs flex items-center justify-center font-bold">
                  2
                </span>
                <span>참고할 유튜브 뮤직비디오 / 음원 링크</span>
              </label>

              <button
                type="button"
                onClick={handleQuickFillArtistMVs}
                className="text-xs font-bold text-pink-400 hover:text-pink-300 flex items-center gap-1 transition"
              >
                <Youtube className="w-3.5 h-3.5" />
                <span>선택한 가수의 대표 MV 자동 불러오기</span>
              </button>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Youtube className="w-4 h-4 text-red-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={youtubeInput}
                  onChange={(e) => setYoutubeInput(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... 링크를 붙여넣으세요"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500"
                />
              </div>
              <button
                type="button"
                onClick={() => handleAddYoutubeUrl()}
                disabled={isFetchingYt || !youtubeInput.trim()}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-40 text-xs font-bold text-white flex items-center gap-1.5 transition shrink-0"
              >
                {isFetchingYt ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                <span>링크 추가</span>
              </button>
            </div>

            {/* Added YouTube Reference List */}
            {youtubeRefs.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {youtubeRefs.map((yt, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/10"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
                        <Youtube className="w-4 h-4 text-red-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">
                          {yt.title}
                        </p>
                        <p className="text-[10px] text-zinc-400 truncate">
                          {yt.url}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setYoutubeRefs((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="p-1.5 text-zinc-500 hover:text-rose-400 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* STEP 3: GENRE, MOOD, BPM & CONCEPT PROMPT */}
          <div className="space-y-4">
            <label className="text-sm font-extrabold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-pink-500 text-white text-xs flex items-center justify-center font-bold">
                3
              </span>
              <span>장르 · 무드 · 작곡 컨셉 디렉팅</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1.5">
                  베이스 장르 (Genre)
                </label>
                <select
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/15 text-xs sm:text-sm text-white focus:outline-none focus:border-pink-500"
                >
                  {KPOP_GENRES.map((g) => (
                    <option key={g.id} value={g.id} className="bg-zinc-900">
                      {g.name} ({g.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1.5">
                  곡의 분위기 (Mood)
                </label>
                <select
                  value={selectedMood}
                  onChange={(e) => setSelectedMood(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/15 text-xs sm:text-sm text-white focus:outline-none focus:border-pink-500"
                >
                  {MOOD_PRESETS.map((m) => (
                    <option key={m} value={m} className="bg-zinc-900">
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1.5">
                  템포 (BPM): <span className="text-pink-400">{customBpm} BPM</span>
                </label>
                <input
                  type="range"
                  min={95}
                  max={160}
                  value={customBpm}
                  onChange={(e) => setCustomBpm(Number(e.target.value))}
                  className="w-full h-2 mt-2.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-pink-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 mb-1.5">
                작곡 프롬프트 / 원하는 곡 제목이나 테마 (선택)
              </label>
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="예: 여름밤 한강 드라이브할 때 듣기 좋은 뉴진스x데이식스 청량 밴드 신곡 만들어줘!"
                className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500"
              />
            </div>

            {/* Optional Gemini API Key Input */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowApiKeyField(!showApiKeyField)}
                className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5 text-pink-400" />
                <span>
                  {showApiKeyField
                    ? "Gemini API Key 입력창 닫기 (미입력 시 내장 K-POP AI 작곡 엔진 자동 구동)"
                    : "Gemini API Key 직접 입력하기 (선택사항 — 미입력 시에도 즉시 생성 가능)"}
                </span>
              </button>
              {showApiKeyField && (
                <input
                  type="password"
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder="AIzaSy... (Google AI Studio Gemini API Key)"
                  className="mt-2 w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/15 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500"
                />
              )}
            </div>
          </div>

          {/* Composing Progress Indicator */}
          {isComposing && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-pink-500/15 via-violet-500/15 to-sky-500/15 border border-pink-500/40 space-y-2">
              <div className="flex items-center gap-2 text-sm font-extrabold text-white">
                <Loader2 className="w-4 h-4 animate-spin text-pink-400" />
                <span>AI 프로듀서가 새로운 K-POP 트랙을 작곡하고 있습니다...</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className={`flex items-center gap-1.5 ${composeStep >= 1 ? "text-pink-300 font-bold" : "text-zinc-500"}`}>
                  <Check className="w-3.5 h-3.5" />
                  <span>1. 유튜브 MV & 음색 DNA 분석</span>
                </div>
                <div className={`flex items-center gap-1.5 ${composeStep >= 2 ? "text-violet-300 font-bold" : "text-zinc-500"}`}>
                  <Check className="w-3.5 h-3.5" />
                  <span>2. 콜라보 비트 & 신스 코드 배치</span>
                </div>
                <div className={`flex items-center gap-1.5 ${composeStep >= 3 ? "text-sky-300 font-bold" : "text-zinc-500"}`}>
                  <Check className="w-3.5 h-3.5" />
                  <span>3. 싱크 가사 & 앨범 커버 생성</span>
                </div>
              </div>
            </div>
          )}

          {/* Footer Submit Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs sm:text-sm font-semibold text-zinc-300 transition"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isComposing}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-600 hover:brightness-110 disabled:opacity-50 text-xs sm:text-sm font-extrabold text-white flex items-center gap-2 shadow-lg shadow-pink-500/30 transition"
            >
              {isComposing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>신곡 프로듀싱 중...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {isCollab ? "콜라보 생성 음악 작곡하기" : "생성 음악 작곡하기"}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

