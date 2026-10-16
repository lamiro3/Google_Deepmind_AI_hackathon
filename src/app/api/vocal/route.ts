import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const execFileAsync = promisify(execFile);
const CACHE_DIR = "/tmp/komposer_vocals_v6";

export interface MemberVocalProfile {
  memberName: string;
  macVoice: string;
  geminiVoice: string;
  rateScale: number;
  /** Formant warp factor: >1.0 brighter/higher vocal tract (e.g. Winter, Hanni, IU), <1.0 deeper/richer vocal tract (e.g. Karina, Felix, V) */
  formantShift: number;
  /** Base MIDI note center for the singer's natural singing register */
  registerCenterMidi: number;
  /** Vibrato depth in semitones on held notes */
  vibratoSemitones: number;
  /** Vibrato speed in Hz */
  vibratoHz: number;
  /** Singing vs Rap style */
  isRapFocused?: boolean;
  /** Harmonic exciter / metallic sheen amount (0..1) */
  brightness: number;
}

function getMemberVocalProfile(
  artistId: string,
  vocalTag: string,
  section: string
): MemberVocalProfile {
  const tag = `${artistId} ${vocalTag}`.toLowerCase();
  const isRapSection = section.includes("RAP");

  // 1. aespa (에스파): 카리나, 윈터, 닝닝, 지젤
  if (tag.includes("윈터") || tag.includes("winter")) {
    return {
      memberName: "윈터 (WINTER)",
      macVoice: "Shelley (한국어(한국))",
      geminiVoice: "Aoede",
      rateScale: 0.94,
      formantShift: 1.08, // Clear, piercing metallic soprano timbre
      registerCenterMidi: 69, // A4
      vibratoSemitones: 0.28,
      vibratoHz: 5.8,
      brightness: 0.85,
    };
  }
  if (tag.includes("닝닝") || tag.includes("ningning")) {
    return {
      memberName: "닝닝 (NINGNING)",
      macVoice: "Sandy (한국어(한국))",
      geminiVoice: "Leda",
      rateScale: 0.92,
      formantShift: 1.03, // Lush, powerful R&B belt timbre
      registerCenterMidi: 68, // G#4
      vibratoSemitones: 0.34,
      vibratoHz: 5.5,
      brightness: 0.78,
    };
  }
  if (tag.includes("지젤") || tag.includes("giselle")) {
    return {
      memberName: "지젤 (GISELLE)",
      macVoice: "Flo (한국어(한국))",
      geminiVoice: "Zephyr",
      rateScale: isRapSection ? 1.08 : 0.98,
      formantShift: 0.98, // Chic rhythmic mid-tone rap/vocal
      registerCenterMidi: 63, // Eb4
      vibratoSemitones: 0.14,
      vibratoHz: 5.2,
      isRapFocused: isRapSection,
      brightness: 0.65,
    };
  }
  if (tag.includes("카리나") || tag.includes("karina") || tag.includes("aespa") || tag.includes("에스파")) {
    return {
      memberName: "카리나 (KARINA)",
      macVoice: "Yuna",
      geminiVoice: "Kore",
      rateScale: isRapSection ? 1.06 : 0.95,
      formantShift: 0.95, // Charismatic, solid mid-low vocal & punchy rap tone
      registerCenterMidi: 64, // E4
      vibratoSemitones: 0.22,
      vibratoHz: 5.4,
      isRapFocused: isRapSection,
      brightness: 0.72,
    };
  }

  // 2. NewJeans (뉴진스): 하니, 해린, 다니엘, 민지, 혜인
  if (tag.includes("하니") || tag.includes("hanni")) {
    return {
      memberName: "하니 (HANNI)",
      macVoice: "Sandy (한국어(한국))",
      geminiVoice: "Aoede",
      rateScale: 0.93,
      formantShift: 1.06, // Sweet, bouncy R&B vocal tone
      registerCenterMidi: 67,
      vibratoSemitones: 0.24,
      vibratoHz: 5.5,
      brightness: 0.75,
    };
  }
  if (tag.includes("다니엘") || tag.includes("danielle")) {
    return {
      memberName: "다니엘 (DANIELLE)",
      macVoice: "Shelley (한국어(한국))",
      geminiVoice: "Leda",
      rateScale: 0.94,
      formantShift: 1.07,
      registerCenterMidi: 68,
      vibratoSemitones: 0.26,
      vibratoHz: 5.6,
      brightness: 0.8,
    };
  }
  if (tag.includes("민지") || tag.includes("minji")) {
    return {
      memberName: "민지 (MINJI)",
      macVoice: "Flo (한국어(한국))",
      geminiVoice: "Kore",
      rateScale: 0.96,
      formantShift: 0.96, // Clean, warm mid-low tone
      registerCenterMidi: 63,
      vibratoSemitones: 0.18,
      vibratoHz: 5.2,
      brightness: 0.62,
    };
  }
  if (tag.includes("해린") || tag.includes("haerin") || tag.includes("혜인") || tag.includes("newjeans") || tag.includes("뉴진스")) {
    return {
      memberName: "해린 (HAERIN)",
      macVoice: "Yuna",
      geminiVoice: "Zephyr",
      rateScale: 0.94,
      formantShift: 1.04, // Dreamy airy Y2K tone
      registerCenterMidi: 66,
      vibratoSemitones: 0.2,
      vibratoHz: 5.4,
      brightness: 0.7,
    };
  }

  // 3. DAY6 (데이식스): 성진, Young K, 원필, 도운
  if (tag.includes("원필") || tag.includes("wonpil")) {
    return {
      memberName: "원필 (WONPIL)",
      macVoice: "Eddy (한국어(한국))",
      geminiVoice: "Puck",
      rateScale: 0.92,
      formantShift: 0.93, // Emotional, high-tenor nasal-sweet rock vocal
      registerCenterMidi: 60, // C4
      vibratoSemitones: 0.3,
      vibratoHz: 5.6,
      brightness: 0.72,
    };
  }
  if (tag.includes("성진") || tag.includes("sungjin")) {
    return {
      memberName: "성진 (SUNGJIN)",
      macVoice: "Rocko (한국어(한국))",
      geminiVoice: "Fenrir",
      rateScale: 0.91,
      formantShift: 0.86, // Raspy, explosive rock main vocal
      registerCenterMidi: 58, // Bb3
      vibratoSemitones: 0.35,
      vibratoHz: 5.8,
      brightness: 0.76,
    };
  }
  if (tag.includes("young k") || tag.includes("영케이") || tag.includes("day6") || tag.includes("데이식스")) {
    return {
      memberName: "영케이 (Young K)",
      macVoice: "Reed (한국어(한국))",
      geminiVoice: "Charon",
      rateScale: isRapSection ? 1.04 : 0.93,
      formantShift: 0.89, // Powerful dynamic baritone-tenor rock vocal & rap
      registerCenterMidi: 59, // B3
      vibratoSemitones: 0.32,
      vibratoHz: 5.5,
      brightness: 0.7,
    };
  }

  // 4. IU (아이유)
  if (tag.includes("iu") || tag.includes("아이유")) {
    return {
      memberName: "아이유 (IU)",
      macVoice: "Shelley (한국어(한국))",
      geminiVoice: "Aoede",
      rateScale: 0.9,
      formantShift: 1.06, // Expressive, airy-yet-powerful lyric soprano
      registerCenterMidi: 68,
      vibratoSemitones: 0.3,
      vibratoHz: 5.5,
      brightness: 0.78,
    };
  }

  // 5. BLACKPINK (블랙핑크): 제니, 로제, 리사, 지수
  if (tag.includes("로제") || tag.includes("rose") || tag.includes("rosé")) {
    return {
      memberName: "로제 (ROSÉ)",
      macVoice: "Shelley (한국어(한국))",
      geminiVoice: "Leda",
      rateScale: 0.92,
      formantShift: 1.07, // Distinctive emotional indie-pop/R&B vocal color
      registerCenterMidi: 67,
      vibratoSemitones: 0.32,
      vibratoHz: 5.7,
      brightness: 0.82,
    };
  }
  if (tag.includes("리사") || tag.includes("lisa")) {
    return {
      memberName: "리사 (LISA)",
      macVoice: "Flo (한국어(한국))",
      geminiVoice: "Zephyr",
      rateScale: 1.07,
      formantShift: 1.01, // Swaggy, razor-sharp hip-hop rap delivery
      registerCenterMidi: 63,
      vibratoSemitones: 0.12,
      vibratoHz: 5.0,
      isRapFocused: true,
      brightness: 0.74,
    };
  }
  if (tag.includes("지수") || tag.includes("jisoo")) {
    return {
      memberName: "지수 (JISOO)",
      macVoice: "Yuna",
      geminiVoice: "Kore",
      rateScale: 0.93,
      formantShift: 0.94, // Husky, deep alluring vocal tone
      registerCenterMidi: 63,
      vibratoSemitones: 0.25,
      vibratoHz: 5.3,
      brightness: 0.64,
    };
  }
  if (tag.includes("제니") || tag.includes("jennie") || tag.includes("blackpink") || tag.includes("블랙핑크")) {
    return {
      memberName: "제니 (JENNIE)",
      macVoice: "Sandy (한국어(한국))",
      geminiVoice: "Kore",
      rateScale: isRapSection ? 1.06 : 0.94,
      formantShift: 0.99, // Fierce, trendy vocal & punchy YG rap
      registerCenterMidi: 65,
      vibratoSemitones: 0.22,
      vibratoHz: 5.4,
      isRapFocused: isRapSection,
      brightness: 0.76,
    };
  }

  // 6. Stray Kids (스트레이 키즈): 필릭스, 창빈, 한, 방찬, 승민, 현진
  if (tag.includes("필릭스") || tag.includes("felix")) {
    return {
      memberName: "필릭스 (FELIX)",
      macVoice: "Rocko (한국어(한국))",
      geminiVoice: "Charon",
      rateScale: 0.98,
      formantShift: 0.78, // Signature ultra-deep cave bass voice!
      registerCenterMidi: 48, // C3
      vibratoSemitones: 0.1,
      vibratoHz: 4.8,
      isRapFocused: true,
      brightness: 0.55,
    };
  }
  if (tag.includes("창빈") || tag.includes("changbin")) {
    return {
      memberName: "창빈 (CHANGBIN)",
      macVoice: "Rocko (한국어(한국))",
      geminiVoice: "Fenrir",
      rateScale: 1.1,
      formantShift: 0.85, // Aggressive scratchy dark rap spearhead
      registerCenterMidi: 54,
      vibratoSemitones: 0.12,
      vibratoHz: 5.2,
      isRapFocused: true,
      brightness: 0.72,
    };
  }
  if (tag.includes("방찬") || tag.includes("한") || tag.includes("승민") || tag.includes("stray") || tag.includes("스키즈")) {
    return {
      memberName: tag.includes("한") ? "한 (HAN)" : "방찬 (BANG CHAN)",
      macVoice: "Eddy (한국어(한국))",
      geminiVoice: "Puck",
      rateScale: isRapSection ? 1.08 : 0.95,
      formantShift: 0.9,
      registerCenterMidi: 58,
      vibratoSemitones: 0.25,
      vibratoHz: 5.5,
      isRapFocused: isRapSection,
      brightness: 0.7,
    };
  }

  // 7. BTS (방탄소년단): 정국, 지민, 뷔, RM, 슈가, 진, 제이홉
  if (tag.includes("지민") || tag.includes("jimin")) {
    return {
      memberName: "지민 (JIMIN)",
      macVoice: "Eddy (한국어(한국))",
      geminiVoice: "Puck",
      rateScale: 0.93,
      formantShift: 0.96, // High, alluring counter-tenor vocal color
      registerCenterMidi: 62,
      vibratoSemitones: 0.28,
      vibratoHz: 5.6,
      brightness: 0.76,
    };
  }
  if (tag.includes("뷔") || tag.includes(" v ") || tag.includes("rm") || tag.includes("슈가") || tag.includes("suga")) {
    return {
      memberName: tag.includes("슈가") || tag.includes("suga") ? "슈가 (SUGA)" : "뷔 (V)",
      macVoice: "Rocko (한국어(한국))",
      geminiVoice: "Charon",
      rateScale: isRapSection ? 1.07 : 0.92,
      formantShift: 0.84, // Soulful deep baritone / rap
      registerCenterMidi: 53,
      vibratoSemitones: 0.26,
      vibratoHz: 5.2,
      isRapFocused: isRapSection,
      brightness: 0.62,
    };
  }
  if (tag.includes("정국") || tag.includes("jungkook") || tag.includes("bts") || tag.includes("방탄")) {
    return {
      memberName: "정국 (JUNGKOOK)",
      macVoice: "Reed (한국어(한국))",
      geminiVoice: "Puck",
      rateScale: 0.94,
      formantShift: 0.91, // Smooth, trendsetting pop-R&B tenor main vocal
      registerCenterMidi: 60,
      vibratoSemitones: 0.28,
      vibratoHz: 5.5,
      brightness: 0.74,
    };
  }

  // 8. SEVENTEEN (세븐틴): 도겸, 승관, 우지, 호시, 에스쿱스, 민규
  if (tag.includes("도겸") || tag.includes("승관") || tag.includes("우지") || tag.includes("호시") || tag.includes("seventeen") || tag.includes("세븐틴")) {
    return {
      memberName: tag.includes("승관") ? "승관 (SEUNGKWAN)" : tag.includes("우지") ? "우지 (WOOZI)" : "도겸 (DK)",
      macVoice: "Eddy (한국어(한국))",
      geminiVoice: "Puck",
      rateScale: isRapSection ? 1.05 : 0.94,
      formantShift: 0.9,
      registerCenterMidi: 59,
      vibratoSemitones: 0.3,
      vibratoHz: 5.6,
      brightness: 0.75,
    };
  }

  // 9. IVE (아이브): 안유진, 장원영, 리즈, 레이
  if (tag.includes("장원영") || tag.includes("wonyoung")) {
    return {
      memberName: "장원영 (WONYOUNG)",
      macVoice: "Sandy (한국어(한국))",
      geminiVoice: "Aoede",
      rateScale: 0.94,
      formantShift: 1.05,
      registerCenterMidi: 66,
      vibratoSemitones: 0.22,
      vibratoHz: 5.4,
      brightness: 0.77,
    };
  }
  if (tag.includes("안유진") || tag.includes("리즈") || tag.includes("ive") || tag.includes("아이브")) {
    return {
      memberName: tag.includes("리즈") ? "리즈 (LIZ)" : "안유진 (YUJIN)",
      macVoice: "Shelley (한국어(한국))",
      geminiVoice: "Leda",
      rateScale: 0.93,
      formantShift: 1.03,
      registerCenterMidi: 67,
      vibratoSemitones: 0.28,
      vibratoHz: 5.5,
      brightness: 0.78,
    };
  }

  // 10. LE SSERAFIM (르세라핌): 김채원, 허윤진, 카즈하
  if (tag.includes("김채원") || tag.includes("허윤진") || tag.includes("카즈하") || tag.includes("lesserafim") || tag.includes("르세라핌")) {
    return {
      memberName: tag.includes("허윤진") ? "허윤진 (YUNJIN)" : "김채원 (CHAEWON)",
      macVoice: "Sandy (한국어(한국))",
      geminiVoice: "Kore",
      rateScale: 0.96,
      formantShift: 1.04,
      registerCenterMidi: 66,
      vibratoSemitones: 0.24,
      vibratoHz: 5.5,
      brightness: 0.74,
    };
  }

  // 11. G-DRAGON & RIIZE
  if (tag.includes("dragon") || tag.includes("지드래곤") || tag.includes("권지용")) {
    return {
      memberName: "G-DRAGON (권지용)",
      macVoice: "Eddy (한국어(한국))",
      geminiVoice: "Puck",
      rateScale: 1.02,
      formantShift: 0.95, // Iconic nasal high-tone swag rap/vocal
      registerCenterMidi: 59,
      vibratoSemitones: 0.2,
      vibratoHz: 5.4,
      isRapFocused: isRapSection,
      brightness: 0.78,
    };
  }
  if (tag.includes("원빈") || tag.includes("소희") || tag.includes("앤톤") || tag.includes("riize") || tag.includes("라이즈")) {
    return {
      memberName: tag.includes("소희") ? "소희 (SOHEE)" : "원빈 (WONBIN)",
      macVoice: "Reed (한국어(한국))",
      geminiVoice: "Puck",
      rateScale: 0.94,
      formantShift: 0.91,
      registerCenterMidi: 59,
      vibratoSemitones: 0.26,
      vibratoHz: 5.5,
      brightness: 0.72,
    };
  }

  return {
    memberName: vocalTag || "Main Vocal",
    macVoice: "Yuna",
    geminiVoice: "Kore",
    rateScale: 0.94,
    formantShift: 1.02,
    registerCenterMidi: 66,
    vibratoSemitones: 0.25,
    vibratoHz: 5.5,
    brightness: 0.74,
  };
}

