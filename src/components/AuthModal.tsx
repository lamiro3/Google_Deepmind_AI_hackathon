"use client";

import React, { useState } from "react";
import { Loader2, LogIn, Sparkles, UserCheck, UserPlus, X } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (dashboardData: unknown) => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  onAuthSuccess,
}: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("producer@komposer.kr");
  const [password, setPassword] = useState("komposer123");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

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
        setError(data.error || "로그인에 실패했습니다.");
      } else {
        onAuthSuccess(data);
        onClose();
      }
    } catch {
      setError("서버와 통신 중 오류가 발생했습니다.");
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-white/15 rounded-3xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-pink-400" />
            <h3 className="text-base font-extrabold text-white">
              Komposer 프로듀서 계정
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Mode Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-black/40 border border-white/10">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
              }}
              className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                mode === "login"
                  ? "bg-gradient-to-r from-pink-500 to-violet-600 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>로그인</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setEmail("");
                setError("");
              }}
              className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                mode === "register"
                  ? "bg-gradient-to-r from-pink-500 to-violet-600 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>새 작곡가 가입</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === "register" && (
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  작곡가 닉네임 (Producer Name)
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: DJ_NEWWAVE"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-sm text-white focus:outline-none focus:border-pink-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                이메일
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
                비밀번호
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
              <span>{mode === "login" ? "로그인하기" : "가입 및 시작하기"}</span>
            </button>
          </form>

          {/* Quick Demo Switcher */}
          <div className="pt-3 border-t border-white/10">
            <p className="text-[11px] font-bold text-zinc-400 mb-2">
              원클릭 데모 프로듀서 계정 전환 (SQLite DB 연동)
            </p>
            <div className="grid grid-cols-2 gap-2">
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
                  뉴진스·에스파·세븐틴 선호
                </p>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin("youth@komposer.kr")}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>청춘사운드</span>
                </div>
                <p className="text-[10px] text-zinc-400 mt-0.5 truncate">
                  데이식스·아이유·BTS 선호
                </p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

