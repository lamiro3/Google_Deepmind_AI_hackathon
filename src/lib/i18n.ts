export type Language = "ko" | "en";

/**
 * Detects default language based on user's saved preference or current country/region.
 * Defaults to Korean ("ko") if the user's country/timezone/locale is Korea (Asia/Seoul, ko-KR, -KR),
 * otherwise defaults to English ("en").
 */
export function detectDefaultLanguage(): Language {
  if (typeof window === "undefined") return "ko";

  try {
    const saved = window.localStorage.getItem("komposer_lang");
    if (saved === "ko" || saved === "en") {
      return saved;
    }

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (tz === "Asia/Seoul" || tz === "ROK" || tz.includes("Seoul")) {
      return "ko";
    }

    const langs = navigator.languages?.length
      ? navigator.languages
      : [navigator.language || ""];
    for (const l of langs) {
      const normalized = l.toLowerCase();
      if (
        normalized.startsWith("ko") ||
        normalized.endsWith("-kr") ||
        normalized.endsWith("_kr")
      ) {
        return "ko";
      }
    }

    return "en";
  } catch {
    return "ko";
  }
}

export function translateMatchReason(reason: string, lang: Language): string {
  if (lang === "ko") return reason;
  if (reason.includes("드림 콜라보")) {
    const match = reason.match(/\(([^)]+)\)/);
    return `Dream Collab of Favorite Artists (${match ? match[1] : "K-POP"})`;
  }
  if (reason.includes("선호 아티스트")) {
    const match = reason.match(/'([^']+)'/);
    return `Matches Favorite Artist '${match ? match[1] : "K-POP"}' Style`;
  }
  if (reason.includes("선호 장르")) {
    const match = reason.match(/\(([^)]+)\)/);
    return `Matches Preferred Genre (${match ? match[1] : "K-POP"})`;
  }
  if (reason.includes("인기 급상승")) {
    return "Trending K-POP Style on Komposer";
  }
  return reason;
}