/**
 * Multi-word English K-POP phrase dictionary -> natural Korean singing pronunciation
 */
const ENGLISH_PHRASE_TO_KOREAN: Array<[RegExp, string]> = [
  [/\bstay\s+in\s+the\s+middle\b/gi, "스테이 인 더 미들"],
  [/\blike\s+you\s+a\s+little\b/gi, "라이크 유 어 리틀"],
  [/\bnext\s+level\b/gi, "넥스트 레벨"],
  [/\blove\s+dive\b/gi, "러브 다이브"],
  [/\bchk\s+chk\s+boom\b/gi, "칙칙붐"],
  [/\bboom\s+boom\s+bass\b/gi, "붐붐 베이스"],
  [/\bget\s+a\s+guitar\b/gi, "겟 어 기타"],
  [/\bra[\s-]*ta[\s-]*ta[\s-]*ta\b/gi, "라타타타"],
  [/\bda[\s-]*ra[\s-]*da[\s-]*ra\b/gi, "다라다라"],
  [/\bla[\s-]*la[\s-]*la\b/gi, "랄랄라"],
  [/\bna[\s-]*na[\s-]*na\b/gi, "나나나"],
  [/\bwoo+[\s-]*ooh+\b/gi, "우우"],
  [/\bwoo+[\s-]*ah+\b/gi, "우아"],
  [/\booh+[\s-]*ah+\b/gi, "우아"],
  [/\bah+[\s-]*oh+\b/gi, "아오"],
  [/\bah+[\s-]*ah+\b/gi, "아아"],
  [/\boh+[\s-]*oh+\b/gi, "오오"],
  [/\boh+[\s-]*ah+\b/gi, "오아"],
  [/\booh+[\s-]*whoa+\b/gi, "우워"],
  [/\booh+[\s-]*ooh+\b/gi, "우우"],
  [/\buh+[\s-]*huh+\b/gi, "어허"],
  [/\bmm+[\s-]*hmm+\b/gi, "음흠"],
  [/\byeah+[\s-]*yeah+\b/gi, "예예"],
  [/\bay+[\s-]*ay+\b/gi, "에이에이"],
  [/\bay+e*\b/gi, "에이"],
  [/\bey+e*\b/gi, "에이"],
  [/\bwoo+h*\b/gi, "우"],
  [/\booh+\b/gi, "우"],
  [/\bwhoa+h*\b/gi, "워"],
  [/\bwoah+\b/gi, "워"],
  [/\byeah+\b/gi, "예"],
  [/\bah+\b/gi, "아"],
  [/\boh+\b/gi, "오"],
  [/\buh+\b/gi, "어"],
  [/\beh+\b/gi, "에"],
  [/\bmm+h*\b/gi, "음"],
  [/\bstep\s+back\b/gi, "스텝 백"],
  [/\bwake\s+up\b/gi, "웨이크 업"],
  [/\blight\s+up\b/gi, "라이트 업"],
  [/\bburn\s+it\s+up\b/gi, "번 잇 업"],
  [/\bgive\s+it\s+to\s+me\b/gi, "기브 잇 투 미"],
  [/\blook\s+at\s+me\b/gi, "룩 앳 미"],
  [/\bfollow\s+me\b/gi, "팔로우 미"],
  [/\bhold\s+on\s+tight\b/gi, "홀드 온 타이트"],
  [/\ball\s+night\s+long\b/gi, "올 나이트 롱"],
  [/\ball\s+night\b/gi, "올 나이트"],
  [/\bmy\s+heart\b/gi, "마이 하트"],
  [/\byour\s+eyes\b/gi, "유어 아이즈"],
  [/\bin\s+my\s+area\b/gi, "인 마이 에어리어"],
  [/\bblack\s+mamba\b/gi, "블랙 맘바"],
  [/\bad\s*lib\b/gi, "애드리브"],
  [/\bk[\s-]*pop\b/gi, "케이팝"],
  [/\bg[\s-]*dragon\b/gi, "지드래곤"],
];

