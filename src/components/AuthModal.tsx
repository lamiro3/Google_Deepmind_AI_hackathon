"use client";

import React, { useState } from "react";
import { Loader2, LogIn, ShieldAlert, Sparkles, UserCheck, UserPlus, X } from "lucide-react";
import { Language } from "@/lib/i18n";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (dashboardData: unknown) => void;
  lang?: Language;
}

export default function AuthModal({
  isOpen,
  onClose,
  onAuthSuccess,
  lang = "ko",
}: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("producer@komposer.kr");
  const [password, setPassword] = useState("komposer123");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const isKo = lang === "ko";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, email, password, name }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(
          data.error ||
            (isKo ? "로그인에 실패했습니다." : "Authentication failed.")
        );
      } else {
        onAuthSuccess(data);
        onClose();
      }
    } catch {
      setError(
        isKo
          ? "서버와 통신 중 오류가 발생했습니다."
          : "Network error occurred while communicating with the server."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (demoEmail: string) => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "login", email: demoEmail }),
      });
      const data = await res.json();
      if (res.ok && !data.error) {
        onAuthSuccess(data);
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-zinc-900 border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-white/10 bg-gradient-to-r from-pink-500/10 via-violet-500/10 to-transparent">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-pink-400 shrink-0" />
            <h3 className="text-sm sm:text-base font-extrabold text-white">
              {isKo ? "Komposer 프로듀서 로그인" : "Komposer Producer Sign In"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          {/* Status Banner */}
          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {isKo
                ? "로그인하면 메인 화면에 '취향 저격 AI 추천 생성 음악'이 활성화되고, 내가 작곡한 곡과 좋아요 목록을 관리할 수 있습니다."
                : "Sign in to unlock 'Personalized AI Recommended Tracks' on the Main Page and manage your composed songs & liked tracks."}
            </p>
          </div>

          {/* Mode Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-black/40 border border-white/10">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
              }}
              className={`py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                mode === "login"
                  ? "bg-gradient-to-r from-pink-500 to-violet-600 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{isKo ? "로그인" : "Sign In"}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setEmail("");
                setError("");
              }}
              className={`py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                mode === "register"
                  ? "bg-gradient-to-r from-pink-500 to-violet-600 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{isKo ? "새 작곡가 가입" : "Sign Up"}</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === "register" && (
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  {isKo
                    ? "작곡가 닉네임 (Producer Name)"
                    : "Producer Name (Nickname)"}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isKo ? "예: DJ_NEWWAVE" : "e.g., DJ_NEWWAVE"}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-sm text-white focus:outline-none focus:border-pink-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                {isKo ? "이메일" : "Email Address"}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="producer@komposer.kr"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-sm text-white focus:outline-none focus:border-pink-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                {isKo ? "비밀번호" : "Password"}
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-sm text-white focus:outline-none focus:border-pink-500"
              />
            </div>

            {error && (
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-xl p-2.5">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 hover:brightness-110 text-sm font-extrabold text-white flex items-center justify-center gap-2 shadow-lg shadow-pink-500/25 transition"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>
                {mode === "login"
                  ? isKo
                    ? "로그인하기"
                    : "Sign In Now"
                  : isKo
                    ? "가입 및 시작하기"
                    : "Create Producer Account"}
              </span>
            </button>
          </form>

          {/* Quick Demo Switcher */}
          <div className="pt-3 border-t border-white/10">
            <p className="text-[11px] font-bold text-zinc-400 mb-2">
              {isKo
                ? "원클릭 데모 프로듀서 계정 로그인 (SQLite DB 연동)"
                : "1-Click Demo Producer Login (SQLite DB Linked)"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin("producer@komposer.kr")}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-pink-300">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>PRODUCER K</span>
                </div>
                <p className="text-[10px] text-zinc-400 mt-0.5 truncate">
                  {isKo
                    ? "뉴진스·에스파·세븐틴 선호"
                    : "NewJeans · aespa · SEVENTEEN fan"}
                </p>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin("youth@komposer.kr")}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>{isKo ? "청춘사운드" : "YOUTH SOUND"}</span>
                </div>
                <p className="text-[10px] text-zinc-400 mt-0.5 truncate">
                  {isKo
                    ? "데이식스·아이유·BTS 선호"
                    : "DAY6 · IU · BTS fan"}
                </p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