/**
 * Comprehensive single-word English dictionary -> natural Korean pronunciation
 * Prevents macOS Korean TTS from spelling English words letter-by-letter (e.g., "candy" -> "캔디" instead of "씨 에이 엔 디 와이")
 */
const ENGLISH_WORD_TO_KOREAN: Record<string, string> = {
  a: "어",
  about: "어바웃",
  above: "어보브",
  action: "액션",
  addicted: "어딕티드",
  after: "애프터",
  again: "어게인",
  air: "에어",
  alive: "얼라이브",
  all: "올",
  alone: "얼론",
  always: "올웨이즈",
  am: "앰",
  an: "언",
  and: "앤드",
  angel: "엔젤",
  another: "어나더",
  answer: "앤서",
  any: "애니",
  anything: "애니씽",
  are: "아",
  area: "에어리어",
  around: "어라운드",
  as: "애즈",
  at: "앳",
  attention: "어텐션",
  attitude: "애티튜드",
  aura: "아우라",
  away: "어웨이",
  aye: "아이",
  babe: "베이비",
  baby: "베이비",
  back: "백",
  bad: "배드",
  baddie: "배디",
  bag: "백",
  bang: "뱅",
  bass: "베이스",
  be: "비",
  beat: "비트",
  beautiful: "뷰티풀",
  because: "비코즈",
  been: "빈",
  before: "비포",
  begin: "비긴",
  behind: "비하인드",
  believe: "빌리브",
  best: "베스트",
  better: "베터",
  between: "비트윈",
  beyond: "비욘드",
  big: "빅",
  bite: "바이트",
  black: "블랙",
  blackpink: "블랙핑크",
  blaze: "블레이즈",
  blind: "블라인드",
  blink: "블링크",
  blood: "블러드",
  bloom: "블룸",
  blow: "블로우",
  blue: "블루",
  body: "바디",
  bomb: "밤",
  boom: "붐",
  born: "본",
  boss: "보스",
  bounce: "바운스",
  boy: "보이",
  boys: "보이즈",
  break: "브레이크",
  breath: "브레스",
  breathe: "브리드",
  bridge: "브릿지",
  bright: "브라이트",
  bring: "브링",
  broken: "브로큰",
  bubble: "버블",
  burn: "번",
  burning: "버닝",
  butter: "버터",
  butterfly: "버터플라이",
  by: "바이",
  bye: "바이",
  call: "콜",
  calling: "콜링",
  can: "캔",
  candy: "캔디",
  cant: "캔트",
  care: "케어",
  catch: "캐치",
  cause: "커즈",
  center: "센터",
  chance: "찬스",
  change: "체인지",
  chaos: "카오스",
  chase: "체이스",
  check: "체크",
  chemistry: "케미스트리",
  cherry: "체리",
  chill: "칠",
  chk: "칙",
  choice: "초이스",
  chorus: "코러스",
  chromakopia: "크로마코피아",
  city: "시티",
  clap: "클랩",
  classy: "클래시",
  clean: "클린",
  clear: "클리어",
  click: "클릭",
  clock: "클락",
  close: "클로즈",
  closer: "클로저",
  cloud: "클라우드",
  club: "클럽",
  code: "코드",
  cold: "콜드",
  color: "컬러",
  colors: "컬러즈",
  come: "컴",
  coming: "커밍",
  control: "컨트롤",
  cookie: "쿠키",
  cool: "쿨",
  core: "코어",
  cosmic: "코스믹",
  count: "카운트",
  crash: "크래시",
  crazy: "크레이지",
  cream: "크림",
  crown: "크라운",
  crush: "크러쉬",
  cry: "크라이",
  crystal: "크리스탈",
  cupid: "큐피드",
  cute: "큐트",
  cyber: "사이버",
  da: "다",
  dance: "댄스",
  dancing: "댄싱",
  danger: "데인저",
  dangerous: "데인저러스",
  dark: "다크",
  darling: "달링",
  day: "데이",
  days: "데이즈",
  daydream: "데이드림",
  dazzle: "대즐",
  de: "디",
  dead: "데드",
  deep: "딥",
  deeper: "디퍼",
  deja: "데자",
  destiny: "데스티니",
  diamond: "다이아몬드",
  diamonds: "다이아몬즈",
  die: "다이",
  different: "디프런트",
  digital: "디지털",
  disco: "디스코",
  ditto: "디토",
  dive: "다이브",
  dizzy: "디지",
  dj: "디제이",
  do: "두",
  dont: "돈트",
  door: "도어",
  double: "더블",
  down: "다운",
  drama: "드라마",
  dream: "드림",
  dreaming: "드리밍",
  dreams: "드림즈",
  dress: "드레스",
  drift: "드리프트",
  drink: "드링크",
  rip: "드립",
  drive: "드라이브",
  drop: "드롭",
  drum: "드럼",
  dust: "더스트",
  dynamite: "다이너마이트",
  each: "이치",
  early: "얼리",
  earth: "어스",
  easy: "이지",
  echo: "에코",
  edge: "엣지",
  electric: "일렉트릭",
  eleven: "일레븐",
  emotion: "이모션",
  em: "엠",
  empty: "엠프티",
  end: "엔드",
  endless: "엔드리스",
  energy: "에너지",
  enough: "이너프",
  enter: "엔터",
  era: "에라",
  escape: "이스케이프",
  eternal: "이터널",
  eternity: "이터니티",
  euphoria: "유포리아",
  even: "이븐",
  ever: "에버",
  every: "에브리",
  everybody: "에브리바디",
  everyday: "에브리데이",
  everyone: "에브리원",
  everything: "에브리씽",
  everywhere: "에브리웨어",
  eye: "아이",
  eyes: "아이즈",
  face: "페이스",
  fade: "페이드",
  fall: "폴",
  falling: "폴링",
  fake: "페이크",
  fancy: "팬시",
  fantasy: "판타지",
  far: "파",
  fast: "패스트",
  faster: "패스터",
  fate: "페이트",
  fear: "피어",
  fearless: "피어리스",
  feel: "필",
  feeling: "필링",
  feelings: "필링스",
  fever: "피버",
  fight: "파이트",
  fill: "필",
  final: "파이널",
  finally: "파이널리",
  find: "파인드",
  fine: "파인",
  fire: "파이어",
  firework: "파이어워크",
  first: "퍼스트",
  flame: "플레임",
  flash: "플래시",
  flex: "플렉스",
  flight: "플라이트",
  flip: "플립",
  float: "플로트",
  floor: "플로어",
  flow: "플로우",
  flower: "플라워",
  fly: "플라이",
  flying: "플라잉",
  focus: "포커스",
  follow: "팔로우",
  fool: "풀",
  for: "포",
  forever: "포에버",
  forget: "포겟",
  free: "프리",
  freedom: "프리덤",
  freeze: "프리즈",
  fresh: "프레시",
  friend: "프렌드",
  friends: "프렌즈",
  from: "프롬",
  front: "프론트",
  full: "풀",
  fun: "펀",
  funk: "펑크",
  funky: "펑키",
  future: "퓨처",
  galaxy: "갤럭시",
  game: "게임",
  gasoline: "가솔린",
  get: "겟",
  ghost: "고스트",
  girl: "걸",
  girls: "걸스",
  give: "기브",
  glam: "글램",
  glass: "글래스",
  glitter: "글리터",
  glitch: "글리치",
  glow: "글로우",
  glowing: "글로잉",
  go: "고",
  going: "고잉",
  god: "갓",
  gold: "골드",
  golden: "골든",
  gone: "곤",
  gonna: "거너",
  good: "굿",
  goodbye: "굿바이",
  got: "갓",
  gotta: "가타",
  grace: "그레이스",
  gravity: "그래비티",
  green: "그린",
  groove: "그루브",
  ground: "그라운드",
  grow: "그로우",
  guess: "게스",
  guitar: "기타",
  ha: "하",
  halo: "헤일로",
  hand: "핸드",
  hands: "핸즈",
  happen: "해픈",
  happy: "해피",
  hard: "하드",
  harder: "하더",
  harmony: "하모니",
  hate: "헤이트",
  have: "해브",
  haze: "헤이즈",
  he: "히",
  head: "헤드",
  hear: "히어",
  heart: "하트",
  heartbeat: "하트비트",
  hearts: "하츠",
  heat: "히트",
  heaven: "헤븐",
  heavy: "헤비",
  hello: "헬로",
  help: "헬프",
  her: "허",
  here: "히어",
  hero: "히어로",
  hey: "헤이",
  hi: "하이",
  hide: "하이드",
  high: "하이",
  higher: "하이어",
  highway: "하이웨이",
  him: "힘",
  hit: "히트",
  hold: "홀드",
  holding: "홀딩",
  holo: "홀로",
  home: "홈",
  honey: "허니",
  hook: "훅",
  hope: "호프",
  horizon: "호라이즌",
  hot: "핫",
  hour: "아워",
  house: "하우스",
  how: "하우",
  hug: "허그",
  hush: "허쉬",
  hype: "하입",
  hyper: "하이퍼",
  hypnotic: "힙노틱",
  i: "아이",
  ice: "아이스",
  icy: "아이시",
  icon: "아이콘",
  iconic: "아이코닉",
  if: "이프",
  ill: "아일",
  illusion: "일루전",
  im: "아임",
  imagine: "이매진",
  in: "인",
  infinity: "인피니티",
  inside: "인사이드",
  into: "인투",
  intro: "인트로",
  is: "이즈",
  island: "아일랜드",
  it: "잇",
  its: "잇츠",
  ive: "아이브",
  jam: "잼",
  jazz: "재즈",
  jealous: "젤러스",
  jelly: "젤리",
  jet: "제트",
  jewel: "주얼",
  joy: "조이",
  juice: "주스",
  jump: "점프",
  jungkook: "정국",
  just: "저스트",
  karina: "카리나",
  keep: "킵",
  key: "키",
  kick: "킥",
  kid: "키드",
  kill: "킬",
  killa: "킬라",
  kind: "카인드",
  king: "킹",
  kiss: "키스",
  knock: "노크",
  know: "노우",
  kpop: "케이팝",
  kwangya: "광야",
  la: "라",
  lady: "레이디",
  land: "랜드",
  last: "라스트",
  late: "레이트",
  later: "레이터",
  laugh: "래프",
  lead: "리드",
  leave: "리브",
  left: "레프트",
  legend: "레전드",
  lemon: "레몬",
  let: "렛",
  lets: "렛츠",
  level: "레벨",
  liar: "라이어",
  lie: "라이",
  lies: "라이즈",
  life: "라이프",
  lift: "리프트",
  light: "라이트",
  lights: "라이츠",
  like: "라이크",
  lilac: "라일락",
  limit: "리밋",
  line: "라인",
  lip: "립",
  lips: "립스",
  listen: "리슨",
  little: "리틀",
  live: "라이브",
  living: "리빙",
  lock: "락",
  lonely: "론리",
  long: "롱",
  look: "룩",
  looking: "루킹",
  loop: "루프",
  lose: "루즈",
  lost: "로스트",
  loud: "라우드",
  louder: "라우더",
  love: "러브",
  lover: "러버",
  loving: "러빙",
  low: "로우",
  luck: "럭",
  lucky: "럭키",
  lunar: "루나",
  luv: "러브",
  luxury: "럭셔리",
  mad: "매드",
  made: "메이드",
  magic: "매직",
  magnetic: "마그네틱",
  main: "메인",
  make: "메이크",
  making: "메이킹",
  mamba: "맘바",
  man: "맨",
  maniac: "매니악",
  many: "매니",
  master: "마스터",
  match: "매치",
  matrix: "매트릭스",
  matter: "매터",
  max: "맥스",
  may: "메이",
  maybe: "메이비",
  maze: "메이즈",
  me: "미",
  mean: "민",
  meet: "미트",
  melody: "멜로디",
  melt: "멜트",
  melting: "멜팅",
  memory: "메모리",
  memories: "메모리즈",
  mess: "메스",
  metal: "메탈",
  metallic: "메탈릭",
  mi: "미",
  mic: "마이크",
  mid: "미드",
  middle: "미들",
  midnight: "미드나잇",
  might: "마이트",
  mile: "마일",
  miles: "마일즈",
  milk: "밀크",
  million: "밀리언",
  mind: "마인드",
  mine: "마인",
  minute: "미닛",
  miracle: "미라클",
  mirror: "미러",
  miss: "미스",
  missing: "미싱",
  mist: "미스트",
  mix: "믹스",
  mmm: "음",
  mode: "모드",
  moment: "모먼트",
  money: "머니",
  monster: "몬스터",
  mood: "무드",
  moon: "문",
  moonlight: "문라이트",
  more: "모어",
  morning: "모닝",
  most: "모스트",
  motion: "모션",
  move: "무브",
  moves: "무브즈",
  movie: "무비",
  moving: "무빙",
  much: "머치",
  music: "뮤직",
  must: "머스트",
  my: "마이",
  myself: "마이셀프",
  mystery: "미스터리",
  myth: "미스",
  na: "나",
  name: "네임",
  natural: "내추럴",
  near: "니어",
  need: "니드",
  neon: "네온",
  nervous: "너버스",
  never: "네버",
  new: "뉴",
  newjeans: "뉴진스",
  next: "넥스트",
  nice: "나이스",
  night: "나이트",
  nights: "나이츠",
  nine: "나인",
  ningning: "닝닝",
  no: "노",
  nobody: "노바디",
  noise: "노이즈",
  nonstop: "논스톱",
  normal: "노멀",
  not: "낫",
  note: "노트",
  nothing: "낫띵",
  nova: "노바",
  now: "나우",
  nowhere: "노웨어",
  number: "넘버",
  ocean: "오션",
  of: "오브",
  off: "오프",
  oh: "오",
  ok: "오케이",
  okay: "오케이",
  old: "올드",
  omg: "오엠지",
  on: "온",
  once: "원스",
  one: "원",
  only: "온리",
  ooh: "우",
  open: "오픈",
  or: "오어",
  orbit: "오빗",
  original: "오리지널",
  other: "아더",
  our: "아워",
  out: "아웃",
  outro: "아웃트로",
  outside: "아웃사이드",
  over: "오버",
  overdrive: "오버드라이브",
  own: "온",
  oxygen: "옥시전",
  pace: "페이스",
  page: "페이지",
  pain: "페인",
  paint: "페인트",
  palace: "팰리스",
  panic: "패닉",
  paradise: "파라다이스",
  part: "파트",
  party: "파티",
  pass: "패스",
  passion: "패션",
  past: "패스트",
  path: "패스",
  peace: "피스",
  peach: "피치",
  peak: "피크",
  pearl: "펄",
  peaches: "피치스",
  pedal: "페달",
  people: "피플",
  perfect: "퍼펙트",
  perfume: "퍼퓸",
  phantom: "팬텀",
  phase: "페이즈",
  phone: "폰",
  photo: "포토",
  pick: "픽",
  picture: "픽처",
  piece: "피스",
  pink: "핑크",
  place: "플레이스",
  plan: "플랜",
  planet: "플래닛",
  play: "플레이",
  player: "플레이어",
  playing: "플레잉",
  please: "플리즈",
  plus: "플러스",
  pocket: "포켓",
  point: "포인트",
  poison: "포이즌",
  pop: "팝",
  popping: "파핑",
  portal: "포털",
  pose: "포즈",
  power: "파워",
  pray: "프레이",
  precious: "프레셔스",
  pretty: "프리티",
  price: "프라이스",
  pride: "프라이드",
  princess: "프린세스",
  prism: "프리즘",
  promise: "프라미스",
  proud: "프라우드",
  prove: "프루브",
  psycho: "사이코",
  pull: "풀",
  pulse: "펄스",
  pump: "펌프",
  pure: "퓨어",
  purple: "퍼플",
  push: "푸쉬",
  put: "풋",
  puzzle: "퍼즐",
  queen: "퀸",
  queencard: "퀸카",
  question: "퀘스천",
  quick: "퀵",
  quiet: "콰이어트",
  ra: "라",
  race: "레이스",
  radar: "레이더",
  radio: "라디오",
  rain: "레인",
  rainbow: "레인보우",
  raise: "레이즈",
  rap: "랩",
  raw: "로우",
  ray: "레이",
  reach: "리치",
  ready: "레디",
  real: "리얼",
  reality: "리얼리티",
  really: "리얼리",
  reason: "리즌",
  rebel: "레벨",
  record: "레코드",
  red: "레드",
  reflection: "리플렉션",
  remember: "리멤버",
  remix: "리믹스",
  repeat: "리피트",
  reset: "리셋",
  rest: "레스트",
  return: "리턴",
  rewind: "리와인드",
  rhythm: "리듬",
  rich: "리치",
  ride: "라이드",
  riding: "라이딩",
  right: "라이트",
  ring: "링",
  rise: "라이즈",
  rising: "라이징",
  risk: "리스크",
  river: "리버",
  road: "로드",
  roar: "로어",
  rock: "락",
  rocket: "로켓",
  roll: "롤",
  rolling: "롤링",
  romance: "로맨스",
  romantic: "로맨틱",
  room: "룸",
  rose: "로즈",
  roses: "로지즈",
  rough: "러프",
  round: "라운드",
  royal: "로얄",
  ruby: "루비",
  rule: "룰",
  rules: "룰즈",
  run: "런",
  runaway: "런어웨이",
  running: "러닝",
  rush: "러쉬",
  sad: "새드",
  safe: "세이프",
  said: "세드",
  sail: "세일",
  same: "세임",
  sand: "샌드",
  savage: "새비지",
  save: "세이브",
  say: "세이",
  saying: "세잉",
  scar: "스카",
  scene: "씬",
  scent: "센트",
  school: "스쿨",
  scream: "스크림",
  screen: "스크린",
  sea: "씨",
  search: "서치",
  season: "시즌",
  seat: "시트",
  second: "세컨드",
  secret: "시크릿",
  see: "씨",
  seeing: "씨잉",
  seek: "시크",
  seem: "심",
  seen: "씬",
  self: "셀프",
  send: "센드",
  sense: "센스",
  set: "셋",
  seven: "세븐",
  shadow: "섀도우",
  shadows: "섀도우즈",
  shake: "쉐이크",
  shining: "샤이닝",
  shape: "쉐이프",
  share: "쉐어",
  sharp: "샤프",
  she: "쉬",
  shield: "쉴드",
  shift: "시프트",
  shine: "샤인",
  shiny: "샤이니",
  ship: "쉽",
  shock: "쇼크",
  shoot: "슛",
  shooting: "슈팅",
  short: "쇼트",
  shot: "샷",
  should: "슈드",
  shout: "샤우트",
  show: "쇼",
  shower: "샤워",
  shut: "셧",
  shy: "샤이",
  side: "사이드",
  sigh: "사이",
  sight: "사이트",
  sign: "사인",
  signal: "시그널",
  silence: "사일런스",
  silent: "사일런트",
  silk: "실크",
  silver: "실버",
  simple: "심플",
  since: "신스",
  sing: "싱",
  singing: "싱잉",
  single: "싱글",
  siren: "사이렌",
  sit: "싯",
  six: "식스",
  sky: "스카이",
  slam: "슬램",
  sleep: "슬립",
  sleeping: "슬리핑",
  slide: "슬라이드",
  slow: "슬로우",
  slowly: "슬로우리",
  small: "스몰",
  smart: "스마트",
  smash: "스매시",
  smile: "스마일",
  smoke: "스모크",
  smooth: "스무드",
  snap: "스냅",
  snow: "스노우",
  so: "소",
  soft: "소프트",
  solar: "솔라",
  solo: "솔로",
  some: "썸",
  somebody: "썸바디",
  someone: "썸원",
  something: "썸씽",
  sometimes: "썸타임즈",
  somewhere: "썸웨어",
  song: "송",
  soon: "순",
  sorry: "쏘리",
  soul: "소울",
  sound: "사운드",
  sour: "사워",
  space: "스페이스",
  spark: "스파크",
  sparkle: "스파클",
  speak: "스피크",
  special: "스페셜",
  speed: "스피드",
  spell: "스펠",
  spend: "스펜드",
  spice: "스파이스",
  spicy: "스파이시",
  spin: "스핀",
  spirit: "스피릿",
  Splash: "스플래시",
  splash: "스플래시",
  spot: "스팟",
  spotlight: "스포트라이트",
  spread: "스프레드",
  spring: "스프링",
  stage: "스테이지",
  stand: "스탠드",
  standing: "스탠딩",
  star: "스타",
  stardust: "스타더스트",
  starlight: "스타라이트",
  stars: "스타즈",
  start: "스타트",
  stay: "스테이",
  steal: "스틸",
  step: "스텝",
  stereo: "스테레오",
  stick: "스틱",
  still: "스틸",
  stone: "스톤",
  stop: "스톱",
  storm: "스톰",
  story: "스토리",
  straight: "스트레이트",
  strange: "스트레인지",
  stranger: "스트레인저",
  street: "스트리트",
  strike: "스트라이크",
  strong: "스트롱",
  stronger: "스트롱거",
  studio: "스튜디오",
  style: "스타일",
  sugar: "슈가",
  summer: "썸머",
  sun: "썬",
  sunlight: "썬라이트",
  sunrise: "썬라이즈",
  sunset: "썬셋",
  sunshine: "썬샤인",
  super: "슈퍼",
  supernova: "슈퍼노바",
  supershy: "슈퍼샤이",
  sure: "슈어",
  surf: "서프",
  surprise: "서프라이즈",
  survive: "서바이브",
  swag: "스웩",
  sway: "스웨이",
  sweet: "스위트",
  sweeter: "스위터",
  swim: "스윔",
  swing: "스윙",
  switch: "스위치",
  symphony: "심포니",
  sync: "싱크",
  syndrome: "신드롬",
  system: "시스템",
  ta: "타",
  table: "테이블",
  tag: "태그",
  take: "테이크",
  taking: "테이킹",
  talk: "토크",
  talking: "토킹",
  tall: "톨",
  taste: "테이스트",
  tasty: "테이스티",
  tea: "티",
  tear: "티어",
  tears: "티어즈",
  tease: "티즈",
  tell: "텔",
  tempo: "템포",
  ten: "텐",
  tension: "텐션",
  test: "테스트",
  than: "댄",
  thank: "땡크",
  thanks: "땡스",
  that: "댓",
  thats: "댓츠",
  the: "더",
  their: "데어",
  them: "뎀",
  then: "덴",
  there: "데어",
  these: "디즈",
  they: "데이",
  thick: "씩",
  thing: "씽",
  things: "씽즈",
  think: "씽크",
  thinking: "씽킹",
  this: "디스",
  those: "도즈",
  though: "도우",
  thought: "쏘트",
  thousand: "싸우전드",
  three: "쓰리",
  thrill: "쓰릴",
  through: "쓰루",
  throw: "쓰로우",
  thunder: "썬더",
  ti: "티",
  tick: "틱",
  ticket: "티켓",
  tide: "타이드",
  tie: "타이",
  tight: "타이트",
  till: "틸",
  time: "타임",
  timer: "타이머",
  times: "타임즈",
  tiny: "타이니",
  tip: "팁",
  tired: "타이어드",
  to: "투",
  today: "투데이",
  together: "투게더",
  tokyo: "도쿄",
  told: "톨드",
  tomorrow: "투모로우",
  tone: "톤",
  tongue: "텅",
  tonight: "투나잇",
  too: "투",
  took: "툭",
  top: "탑",
  toxic: "톡식",
  touch: "터치",
  tough: "터프",
  town: "타운",
  toy: "토이",
  track: "트랙",
  train: "트레인",
  trap: "트랩",
  treasure: "트레저",
  treat: "트리트",
  tree: "트리",
  trend: "트렌드",
  trick: "트릭",
  trigger: "트리거",
  trip: "트립",
  trouble: "트러블",
  true: "트루",
  vet: "벳",
  trust: "트러스트",
  truth: "트루스",
  try: "트라이",
  trying: "트라잉",
  tune: "튠",
  tunnel: "터널",
  turn: "턴",
  turning: "터닝",
  twilight: "트와일라잇",
  twin: "트윈",
  twinkle: "트윙클",
  twist: "트위스트",
  two: "투",
  type: "타입",
  u: "유",
  uh: "어",
  ultra: "울트라",
  umbrella: "엄브렐라",
  un: "언",
  under: "언더",
  underwater: "언더워터",
  universe: "유니버스",
  unknown: "언노운",
  unstoppable: "언스토퍼블",
  until: "언틸",
  up: "업",
  upon: "어폰",
  us: "어스",
  use: "유즈",
  used: "유즈드",
  v: "뷔",
  vanilla: "바닐라",
  velvet: "벨벳",
  venom: "베놈",
  venus: "비너스",
  verse: "벌스",
  version: "버전",
  very: "베리",
  vibe: "바이브",
  vibes: "바이브즈",
  victory: "빅토리",
  video: "비디오",
  view: "뷰",
  villain: "빌런",
  vintage: "빈티지",
  violet: "바이올렛",
  vip: "브이아이피",
  virtual: "버추얼",
  vision: "비전",
  vivid: "비비드",
  vocal: "보컬",
  voice: "보이스",
  voices: "보이시즈",
  volume: "볼륨",
  vortex: "보텍스",
  voyage: "보야지",
  vu: "뷰",
  wait: "웨이트",
  waiting: "웨이팅",
  wake: "웨이크",
  walk: "워크",
  walking: "워킹",
  wall: "월",
  wanna: "워너",
  want: "원트",
  wanted: "원티드",
  war: "워",
  warm: "웜",
  warn: "원",
  warning: "워닝",
  was: "워즈",
  watch: "워치",
  watching: "워칭",
  water: "워터",
  wave: "웨이브",
  waves: "웨이브즈",
  way: "웨이",
  ways: "웨이즈",
  we: "위",
  weak: "위크",
  wear: "웨어",
  weather: "웨더",
  week: "위크",
  weekend: "위켄드",
  weight: "웨이트",
  welcome: "웰컴",
  well: "웰",
  went: "웬트",
  were: "워",
  west: "웨스트",
  wet: "웻",
  what: "왓",
  whatever: "왓에버",
  whats: "왓츠",
  when: "웬",
  whenever: "웬에버",
  where: "웨어",
  wherever: "웨어에버",
  which: "위치",
  while: "와일",
  whiplash: "위플래시",
  whisper: "위스퍼",
  whistle: "휘슬",
  white: "화이트",
  who: "후",
  whoa: "워",
  whole: "홀",
  why: "와이",
  wicked: "위키드",
  wide: "와이드",
  wild: "와일드",
  will: "윌",
  win: "윈",
  wind: "윈드",
  window: "윈도우",
  wing: "윙",
  wings: "윙즈",
  winner: "위너",
  winter: "윈터",
  wish: "위시",
  with: "위드",
  within: "위딘",
  without: "위드아웃",
  woah: "워",
  woke: "워크",
  wolf: "울프",
  woman: "우먼",
  wonder: "원더",
  wonderland: "원더랜드",
  wont: "원트",
  woo: "우",
  word: "워드",
  words: "워즈",
  work: "워크",
  world: "월드",
  worry: "워리",
  worse: "워스",
  worth: "워스",
  would: "우드",
  wow: "와우",
  wrap: "랩",
  write: "라이트",
  wrong: "롱",
  ya: "야",
  yeah: "예",
  year: "이어",
  years: "이어즈",
  yellow: "옐로우",
  yes: "예스",
  yesterday: "예스터데이",
  yet: "옛",
  yo: "요",
  you: "유",
  young: "영",
  your: "유어",
  youre: "유어",
  yours: "유어즈",
  yourself: "유어셀프",
  youth: "유스",
  yujin: "유진",
  zero: "제로",
  zimzalabim: "짐살라빔",
  zone: "존",
  zoom: "줌",
};

/**
 * Fallback Grapheme-to-Hangul Phoneme (G2P) converter for any out-of-vocabulary English word.
 * Ensures that NO raw Latin letters [a-zA-Z] are ever sent to macOS Korean TTS,
 * preventing letter-by-letter spelling (like C-A-N-D-Y).
 */
function englishWordToHangulFallback(rawWord: string): string {
  const lower = rawWord.toLowerCase().replace(/[^a-z]/g, "");
  if (!lower) return "";

  const direct = ENGLISH_WORD_TO_KOREAN[lower];
  if (direct) return direct;

  // Handle common suffixes first if root is in dictionary
  if (lower.endsWith("ing") && lower.length > 4) {
    const stem = lower.slice(0, -3);
    if (ENGLISH_WORD_TO_KOREAN[stem]) return `${ENGLISH_WORD_TO_KOREAN[stem]}잉`;
    if (ENGLISH_WORD_TO_KOREAN[stem + "e"]) return `${ENGLISH_WORD_TO_KOREAN[stem + "e"]}잉`;
  }
  if (lower.endsWith("s") && lower.length > 3) {
    const stem = lower.slice(0, -1);
    if (ENGLISH_WORD_TO_KOREAN[stem]) return `${ENGLISH_WORD_TO_KOREAN[stem]}즈`;
  }
  if (lower.endsWith("ed") && lower.length > 4) {
    const stem = lower.slice(0, -2);
    if (ENGLISH_WORD_TO_KOREAN[stem]) return `${ENGLISH_WORD_TO_KOREAN[stem]}드`;
  }
  if (lower.endsWith("er") && lower.length > 4) {
    const stem = lower.slice(0, -2);
    if (ENGLISH_WORD_TO_KOREAN[stem]) return `${ENGLISH_WORD_TO_KOREAN[stem]}어`;
  }

  // Rule-based syllable replacement for arbitrary English words
  let w = lower
    .replace(/tion/g, "션")
    .replace(/sion/g, "전")
    .replace(/ture/g, "처")
    .replace(/ight/g, "아이트")
    .replace(/ough/g, "오")
    .replace(/ph/g, "f")
    .replace(/sh/g, "쉬")
    .replace(/ch/g, "치")
    .replace(/th/g, "스")
    .replace(/ck/g, "크")
    .replace(/qu/g, "쿠")
    .replace(/wh/g, "w")
    .replace(/oo+/g, "u")
    .replace(/ee+/g, "i")
    .replace(/ea/g, "i")
    .replace(/ai/g, "에이")
    .replace(/ay+e*/g, "에이")
    .replace(/ey+e*/g, "에이")
    .replace(/oa/g, "오")
    .replace(/ou/g, "아우")
    .replace(/ow/g, "오우")
    .replace(/au/g, "오")
    .replace(/aw/g, "오")
    .replace(/ew/g, "유")
    .replace(/oi/g, "오이")
    .replace(/oy/g, "오이")
    // Strip silent 'h' after vowels (so ah, oh, uh, eh, ooh, yeah, woah never end with "흐")
    .replace(/([aeiouy])h+/g, "$1")
    // Collapse stretched vowels (e.g., aaaa -> a, oooo -> o, uuuu -> u)
    .replace(/([aeiouy])\1+/g, "$1");

  // Consonant + vowel pair mapping into single Hangul syllables
  const onsetMap: Record<string, number> = {
    g: 0, kk: 1, n: 2, d: 3, tt: 4, r: 5, l: 5, m: 6, b: 7, pp: 8,
    s: 9, ss: 10, j: 12, jj: 13, c: 14, k: 15, q: 15, t: 16, p: 17, f: 17, h: 18,
    v: 7, z: 12, w: 11, y: 11, x: 9,
  };
  const vowelMap: Record<string, number> = {
    a: 0,   // ㅏ
    e: 4,   // ㅓ/ㅔ -> 5 is ㅔ
    i: 20,  // ㅣ
    o: 8,   // ㅗ
    u: 13,  // ㅜ
    y: 20,  // ㅣ
  };
  const soloConsonantHangul: Record<string, string> = {
    b: "브", c: "크", d: "드", f: "프", g: "그", h: "흐", j: "즈",
    k: "크", l: "을", m: "음", n: "은", p: "프", q: "크", r: "르",
    s: "스", t: "트", v: "브", w: "우", x: "스", y: "이", z: "즈",
  };
  const soloVowelHangul: Record<string, string> = {
    a: "아", e: "에", i: "이", o: "오", u: "우", y: "이",
  };

  let out = "";
  let i = 0;
  while (i < w.length) {
    const ch = w[i];
    // Already converted Hangul character
    if (/[가-힣]/.test(ch)) {
      out += ch;
      i++;
      continue;
    }
    const next = w[i + 1] || "";
    const isVowel = (c: string) => c === "a" || c === "e" || c === "i" || c === "o" || c === "u" || c === "y";

    if (!isVowel(ch) && isVowel(next)) {
      // Combine consonant + vowel into Hangul block
      const cho = onsetMap[ch] ?? 11;
      const jung = ch === "w" && next === "a" ? 9 : next === "e" ? 5 : next === "a" ? 1 : (vowelMap[next] ?? 18);
      const code = 0xac00 + (cho * 21 + jung) * 28;
      out += String.fromCharCode(code);
      i += 2;
    } else if (isVowel(ch)) {
      out += soloVowelHangul[ch] || "아";
      i++;
    } else {
      // Skip duplicate twin consonants (e.g., "ll", "tt", "nd" -> keep natural)
      if (next === ch) {
        i++;
        continue;
      }
      out += soloConsonantHangul[ch] || "";
      i++;
    }
  }

  return out || "아";
}

function convertEnglishToKoreanPhonetics(input: string): string {
  let result = input;

  // 1. Replace multi-word English phrases first
  for (const [pattern, replacement] of ENGLISH_PHRASE_TO_KOREAN) {
    result = result.replace(pattern, replacement);
  }

  // 2. Strip apostrophes inside contractions (e.g., I'm -> Im, don't -> dont, can't -> cant)
  result = result.replace(/([A-Za-z])['’]([A-Za-z])/g, "$1$2");

  // 3. Replace all remaining English words with their Korean phonetic pronunciation
  result = result.replace(/[A-Za-z]+/g, (word) => {
    return englishWordToHangulFallback(word);
  });

  return result;
}

function cleanLyricForSinging(text: string): string {
  const preCleaned = text
    .replace(/\[.*?\]/g, " ")
    .replace(/[()]/g, " ")
    .replace(/×/g, " ");

  const phoneticKorean = convertEnglishToKoreanPhonetics(preCleaned);

  return phoneticKorean
    .replace(/[-_~]/g, " ")
    .replace(/[,!.?…:;'"“”‘’]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Optional Gemini 2.5 Native Audio TTS synthesis when GEMINI_API_KEY is available.
 * Returns raw mono Float32 samples at 24000Hz if successful, or null to use local engine.
 */
async function tryGeminiNeuralVoice(
  text: string,
  profile: MemberVocalProfile,
  section: string,
  apiKey?: string
): Promise<{ samples: Float32Array; sampleRate: number } | null> {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) return null;

  try {
    const styleInstruction = profile.isRapFocused
      ? `Perform this K-POP rap line rhythmically and charismatically like ${profile.memberName}: ${text}`
      : `Sing this K-POP ${section} lyric expressively with sustained vowels and emotion like ${profile.memberName}: ${text}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: styleInstruction }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: profile.geminiVoice,
                },
              },
            },
          },
        }),
        signal: AbortSignal.timeout(7000),
      }
    );

    if (!res.ok) return null;
    const data = await res.json();
    const inlineData = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (!inlineData?.data) return null;

    const pcmBuf = Buffer.from(inlineData.data, "base64");
    const sampleCount = Math.floor(pcmBuf.length / 2);
    const samples = new Float32Array(sampleCount);
    for (let i = 0; i < sampleCount; i++) {
      samples[i] = pcmBuf.readInt16LE(i * 2) / 32768;
    }
    return { samples, sampleRate: 24000 };
  } catch {
    return null;
  }
}

/**
 * Parses a 16-bit PCM WAV buffer into mono Float32Array samples and sampleRate.
 */
function parseWavToFloat32(wavBuffer: Buffer): { samples: Float32Array; sampleRate: number } {
  let offset = 12;
  let sampleRate = 22050;
  let numChannels = 1;
  let dataOffset = 44;
  let dataByteLength = wavBuffer.length - 44;

  while (offset + 8 <= wavBuffer.length) {
    const chunkId = wavBuffer.toString("ascii", offset, offset + 4);
    const chunkSize = wavBuffer.readUInt32LE(offset + 4);
    if (chunkId === "fmt ") {
      numChannels = wavBuffer.readUInt16LE(offset + 10);
      sampleRate = wavBuffer.readUInt32LE(offset + 12);
    } else if (chunkId === "data") {
      dataOffset = offset + 8;
      dataByteLength = Math.min(chunkSize, wavBuffer.length - dataOffset);
      break;
    }
    offset += 8 + chunkSize + (chunkSize % 2);
  }

  const totalFrames = Math.floor(dataByteLength / (2 * numChannels));
  const samples = new Float32Array(totalFrames);
  for (let i = 0; i < totalFrames; i++) {
    const pos = dataOffset + i * 2 * numChannels;
    if (pos + 2 <= wavBuffer.length) {
      samples[i] = wavBuffer.readInt16LE(pos) / 32768;
    }
  }
  return { samples, sampleRate };
}

/**
 * TD-PSOLA (Time-Domain Pitch-Synchronous Overlap-Add) + Formant-Preserving Singing Resynthesizer
 * & Studio Vocal Harmonizer.
 *
 * Converts raw voice samples into true pitch-locked singing on the exact MIDI melody notes of the song,
 * preserving and sculpting the member's unique vocal tract formants, sustaining vowels, adding natural
 * singing vibrato + portamento, and mixing a stereo backing harmony in Chorus/Bridge sections!
 */
function synthesizeSingingVocalWav(
  rawSamples: Float32Array,
  sampleRate: number,
  profile: MemberVocalProfile,
  melodyMidiNotes: number[],
  section: string,
  bpm: number
): Buffer {
  // 1. Trim leading and trailing silence AND compact internal silence pockets so vocal flows without dead gaps
  let startIdx = 0;
  let endIdx = rawSamples.length - 1;
  const threshold = 0.012;
  while (startIdx < rawSamples.length && Math.abs(rawSamples[startIdx]) < threshold) {
    startIdx++;
  }
  while (endIdx > startIdx && Math.abs(rawSamples[endIdx]) < threshold) {
    endIdx--;
  }
  startIdx = Math.max(0, startIdx - Math.floor(sampleRate * 0.01));
  endIdx = Math.min(rawSamples.length - 1, endIdx + Math.floor(sampleRate * 0.025));

  const edgeTrimmed = rawSamples.subarray(startIdx, endIdx + 1);
  if (edgeTrimmed.length < 1024) {
    return encodeStereoWav(edgeTrimmed, edgeTrimmed, sampleRate);
  }

  // Compact any internal silence gap longer than 45ms down to 30ms
  const maxSilentRun = Math.floor(sampleRate * 0.045);
  const compactedArr: number[] = [];
  let silentRun = 0;
  for (let i = 0; i < edgeTrimmed.length; i++) {
    const s = edgeTrimmed[i];
    if (Math.abs(s) < 0.009) {
      silentRun++;
      if (silentRun <= maxSilentRun) {
        compactedArr.push(s);
      }
    } else {
      silentRun = 0;
      compactedArr.push(s);
    }
  }
  const trimmed = new Float32Array(compactedArr);
  if (trimmed.length < 1024) {
    return encodeStereoWav(trimmed, trimmed, sampleRate);
  }

  // 2. Frame-by-frame Pitch Period (T0) & Voiced/Unvoiced analysis via Normalized Autocorrelation
  const frameSize = Math.floor(sampleRate * 0.024); // 24ms window
  const hopSize = Math.floor(sampleRate * 0.008); // 8ms hop
  const minLag = Math.floor(sampleRate / 460); // 460 Hz max source pitch
  const maxLag = Math.floor(sampleRate / 85); // 85 Hz min source pitch
  const numFrames = Math.max(1, Math.floor((trimmed.length - frameSize) / hopSize));

  const frameVoiced = new Uint8Array(numFrames);
  const frameT0 = new Float32Array(numFrames);
  const frameRms = new Float32Array(numFrames);
  const defaultT0 = Math.floor(sampleRate / 210);

  for (let f = 0; f < numFrames; f++) {
    const base = f * hopSize;
    let energy = 0;
    let zeroCrossings = 0;
    for (let i = 0; i < frameSize; i++) {
      const s = trimmed[base + i] || 0;
      energy += s * s;
      if (i > 0) {
        const prev = trimmed[base + i - 1] || 0;
        if ((s >= 0 && prev < 0) || (s < 0 && prev >= 0)) zeroCrossings++;
      }
    }
    const rms = Math.sqrt(energy / frameSize);
    frameRms[f] = rms;

    // Unvoiced consonant check (fricative s/sh/ch/k/t has high zero-crossing rate or very low energy)
    const zcr = zeroCrossings / frameSize;
    if (rms < 0.018 || zcr > 0.34) {
      frameVoiced[f] = 0;
      frameT0[f] = f > 0 ? frameT0[f - 1] : defaultT0;
      continue;
    }

    // Coarse-to-fine Normalized Autocorrelation for pitch period T0
    let bestLag = defaultT0;
    let maxCorr = -1;
    for (let lag = minLag; lag <= maxLag; lag += 2) {
      let sumXY = 0;
      let sumYY = 0;
      const n = frameSize - maxLag;
      for (let i = 0; i < n; i += 2) {
        const x = trimmed[base + i];
        const y = trimmed[base + i + lag];
        sumXY += x * y;
        sumYY += y * y;
      }
      const norm = Math.sqrt(energy * (sumYY * 2 + 1e-7));
      const corr = norm > 0 ? (sumXY * 2) / norm : 0;
      if (corr > maxCorr) {
        maxCorr = corr;
        bestLag = lag;
      }
    }

    // Refine +/- 1 sample around bestLag
    for (const delta of [-1, 1]) {
      const lag = bestLag + delta;
      if (lag >= minLag && lag <= maxLag) {
        let sumXY = 0;
        let sumYY = 0;
        const n = frameSize - maxLag;
        for (let i = 0; i < n; i += 2) {
          const x = trimmed[base + i];
          const y = trimmed[base + i + lag];
          sumXY += x * y;
          sumYY += y * y;
        }
        const norm = Math.sqrt(energy * (sumYY * 2 + 1e-7));
        const corr = norm > 0 ? (sumXY * 2) / norm : 0;
        if (corr > maxCorr) {
          maxCorr = corr;
          bestLag = lag;
        }
      }
    }

    if (maxCorr > 0.28) {
      frameVoiced[f] = 1;
      frameT0[f] = bestLag;
    } else {
      frameVoiced[f] = 0;
      frameT0[f] = f > 0 ? frameT0[f - 1] : defaultT0;
    }
  }

  // 3. Place Pitch Marks across the input signal, snapped to local glottal peaks
  const pitchMarks: number[] = [];
  const pitchMarkT0: number[] = [];
  const pitchMarkVoiced: boolean[] = [];

  let cursor = Math.floor(defaultT0);
  while (cursor < trimmed.length - maxLag) {
    const fIdx = Math.min(numFrames - 1, Math.floor(cursor / hopSize));
    const localT0 = Math.round(frameT0[fIdx] || defaultT0);
    const isVoiced = frameVoiced[fIdx] === 1;

    if (isVoiced) {
      // Snap to local maximum within +/- localT0 / 3 for phase-coherent PSOLA grains
      const searchRadius = Math.floor(localT0 * 0.35);
      let peakPos = cursor;
      let peakVal = -1e9;
      for (
        let p = Math.max(localT0, cursor - searchRadius);
        p <= Math.min(trimmed.length - localT0 - 1, cursor + searchRadius);
        p++
      ) {
        if (trimmed[p] > peakVal) {
          peakVal = trimmed[p];
          peakPos = p;
        }
      }
      pitchMarks.push(peakPos);
      pitchMarkT0.push(localT0);
      pitchMarkVoiced.push(true);
      cursor = peakPos + localT0;
    } else {
      pitchMarks.push(cursor);
      pitchMarkT0.push(localT0);
      pitchMarkVoiced.push(false);
      cursor += Math.floor(defaultT0 * 0.75);
    }
  }

  if (pitchMarks.length < 4) {
    return encodeStereoWav(trimmed, trimmed, sampleRate);
  }

  // 4. Map Target MIDI Melody Notes into the Member's Natural Singing Register
  const isChorus = section.includes("CHORUS");
  const isBridge = section === "BRIDGE";
  const isRap = profile.isRapFocused || section.includes("RAP");

  const validNotes = melodyMidiNotes.filter((n) => Number.isFinite(n) && n > 20);
  const rawNotes = validNotes.length > 0 ? validNotes : [60, 63, 65, 67, 70, 67, 65, 63];

  // Shift notes by octaves so their average sits right in the member's natural singing register
  const avgMidi = rawNotes.reduce((a, b) => a + b, 0) / rawNotes.length;
  const targetCenter =
    profile.registerCenterMidi + (isChorus ? 2 : isBridge ? 3 : isRap ? -2 : 0);
  const octaveOffset = Math.round((targetCenter - avgMidi) / 12) * 12;
  const memberNotes = rawNotes.map((n) => n + octaveOffset);

  // Stretch voiced vowels so the singer sustains notes melodically without dragging!
  const baseStretch = isRap ? 1.0 : isChorus ? 1.16 : isBridge ? 1.2 : 1.1;
  const outLength = Math.min(
    Math.floor(sampleRate * (60 / Math.max(90, bpm)) * 10.5),
    Math.floor(trimmed.length * baseStretch)
  );

  const leadOut = new Float32Array(outLength);
  const harmonyOut = new Float32Array(outLength);
  const needsHarmony = isChorus || isBridge || section === "OUTRO";
  const harmonyIntervalSemitones = 3.5; // Lush K-POP studio harmony third

  // 5. TD-PSOLA Synthesis Loop + Phase-Locked Singing Harmonic Reinforcement
  let inPos = pitchMarks[0];
  let outPos = Math.floor(defaultT0);
  let smoothedMidi = memberNotes[0];
  let noteHoldTime = 0;
  let lastNoteIdx = 0;
  let markSearchIdx = 0;

  while (outPos < outLength - maxLag && inPos < trimmed.length - maxLag) {
    const progress = outPos / outLength;
    const noteIdx = Math.min(
      memberNotes.length - 1,
      Math.floor(progress * memberNotes.length)
    );
    const targetMidi = memberNotes[noteIdx];

    if (noteIdx !== lastNoteIdx) {
      noteHoldTime = 0;
      lastNoteIdx = noteIdx;
    }

    // Find nearest analysis pitch mark to inPos
    while (
      markSearchIdx + 1 < pitchMarks.length &&
      Math.abs(pitchMarks[markSearchIdx + 1] - inPos) <=
        Math.abs(pitchMarks[markSearchIdx] - inPos)
    ) {
      markSearchIdx++;
    }

    const mPos = pitchMarks[markSearchIdx];
    const mT0 = pitchMarkT0[markSearchIdx];
    const isVoiced = pitchMarkVoiced[markSearchIdx];

    // Smooth portamento glide toward targetMidi (faster on Chorus, looser on Rap)
    const portamentoAlpha = isRap ? 0.14 : 0.24;
    smoothedMidi += (targetMidi - smoothedMidi) * portamentoAlpha;

    // Add expressive singing vibrato after holding a note for 90ms
    const vibratoFade = Math.min(1.0, Math.max(0, (noteHoldTime - 0.08) / 0.15));
    const vibratoMod =
      !isRap && isVoiced
        ? Math.sin(2 * Math.PI * profile.vibratoHz * (outPos / sampleRate)) *
          profile.vibratoSemitones *
          vibratoFade
        : 0;

    // For rap sections, blend 45% original speech inflection with 55% musical pitch lock
    const sourceFreq = sampleRate / Math.max(minLag, mT0);
    const melodyFreq = midiToFreq(smoothedMidi + vibratoMod);
    const targetFreq = isRap
      ? sourceFreq * 0.42 + melodyFreq * 0.58
      : melodyFreq;

    const targetT0 = Math.max(
      minLag,
      Math.min(maxLag * 1.4, sampleRate / targetFreq)
    );

    if (isVoiced) {
      // Extract Hanning-windowed pitch grain of radius mT0 around mPos,
      // warped by profile.formantShift so the member's unique vocal timbre shines!
      const grainRadius = mT0;
      const formant = profile.formantShift;
      const outRadius = Math.max(16, Math.floor(grainRadius / formant));

      // Compute grain local RMS to add subtle phase-locked singing glottal warmth
      let grainEnergy = 0;
      for (let k = -outRadius; k <= outRadius; k++) {
        const destIdx = Math.round(outPos) + k;
        if (destIdx < 0 || destIdx >= outLength) continue;

        const srcOffset = k * formant;
        const srcExact = mPos + srcOffset;
        const s0 = Math.floor(srcExact);
        const frac = srcExact - s0;
        if (s0 < 0 || s0 + 1 >= trimmed.length) continue;

        const sampleVal = trimmed[s0] * (1 - frac) + trimmed[s0 + 1] * frac;
        const normPos = k / outRadius; // -1 .. +1
        const hanning = 0.5 * (1 + Math.cos(Math.PI * normPos));

        // Add subtle singing harmonic warmth locked to the glottal grain phase
        const harmonicWarmth =
          !isRap
            ? (Math.sin(Math.PI * normPos) * 0.14 +
                Math.sin(2 * Math.PI * normPos) * 0.08 * profile.brightness) *
              Math.abs(sampleVal)
            : 0;

        leadOut[destIdx] += (sampleVal + harmonicWarmth) * hanning;
        grainEnergy += sampleVal * sampleVal;
      }

      // If Chorus/Bridge, synthesize 2nd harmony grain at +3/+4 semitones
      if (needsHarmony && grainEnergy > 0.0001) {
        const harmScale = Math.pow(2, harmonyIntervalSemitones / 12);
        const harmRadius = Math.max(14, Math.floor(outRadius / harmScale));
        for (let k = -harmRadius; k <= harmRadius; k++) {
          const destIdx = Math.round(outPos) + k;
          if (destIdx < 0 || destIdx >= outLength) continue;
          const srcExact = mPos + k * formant * harmScale;
          const s0 = Math.floor(srcExact);
          const frac = srcExact - s0;
          if (s0 < 0 || s0 + 1 >= trimmed.length) continue;
          const sampleVal = trimmed[s0] * (1 - frac) + trimmed[s0 + 1] * frac;
          const hanning = 0.5 * (1 + Math.cos((Math.PI * k) / harmRadius));
          harmonyOut[destIdx] += sampleVal * hanning * 0.42;
        }
      }

      // Hold vowels slightly at the end of a phrase without dragging into the next lyric
      const phraseEndBoost = progress > 0.82 && !isRap ? 1.24 : baseStretch;
      outPos += targetT0;
      inPos += targetT0 / phraseEndBoost;
      noteHoldTime += targetT0 / sampleRate;
    } else {
      // Unvoiced consonant (s, k, t, ch, p, h): copy at 1.0x rate without pitch distortion so diction is crystal clear!
      const consStep = Math.floor(defaultT0 * 0.7);
      const radius = consStep;
      for (let k = -radius; k <= radius; k++) {
        const destIdx = Math.round(outPos) + k;
        const srcIdx = Math.round(inPos) + k;
        if (destIdx >= 0 && destIdx < outLength && srcIdx >= 0 && srcIdx < trimmed.length) {
          const hanning = 0.5 * (1 + Math.cos((Math.PI * k) / radius));
          leadOut[destIdx] += trimmed[srcIdx] * hanning * 1.1; // Crisp consonant articulation
        }
      }
      outPos += consStep;
      inPos += consStep;
    }
  }

  // Trim any trailing empty samples in leadOut so the vocal clip ends immediately after the last sung syllable
  let actualEnd = outLength;
  while (actualEnd > 1024 && Math.abs(leadOut[actualEnd - 1]) < 0.004) {
    actualEnd--;
  }

  // 6. Studio Vocal Mastering: Presence Air Exciter + Stereo Haas Doubler + Plate Reverb Tail
  const extraTail = Math.floor(sampleRate * 0.12);
  const totalOut = actualEnd + extraTail;
  const leftChannel = new Float32Array(totalOut);
  const rightChannel = new Float32Array(totalOut);

  // Normalize peak of leadOut
  let maxPeak = 0.01;
  for (let i = 0; i < actualEnd; i++) {
    const abs = Math.abs(leadOut[i]);
    if (abs > maxPeak) maxPeak = abs;
  }
  const normGain = 0.86 / maxPeak;

  const haasDelaySamples = Math.floor(sampleRate * 0.014); // 14ms stereo vocal widening
  const slapDelay1 = Math.floor(sampleRate * 0.085);
  const slapDelay2 = Math.floor(sampleRate * 0.165);

  let prevSample = 0;
  for (let i = 0; i < totalOut; i++) {
    const raw = i < actualEnd ? leadOut[i] * normGain : 0;
    const harm = i < actualEnd ? harmonyOut[i] * normGain : 0;

    // High-frequency vocal air shelf (gives studio condenser mic sheen)
    const highDiff = raw - prevSample;
    prevSample = raw;
    const airAdded = raw + highDiff * (0.35 * profile.brightness);

    // Soft tube saturation for warm vocal presence
    const saturated = Math.tanh(airAdded * 1.25) * 0.88;

    // Stereo Haas double & studio ambience
    const doubleRight =
      i >= haasDelaySamples && i - haasDelaySamples < actualEnd
        ? leadOut[i - haasDelaySamples] * normGain * 0.28
        : 0;
    const verb1 = i >= slapDelay1 ? leftChannel[i - slapDelay1] * 0.18 : 0;
    const verb2 = i >= slapDelay2 ? rightChannel[i - slapDelay2] * 0.14 : 0;

    leftChannel[i] = Math.max(-0.98, Math.min(0.98, saturated + harm * 0.65 + verb1));
    rightChannel[i] = Math.max(
      -0.98,
      Math.min(0.98, saturated * 0.92 + doubleRight + harm * 0.85 + verb2)
    );
  }

  return encodeStereoWav(leftChannel, rightChannel, sampleRate);
}

function encodeStereoWav(
  left: Float32Array,
  right: Float32Array,
  sampleRate: number
): Buffer {
  const numFrames = left.length;
  const numChannels = 2;
  const bytesPerSample = 2;
  const dataByteLength = numFrames * numChannels * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataByteLength);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataByteLength, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // PCM chunk size
  buffer.writeUInt16LE(1, 20); // PCM format = 1
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28);
  buffer.writeUInt16LE(numChannels * bytesPerSample, 32);
  buffer.writeUInt16LE(16, 34); // 16-bit
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataByteLength, 40);

  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    const l = Math.max(-1, Math.min(1, left[i] || 0));
    const r = Math.max(-1, Math.min(1, right[i] || 0));
    buffer.writeInt16LE(Math.round(l * 32767), offset);
    buffer.writeInt16LE(Math.round(r * 32767), offset + 2);
    offset += 4;
  }

  return buffer;
}

async function synthesizeVocalWavBuffer(params: {
  rawText: string;
  artistId: string;
  vocalTag: string;
  section: string;
  bpm: number;
  melodyMidiNotes: number[];
  apiKey?: string;
}): Promise<{ wavBuffer: Buffer; memberName: string } | null> {
  const text = cleanLyricForSinging(params.rawText);
  if (!text) return null;

  const profile = getMemberVocalProfile(params.artistId, params.vocalTag, params.section);

  await fs.mkdir(CACHE_DIR, { recursive: true });
  const hash = crypto
    .createHash("md5")
    .update(
      `v6|${profile.memberName}|${profile.macVoice}|${profile.formantShift}|${params.section}|${params.bpm}|${params.melodyMidiNotes.join(",")}|${text}|${Boolean(params.apiKey || process.env.GEMINI_API_KEY)}`
    )
    .digest("hex");
  const wavPath = path.join(CACHE_DIR, `sing_${hash}.wav`);

  try {
    const cached = await fs.readFile(wavPath);
    return { wavBuffer: cached, memberName: profile.memberName };
  } catch {
    // Synthesize now
  }

  let sourceAudio = await tryGeminiNeuralVoice(text, profile, params.section, params.apiKey);

  if (!sourceAudio) {
    const bpmScale = Math.max(0.92, Math.min(1.22, params.bpm / 122));
    const baseRate = Math.round(192 * bpmScale * profile.rateScale);
    const rawWavPath = path.join(CACHE_DIR, `raw_${hash}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.wav`);

    try {
      await execFileAsync("/usr/bin/say", [
        "-v",
        profile.macVoice,
        "-r",
        String(baseRate),
        "-o",
        rawWavPath,
        "--data-format=LEI16@22050",
        text,
      ]);
    } catch {
      await execFileAsync("/usr/bin/say", [
        "-v",
        "Yuna",
        "-r",
        String(baseRate),
        "-o",
        rawWavPath,
        "--data-format=LEI16@22050",
        text,
      ]);
    }

    const rawBuf = await fs.readFile(rawWavPath);
    sourceAudio = parseWavToFloat32(rawBuf);
    fs.unlink(rawWavPath).catch(() => {});
  }

  const singingWavBuffer = synthesizeSingingVocalWav(
    sourceAudio.samples,
    sourceAudio.sampleRate,
    profile,
    params.melodyMidiNotes,
    params.section,
    params.bpm
  );

  await fs.writeFile(wavPath, singingWavBuffer);
  return { wavBuffer: singingWavBuffer, memberName: profile.memberName };
}

export async function GET(req: NextRequest) {
  try {
    const rawText = req.nextUrl.searchParams.get("text") || "";
    const artistId = req.nextUrl.searchParams.get("artistId") || "aespa";
    const vocalTag = req.nextUrl.searchParams.get("vocal") || "";
    const section = req.nextUrl.searchParams.get("section") || "CHORUS";
    const bpm = Number(req.nextUrl.searchParams.get("bpm") || "128");
    const melodyParam = req.nextUrl.searchParams.get("melody") || "64,67,69,71,69,67";
    const apiKey = req.nextUrl.searchParams.get("apiKey") || undefined;

    const melodyMidiNotes = melodyParam
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n));

    const result = await synthesizeVocalWavBuffer({
      rawText,
      artistId,
      vocalTag,
      section,
      bpm,
      melodyMidiNotes,
      apiKey,
    });

    if (!result) {
      return NextResponse.json({ error: "Empty text" }, { status: 400 });
    }

    return new NextResponse(new Uint8Array(result.wavBuffer), {
      headers: {
        "Content-Type": "audio/wav",
        "Cache-Control": "public, max-age=86400",
        "X-Vocal-Member": encodeURIComponent(result.memberName),
      },
    });
  } catch (error) {
    console.error("Singing vocal synthesis error:", error);
    return NextResponse.json({ error: "Vocal synthesis failed" }, { status: 500 });
  }
}
