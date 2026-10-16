import {
  ArtistPreset,
  CoverArtConfig,
  KPOP_ARTISTS,
  LyricLine,
  MusicalDNA,
  Track,
  YoutubeReference,
} from "@/types/komposer";

export interface ComposeInput {
  selectedArtistIds: string[];
  customArtistName?: string;
  collabRatio?: number;
  youtubeRefs: YoutubeReference[];
  genre: string;
  mood: string;
  customPrompt: string;
  bpm?: number;
  creatorId: string;
  creatorName: string;
  creatorHandle: string;
  apiKey?: string;
}

const KEY_TO_MIDI: Record<string, number> = {
  "C Minor": 60,
  "C# Minor": 61,
  "D Minor": 62,
  "D Major": 62,
  "Eb Major": 63,
  "E Minor": 64,
  "F Minor": 65,
  "F# Minor": 66,
  "G Minor": 67,
  "G Major": 67,
  "A Minor": 69,
  "B Minor": 59,
};

export interface ArtistMemberRoster {
  leadVocal: string;
  highVocal: string;
  rapVocal: string;
  subVocal: string;
  groupHarmony: string;
  allMembers: string[];
}

export const ARTIST_MEMBER_ROSTERS: Record<string, ArtistMemberRoster> = {
  aespa: {
    leadVocal: "카리나 (KARINA - aespa)",
    highVocal: "윈터 (WINTER - aespa)",
    rapVocal: "지젤 (GISELLE - aespa)",
    subVocal: "닝닝 (NINGNING - aespa)",
    groupHarmony: "aespa 전원 화음 (닝닝 · 윈터 · 카리나 · 지젤)",
    allMembers: ["카리나 (KARINA)", "윈터 (WINTER)", "닝닝 (NINGNING)", "지젤 (GISELLE)"],
  },
  newjeans: {
    leadVocal: "하니 (HANNI - NewJeans)",
    highVocal: "다니엘 (DANIELLE - NewJeans)",
    rapVocal: "민지 (MINJI - NewJeans)",
    subVocal: "해린 (HAERIN - NewJeans)",
    groupHarmony: "NewJeans 전원 화음 (하니 · 해린 · 다니엘 · 민지 · 혜인)",
    allMembers: ["민지 (MINJI)", "하니 (HANNI)", "다니엘 (DANIELLE)", "해린 (HAERIN)", "혜인 (HYEIN)"],
  },
  day6: {
    leadVocal: "원필 (WONPIL - DAY6)",
    highVocal: "성진 (SUNGJIN - DAY6)",
    rapVocal: "영케이 (Young K - DAY6)",
    subVocal: "도운 (DOWOON - DAY6)",
    groupHarmony: "DAY6 밴드 떼창 화음 (성진 · Young K · 원필 · 도운)",
    allMembers: ["성진 (SUNGJIN)", "영케이 (Young K)", "원필 (WONPIL)", "도운 (DOWOON)"],
  },
  iu: {
    leadVocal: "아이유 (IU - 섬세한 진성 보컬)",
    highVocal: "아이유 (IU - 3단 고음 벨팅)",
    rapVocal: "아이유 (IU - 리드미컬 멜로디 랩)",
    subVocal: "아이유 (IU - 몽환적 팔세토)",
    groupHarmony: "아이유 (IU - 시네마틱 더블링 코러스)",
    allMembers: ["아이유 (IU)"],
  },
  blackpink: {
    leadVocal: "제니 (JENNIE - BLACKPINK)",
    highVocal: "로제 (ROSÉ - BLACKPINK)",
    rapVocal: "리사 (LISA - BLACKPINK)",
    subVocal: "지수 (JISOO - BLACKPINK)",
    groupHarmony: "BLACKPINK 전원 챈트 (제니 · 로제 · 리사 · 지수)",
    allMembers: ["지수 (JISOO)", "제니 (JENNIE)", "로제 (ROSÉ)", "리사 (LISA)"],
  },
  straykids: {
    leadVocal: "방찬 (BANG CHAN - Stray Kids)",
    highVocal: "승민 (SEUNGMIN - Stray Kids)",
    rapVocal: "창빈 & 한 (CHANGBIN & HAN - Stray Kids)",
    subVocal: "필릭스 (FELIX 동굴 저음 - Stray Kids)",
    groupHarmony: "Stray Kids 전원 마라맛 떼창 (방찬 · 창빈 · 한 · 필릭스)",
    allMembers: ["방찬 (BANG CHAN)", "창빈 (CHANGBIN)", "한 (HAN)", "필릭스 (FELIX)", "현진 (HYUNJIN)", "승민 (SEUNGMIN)"],
  },
  bts: {
    leadVocal: "정국 (JUNGKOOK - BTS)",
    highVocal: "지민 (JIMIN - BTS)",
    rapVocal: "RM & 슈가 (RM & SUGA - BTS)",
    subVocal: "뷔 & 진 (V & JIN - BTS)",
    groupHarmony: "BTS 전원 하모니 (정국 · 지민 · 뷔 · 진 · RM · 슈가 · 제이홉)",
    allMembers: ["RM", "진 (JIN)", "슈가 (SUGA)", "제이홉 (J-HOPE)", "지민 (JIMIN)", "뷔 (V)", "정국 (JUNGKOOK)"],
  },
  seventeen: {
    leadVocal: "우지 (WOOZI - SEVENTEEN)",
    highVocal: "도겸 & 승관 (DK & SEUNGKWAN - SEVENTEEN)",
    rapVocal: "에스쿱스 & 민규 (S.COUPS & MINGYU - SEVENTEEN)",
    subVocal: "호시 (HOSHI - SEVENTEEN)",
    groupHarmony: "SEVENTEEN 전원 합창 (도겸 · 승관 · 우지 · 호시 · 에스쿱스)",
    allMembers: ["에스쿱스 (S.COUPS)", "우지 (WOOZI)", "호시 (HOSHI)", "민규 (MINGYU)", "도겸 (DK)", "승관 (SEUNGKWAN)"],
  },
  lesserafim: {
    leadVocal: "김채원 (CHAEWON - LE SSERAFIM)",
    highVocal: "허윤진 (YUNJIN - LE SSERAFIM)",
    rapVocal: "카즈하 (KAZUHA - LE SSERAFIM)",
    subVocal: "사쿠라 & 홍은채 (SAKURA & EUNCHAE)",
    groupHarmony: "LE SSERAFIM 전원 보깅 코러스 (채원 · 윤진 · 카즈하 · 사쿠라 · 은채)",
    allMembers: ["김채원 (CHAEWON)", "사쿠라 (SAKURA)", "허윤진 (YUNJIN)", "카즈하 (KAZUHA)", "홍은채 (EUNCHAE)"],
  },
  ive: {
    leadVocal: "안유진 (YUJIN - IVE)",
    highVocal: "리즈 (LIZ - IVE)",
    rapVocal: "레이 & 가을 (REI & GAEUL - IVE)",
    subVocal: "장원영 (WONYOUNG - IVE)",
    groupHarmony: "IVE 전원 로열 하모니 (안유진 · 장원영 · 리즈 · 레이 · 가을 · 이서)",
    allMembers: ["안유진 (YUJIN)", "가을 (GAEUL)", "레이 (REI)", "장원영 (WONYOUNG)", "리즈 (LIZ)", "이서 (LEESEO)"],
  },
  gdragon: {
    leadVocal: "G-DRAGON (권지용 - 시그니처 리드)",
    highVocal: "G-DRAGON (권지용 - 하이톤 록 보컬)",
    rapVocal: "G-DRAGON (권지용 - 아이코닉 스웨그 랩)",
    subVocal: "G-DRAGON (권지용 - 멜로딕 훅)",
    groupHarmony: "G-DRAGON (권지용 - 스타디움 떼창 훅)",
    allMembers: ["G-DRAGON (권지용)"],
  },
  riize: {
    leadVocal: "원빈 (WONBIN - RIIZE)",
    highVocal: "소희 (SOHEE - RIIZE)",
    rapVocal: "성찬 & 쇼타로 (SUNGCHAN & SHOTARO - RIIZE)",
    subVocal: "앤톤 & 은석 (ANTON & EUNSEOK - RIIZE)",
    groupHarmony: "RIIZE 전원 하모니 (원빈 · 소희 · 앤톤 · 성찬 · 쇼타로 · 은석)",
    allMembers: ["쇼타로 (SHOTARO)", "은석 (EUNSEOK)", "성찬 (SUNGCHAN)", "원빈 (WONBIN)", "소희 (SOHEE)", "앤톤 (ANTON)"],
  },
};

export function assignRealMemberVocals(artists: string[], lyrics: LyricLine[]): LyricLine[] {
  const a1 = artists[0] || "aespa";
  const a2 = artists[1] || a1;
  const isCollab = artists.length > 1 && a1 !== a2;

  const r1 = ARTIST_MEMBER_ROSTERS[a1] || ARTIST_MEMBER_ROSTERS.aespa;
  const r2 = ARTIST_MEMBER_ROSTERS[a2] || r1;

  return lyrics.map((line, idx) => {
    const v = line.vocal || "";
    // If vocal already explicitly names a real member (e.g., 카리나, 윈터, 하니, 원필), keep it!
    const hasMemberName =
      /[가-힣]+\s*\([A-Za-z\s-]+/.test(v) ||
      v.includes("카리나") ||
      v.includes("윈터") ||
      v.includes("닝닝") ||
      v.includes("지젤") ||
      v.includes("하니") ||
      v.includes("해린") ||
      v.includes("민지") ||
      v.includes("다니엘") ||
      v.includes("원필") ||
      v.includes("성진") ||
      v.includes("영케이") ||
      v.includes("아이유") ||
      v.includes("제니") ||
      v.includes("로제") ||
      v.includes("리사") ||
      v.includes("정국") ||
      v.includes("지민") ||
      v.includes("필릭스") ||
      v.includes("창빈") ||
      v.includes("안유진") ||
      v.includes("장원영") ||
      v.includes("김채원") ||
      v.includes("허윤진") ||
      v.includes("우지") ||
      v.includes("도겸") ||
      v.includes("원빈") ||
      v.includes("소희");

    if (hasMemberName) return line;

    const sec = line.section;
    let memberLabel = r1.leadVocal;
    if (sec === "INTRO") {
      memberLabel = isCollab ? `${r1.subVocal} × ${r2.rapVocal}` : r1.rapVocal;
    } else if (sec === "VERSE 1") {
      memberLabel = r1.leadVocal;
    } else if (sec === "PRE-CHORUS") {
      memberLabel = isCollab ? r2.highVocal : r1.highVocal;
    } else if (sec === "CHORUS") {
      memberLabel = isCollab
        ? `${r1.highVocal.split(" ")[0]} × ${r2.leadVocal.split(" ")[0]} (콜라보 메인 하모니)`
        : r1.groupHarmony;
    } else if (sec.includes("RAP") || sec.includes("VERSE 2")) {
      memberLabel = isCollab ? r2.rapVocal : `${r1.rapVocal} & ${r1.leadVocal.split(" ")[0]}`;
    } else if (sec === "BRIDGE") {
      memberLabel = isCollab ? `${r1.subVocal} & ${r2.highVocal}` : `${r1.subVocal} & ${r1.highVocal.split(" ")[0]}`;
    } else if (sec === "FINAL CHORUS") {
      memberLabel = isCollab
        ? `${r1.groupHarmony.split(" ")[0]} × ${r2.groupHarmony.split(" ")[0]} 전원 합창`
        : r1.groupHarmony;
    } else if (sec === "OUTRO") {
      memberLabel = isCollab ? `${r1.subVocal} × ${r2.subVocal}` : r1.subVocal;
    } else {
      memberLabel = idx % 2 === 0 ? r1.leadVocal : r2.highVocal;
    }

    return {
      ...line,
      vocal: memberLabel,
    };
  });
}

// Artist-specific irregular rhythm & melodic DNA templates
interface ArtistMusicalSignature {
  kickPattern: number[];
  snarePattern: number[];
  hiHatPattern: number[]; // 2 = 32nd-note trap roll
  swingAmount: number;
  beatSwitchMode: MusicalDNA["beatSwitchMode"];
  verseMelody: number[];
  preChorusMelody: number[];
  chorusMelody: number[];
  bridgeMelody: number[];
  worldviewKeywords: string[];
  adlibs: string[];
}

export const ARTIST_MUSICAL_SIGNATURES: Record<string, ArtistMusicalSignature> = {
  newjeans: {
    // Irregular 2-step UK Garage & Baltimore breakbeat
    kickPattern: [1, 0, 0, 0.85, 0, 0, 0.9, 0, 0, 0, 0.8, 0, 0, 0.75, 0, 0.55],
    snarePattern: [0, 0, 0.25, 0, 1, 0, 0, 0.45, 0, 0.35, 0, 0, 1, 0, 0.3, 0],
    hiHatPattern: [0.8, 0.4, 0.9, 0.5, 0.7, 0, 0.9, 0.6, 0.8, 0.4, 0.9, 0, 0.8, 0.5, 1, 0.6],
    swingAmount: 0.22,
    beatSwitchMode: "breakbeat_chorus",
    verseMelody: [0, -99, 3, 5, -99, 7, 5, 3, -99, 2, 3, -99, 5, 3, 0, -99],
    preChorusMelody: [3, 5, 7, -99, 10, 9, 7, 5, 7, -99, 10, 12, -99, 10, 7, -99],
    chorusMelody: [12, -99, 10, 7, -99, 5, 7, 10, -99, 12, 15, 12, 10, -99, 7, 5],
    bridgeMelody: [7, -99, -99, 10, 9, -99, 7, 5, -99, 3, 5, 7, -99, 10, 12, -99],
    worldviewKeywords: ["캠코더 속 기억", "푸른 운동장", "이어폰 한쪽", "방과 후의 비밀", "설레는 눈맞춤"],
    adlibs: ["Ooh-whoa, stay in the middle", "Ra-ta-ta-ta, tell me right now", "Cause I know what you like"],
  },
  aespa: {
    // Glitchy metallic hyperpop syncopation + Next Level beat switch
    kickPattern: [1, 0, 0.7, 0, 0, 0.95, 0, 0, 1, 0, 0, 0.85, 0, 0.75, 0.9, 0],
    snarePattern: [0, 0, 0, 0, 1, 0, 0.5, 0, 0, 0.4, 0, 0, 1, 0, 0, 0.65],
    hiHatPattern: [1, 0.5, 1, 2, 0.8, 0.5, 1, 0.6, 1, 0, 1, 2, 0.9, 0.5, 1, 2],
    swingAmount: 0.08,
    beatSwitchMode: "hyper_drop",
    verseMelody: [0, 0, -99, 3, 2, 0, -99, -2, 0, -99, 6, 5, 3, -99, 0, -99],
    preChorusMelody: [3, -99, 7, 6, 7, -99, 10, 9, 10, -99, 12, 11, 12, 15, -99, -99],
    chorusMelody: [0, 12, -99, 10, 7, 6, 7, -99, 0, 15, -99, 12, 10, 7, 6, 3],
    bridgeMelody: [12, -99, 14, 15, -99, 17, 15, 12, -99, 10, 12, 15, 19, -99, 17, 15],
    worldviewKeywords: ["차원을 넘는 포털", "메탈릭 크롬 빛", "초신성의 폭발", "거울 속의 아바타", "광야의 주파수"],
    adlibs: ["Ah-oh, ayy!", "Watch me bring the Supernova!", "Next Level로 각성해 지금"],
  },
  day6: {
    // Live Youth Rock Band syncopated 8th/16th groove with bar-4 tom/snare fills
    kickPattern: [1, 0, 0.45, 0, 0, 0, 0.85, 0.5, 1, 0, 0, 0.75, 0, 0.65, 0, 0.5],
    snarePattern: [0, 0, 0, 0, 1, 0, 0, 0.35, 0, 0.4, 0, 0, 1, 0, 0.55, 0.75],
    hiHatPattern: [1, 0.6, 0.9, 0.6, 1, 0.6, 0.9, 0.6, 1, 0.6, 0.9, 0.6, 1, 0.8, 1, 1],
    swingAmount: 0.06,
    beatSwitchMode: "band_buildup",
    verseMelody: [0, 2, 4, -99, 7, 4, 2, -99, 0, 2, 4, 7, 9, -99, 7, -99],
    preChorusMelody: [4, -99, 7, 9, 11, -99, 9, 7, 9, 11, 12, -99, 14, 12, 11, 9],
    chorusMelody: [12, 14, 16, -99, 14, 12, 9, -99, 7, 9, 12, 14, 16, -99, 12, -99],
    bridgeMelody: [9, -99, -99, 7, 4, -99, 2, 4, 7, -99, 9, 11, 12, 14, 16, -99],
    worldviewKeywords: ["청춘의 한 페이지", "페스티벌의 밤하늘", "부서지는 파도와 기타", "지나간 계절의 온도", "벅차오르는 스타디움"],
    adlibs: ["One, two, three, go!", "아름다운 우리의 청춘이여!", "Sing it loud till the dawn!"],
  },
  iu: {
    // Expressive swung 6/8 & R&B pocket groove
    kickPattern: [1, 0, 0, 0, 0, 0.55, 0, 0.8, 0, 0, 0.85, 0, 0, 0, 0.45, 0],
    snarePattern: [0, 0, 0, 0, 0.9, 0, 0, 0, 0, 0.3, 0, 0, 0.95, 0, 0, 0.35],
    hiHatPattern: [0.7, 0, 0.5, 0.6, 0.7, 0, 0.5, 0, 0.7, 0, 0.6, 0.4, 0.7, 0, 0.8, 0],
    swingAmount: 0.28,
    beatSwitchMode: "band_buildup",
    verseMelody: [0, -99, 4, 7, -99, 9, 7, 4, -99, 2, 4, -99, 0, -99, -99, -99],
    preChorusMelody: [4, 7, 9, -99, 11, 9, 7, -99, 9, 11, 12, -99, 14, 11, 9, -99],
    chorusMelody: [12, -99, 11, 9, 7, -99, 12, 16, -99, 14, 12, 9, 7, -99, 9, 12],
    bridgeMelody: [7, -99, 11, 12, -99, 14, 16, 19, -99, 16, 14, 12, 11, -99, 12, -99],
    worldviewKeywords: ["반딧불이 머문 창가", "라일락 꽃잎의 인사", "오래된 일기장 속 편지", "보랏빛 황혼의 약속", "가장 반짝이던 계절"],
    adlibs: ["사랑은 결국 모든 걸 이기니까요", "이 밤 그날의 별빛을 보낼게요", "Ooh-ah, 기억해 줄래요"],
  },
  blackpink: {
    // YG Trap 808 Tresillo (3-3-2) + Brass Drop
    kickPattern: [1, 0, 0, 0.9, 0, 0, 0.85, 0, 0, 0.65, 1, 0, 0, 0, 0.8, 0.9],
    snarePattern: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0.4, 1, 0, 0.5, 0],
    hiHatPattern: [1, 0.6, 1, 2, 1, 0.5, 1, 0.7, 1, 2, 1, 0.6, 1, 0.5, 2, 2],
    swingAmount: 0.1,
    beatSwitchMode: "halftime_verse2",
    verseMelody: [0, 1, 0, -99, 3, 1, 0, -99, 7, 6, 3, -99, 1, 0, -99, -99],
    preChorusMelody: [3, -99, 5, 7, -99, 8, 7, 5, -99, 7, 8, 10, -99, 12, 11, -99],
    chorusMelody: [0, 0, 1, 0, -99, 7, 6, 3, 0, 0, 1, 3, -99, 8, 7, 3],
    bridgeMelody: [7, -99, 8, 10, 12, -99, 10, 8, 7, -99, 12, 13, 15, -99, 12, -99],
    worldviewKeywords: ["검은 장미의 독", "왕관의 무게", "사막 위를 가르는 불꽃", "거침없는 런웨이", "밤을 삼킨 카리스마"],
    adlibs: ["BLACKPINK in your area!", "Brr-rah! Bring the pain like!", "How you like that drop!"],
  },
  straykids: {
    // 3RACHA Mala-taste irregular aggressive trap & double-time switches
    kickPattern: [1, 0, 0.8, 0, 0, 0.9, 0, 0.75, 1, 0, 0, 0.9, 0.7, 0, 0.95, 0.85],
    snarePattern: [0, 0, 0, 0.4, 1, 0, 0.5, 0, 0, 0.45, 0, 0, 1, 0, 0.7, 0.9],
    hiHatPattern: [1, 2, 1, 0.7, 1, 2, 1, 2, 1, 0.6, 1, 2, 1, 2, 2, 2],
    swingAmount: 0.05,
    beatSwitchMode: "halftime_verse2",
    verseMelody: [0, 0, 3, 0, -99, 1, 0, -2, 0, 0, 6, 5, 3, 0, -99, -99],
    preChorusMelody: [5, -99, 7, 8, 10, -99, 8, 7, 10, -99, 12, 13, 15, -99, 12, -99],
    chorusMelody: [12, 12, 13, 12, -99, 7, 6, 7, 0, 12, 10, 7, 6, 3, 1, 0],
    bridgeMelody: [-5, -99, -4, 0, 3, -99, 7, 8, 12, -99, 15, 13, 12, 10, 7, -99],
    worldviewKeywords: ["나침반이 가리키는 미궁", "오감 자극 마라맛 레시피", "천둥처럼 내려꽂는 808", "틀을 깨부수는 변칙", "정상 위에서 울리는 사이렌"],
    adlibs: ["Chk Chk Boom!", "네 손님, 입맛에다 때려 박아!", "Stray Kids everywhere all around the world!"],
  },
  bts: {
    // Syncopated Disco Funk & Stadium Pop-Rap groove
    kickPattern: [1, 0, 0, 0.65, 1, 0, 0, 0.8, 1, 0, 0.55, 0, 1, 0, 0.75, 0],
    snarePattern: [0, 0, 0.3, 0, 1, 0, 0, 0.45, 0, 0.35, 0, 0, 1, 0, 0, 0.5],
    hiHatPattern: [0.9, 0.5, 1, 0.6, 0.9, 0.5, 1, 0.7, 0.9, 0.5, 1, 0.6, 0.9, 0.7, 1, 0.9],
    swingAmount: 0.16,
    beatSwitchMode: "halftime_verse2",
    verseMelody: [0, 3, 5, -99, 7, 5, 3, -99, 5, 7, 10, -99, 7, 5, 3, 0],
    preChorusMelody: [7, -99, 10, 12, -99, 14, 12, 10, 12, -99, 15, 14, 12, 10, 7, -99],
    chorusMelody: [12, 10, 12, 15, -99, 12, 10, 7, -99, 10, 12, 10, 7, 5, 3, 0],
    bridgeMelody: [3, -99, 7, 10, 12, -99, 10, 7, 10, -99, 12, 15, 17, -99, 15, 12],
    worldviewKeywords: ["보랏빛 은하수", "추운 겨울 끝의 봄날", "스타디움을 수놓은 불빛", "멈추지 않는 일곱 개의 심장", "밤하늘을 수놓은 다이너마이트"],
    adlibs: ["Light it up like Dynamite!", "보랏빛 봄날이 다시 찾아와", "Yeah, we gonna shine tonight!"],
  },
  seventeen: {
    // Energetic Funk-Brass & Multi-Chant Syncopation
    kickPattern: [1, 0, 0, 0.8, 0, 0.7, 1, 0, 0, 0.85, 1, 0, 0, 0.6, 0.9, 0],
    snarePattern: [0, 0, 0.35, 0, 1, 0, 0, 0.5, 0, 0.4, 0, 0, 1, 0, 0.6, 0.7],
    hiHatPattern: [1, 0.6, 0.9, 0.7, 1, 0.6, 0.9, 0.8, 1, 0.6, 0.9, 0.7, 1, 0.8, 1, 1],
    swingAmount: 0.14,
    beatSwitchMode: "breakbeat_chorus",
    verseMelody: [0, 3, 5, 7, -99, 5, 3, 0, -99, 3, 5, 6, 7, -99, 5, 3],
    preChorusMelody: [5, -99, 7, 10, 12, -99, 10, 7, 10, 12, 14, -99, 15, 14, 12, 10],
    chorusMelody: [12, 12, 10, 12, -99, 15, 12, 10, 7, 7, 10, 12, -99, 10, 7, 0],
    bridgeMelody: [7, -99, 10, 12, 14, -99, 12, 10, 12, -99, 15, 17, 19, -99, 15, 12],
    worldviewKeywords: ["끝없는 앵콜의 함성", "구름을 타는 여의봉", "열세 개의 다이아몬드", "태양보다 뜨거운 칼군무", "축제의 팡파르"],
    adlibs: ["기분 기분 기분 아주 NICE!", "Say the name, SEVENTEEN!", "오늘 밤은 끝날 때까지 끝난 게 아니야!"],
  },
  lesserafim: {
    // Iconic 5-kick Jersey Club & Afro-House Runway groove
    kickPattern: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0.95, 0, 0, 0.95, 0],
    snarePattern: [0, 0, 0, 0, 1, 0, 0, 0.4, 0, 0, 0, 0, 1, 0, 0, 0],
    hiHatPattern: [0.8, 0.4, 0.9, 0.4, 0.8, 0.4, 0.9, 0.6, 0.8, 0, 0.9, 0.7, 0.8, 0, 0.9, 0.8],
    swingAmount: 0.15,
    beatSwitchMode: "breakbeat_chorus",
    verseMelody: [0, -99, 0, 3, 2, 0, -99, -2, 0, -99, 3, 5, 3, 2, 0, -99],
    preChorusMelody: [3, 5, 7, -99, 5, 7, 9, -99, 7, 9, 10, -99, 12, 10, 9, 7],
    chorusMelody: [7, 7, 10, 7, -99, 5, 3, 0, 7, 7, 12, 10, -99, 7, 5, 3],
    bridgeMelody: [5, -99, 7, 9, 10, -99, 9, 7, 5, -99, 9, 10, 12, -99, 14, 12],
    worldviewKeywords: ["백만 볼트 런웨이", "두려움 없는 스텝", "시크한 새벽 드라이브", "운석 충돌에도 꺾이지 않는 날개", "보깅 클럽의 스포트라이트"],
    adlibs: ["Act like an angel and dress like crazy!", "Anti-ti-ti-ti fragile!", "All the girls are girling!"],
  },
  ive: {
    // Elegant Synthwave & Syncopated Royal Pop
    kickPattern: [1, 0, 0, 0.7, 1, 0, 0, 0, 1, 0, 0.65, 0, 1, 0, 0.8, 0],
    snarePattern: [0, 0, 0, 0, 1, 0, 0, 0.35, 0, 0.3, 0, 0, 1, 0, 0, 0.45],
    hiHatPattern: [0.9, 0.5, 0.9, 0.5, 0.9, 0.5, 1, 0.6, 0.9, 0.5, 0.9, 0.5, 1, 0.6, 1, 0.8],
    swingAmount: 0.12,
    beatSwitchMode: "band_buildup",
    verseMelody: [7, -99, 5, 3, 2, -99, 3, 5, 7, -99, 10, 7, 5, -99, 3, -99],
    preChorusMelody: [3, 5, 7, 10, -99, 9, 7, 5, 7, 10, 12, 14, -99, 12, 10, -99],
    chorusMelody: [12, -99, 15, 14, 12, -99, 10, 7, -99, 12, 14, 15, 17, -99, 15, 12],
    bridgeMelody: [7, -99, -99, 10, 12, -99, 14, 15, -99, 17, 19, -99, 17, 15, 14, 12],
    worldviewKeywords: ["거울 속의 나르시시즘", "숨참고 뛰어드는 로열 다이브", "일곱 빛깔 황금 왕관", "태양을 삼킨 호랑이", "화려한 스포트라이트"],
    adlibs: ["Narcissistic, my god I love it!", "숨참고 Love Dive!", "I AM on the royal stage!"],
  },
  gdragon: {
    // Swag Hip-Hop Bounce + Crooked Rock-Synth Anthem
    kickPattern: [1, 0, 0, 0.85, 0, 0.6, 0.9, 0, 1, 0, 0, 0.75, 0, 0.8, 0, 0.65],
    snarePattern: [0, 0, 0.3, 0, 1, 0, 0, 0.5, 0, 0, 0.35, 0, 1, 0, 0.45, 0.6],
    hiHatPattern: [1, 0.5, 0.9, 2, 0.8, 0.5, 1, 0.6, 1, 0.5, 0.9, 2, 1, 0.6, 1, 2],
    swingAmount: 0.19,
    beatSwitchMode: "halftime_verse2",
    verseMelody: [0, 2, 3, 2, 0, -99, 7, 5, 3, 2, 0, -99, -2, 0, 3, -99],
    preChorusMelody: [3, -99, 5, 7, 8, -99, 7, 5, 7, -99, 10, 12, -99, 10, 7, 5],
    chorusMelody: [12, 10, 7, -99, 8, 7, 5, 3, -99, 7, 10, 12, 15, -99, 12, -99],
    bridgeMelody: [7, -99, 5, 3, 2, -99, 3, 5, 7, -99, 10, 12, 14, 15, 12, -99],
    worldviewKeywords: ["꽃잎 하나 뗀 데이지", "삐딱하게 흔드는 밤거리", "88년의 아이코닉 스웨그", "마이크 하나로 뒤집는 판", "화려한 조명 뒤의 진심"],
    adlibs: ["Now I got the POWER!", "오늘 밤은 삐딱하게!", "Guess who's back, yeah!"],
  },
  riize: {
    // Funky Slap Bass & Emotional Boyish Pop
    kickPattern: [1, 0, 0, 0.75, 0, 0.8, 0, 0, 1, 0, 0.7, 0, 0, 0.85, 0, 0.5],
    snarePattern: [0, 0, 0.35, 0, 1, 0, 0.4, 0, 0, 0.45, 0, 0, 1, 0, 0.35, 0.5],
    hiHatPattern: [0.9, 0.5, 1, 0.6, 0.9, 0.5, 1, 0.7, 0.9, 0.5, 1, 0.6, 0.9, 0.6, 1, 0.9],
    swingAmount: 0.17,
    beatSwitchMode: "breakbeat_chorus",
    verseMelody: [0, 4, 7, -99, 9, 7, 4, -99, 2, 4, 7, 4, 2, 0, -99, -99],
    preChorusMelody: [4, -99, 7, 9, 11, -99, 12, 9, 7, -99, 9, 11, 12, 14, -99, -99],
    chorusMelody: [12, 9, 7, 4, -99, 7, 9, 12, -99, 14, 12, 9, 7, 4, 2, 0],
    bridgeMelody: [7, -99, 9, 11, 12, -99, 14, 16, -99, 14, 12, 9, 7, -99, 9, 12],
    worldviewKeywords: ["여섯 줄의 펑키한 기타", "심장을 울리는 붐붐 베이스", "첫눈처럼 찾아온 응급신호 119", "함께 성장하는 청춘의 리듬", "불가능을 넘어서는 스텝"],
    adlibs: ["Baby get a guitar!", "Feel that Boom Boom Bass!", "We RIIZE together tonight!"],
  },
};

export function blendMusicalDNA(
  a1Id: string,
  a2Id: string | undefined,
  collabRatio: number,
  rootNote: number,
  scale: MusicalDNA["scale"],
  seedOffset: number = 0
): MusicalDNA {
  const sig1 = ARTIST_MUSICAL_SIGNATURES[a1Id] || ARTIST_MUSICAL_SIGNATURES.newjeans;
  const sig2 = a2Id ? ARTIST_MUSICAL_SIGNATURES[a2Id] || sig1 : sig1;
  const preset1 = KPOP_ARTISTS.find((a) => a.id === a1Id) || KPOP_ARTISTS[0];
  const preset2 = a2Id ? KPOP_ARTISTS.find((a) => a.id === a2Id) : undefined;

  const r1 = collabRatio / 100;

  // Blend 16-step drum patterns irregularly based on collabRatio!
  const kickPattern = sig1.kickPattern.map((v, idx) =>
    idx < 8 ? v : r1 >= 0.5 ? (idx % 2 === 0 ? sig2.kickPattern[idx] : v) : sig2.kickPattern[idx]
  );
  const snarePattern = sig1.snarePattern.map((v, idx) =>
    idx % 4 === 2 ? sig2.snarePattern[idx] : Math.max(v, sig2.snarePattern[idx] * (1 - r1))
  );
  const hiHatPattern = sig1.hiHatPattern.map((v, idx) =>
    idx >= 8 ? sig2.hiHatPattern[idx] : v
  );

  // Rotate / mutate melodies slightly by seedOffset so every generated track has a unique melody
  const rotateMelody = (arr: number[], shift: number) => {
    const s = ((shift % arr.length) + arr.length) % arr.length;
    return [...arr.slice(s), ...arr.slice(0, s)];
  };

  const verseMelody = rotateMelody(sig1.verseMelody, seedOffset * 2);
  const preChorusMelody = rotateMelody(sig2.preChorusMelody, seedOffset);
  // Combine Artist 1 & Artist 2 chorus hooks for Collab Chorus!
  const chorusMelody = [
    ...rotateMelody(sig1.chorusMelody, seedOffset).slice(0, 8),
    ...rotateMelody(sig2.chorusMelody, seedOffset * 3).slice(8, 16),
  ];
  const bridgeMelody = rotateMelody(sig1.bridgeMelody, seedOffset);

  const chordProgression =
    scale === "major"
      ? [
          [0, 4, 7, 11],
          [7, 11, 14, 18],
          [9, 12, 16, 19],
          [5, 9, 12, 16],
        ]
      : [
          [0, 3, 7, 10],
          [8, 12, 15, 19],
          [3, 7, 10, 14],
          [7, 10, 14, 17],
        ];

  return {
    synthArchetype: preset1.synthArchetype,
    secondaryArchetype: preset2?.synthArchetype,
    rootNote,
    scale,
    chordProgression,
    melodyMotif: chorusMelody.filter((n) => n !== -99).slice(0, 8),
    verseMelody,
    preChorusMelody,
    chorusMelody,
    bridgeMelody,
    kickPattern,
    snarePattern,
    hiHatPattern,
    swingAmount: Number((sig1.swingAmount * r1 + sig2.swingAmount * (1 - r1)).toFixed(2)),
    beatSwitchMode: sig2.beatSwitchMode !== "none" ? sig2.beatSwitchMode : sig1.beatSwitchMode,
    bassGroove:
      preset1.synthArchetype === "uk_garage"
        ? "garage_sub"
        : preset1.synthArchetype === "boom_bap"
          ? "sustained_808"
          : preset1.synthArchetype === "rock_band"
            ? "driving_8th"
            : "syncopated_slap",
    drumDensity: 0.92,
    brightness: 0.88,
  };
}

export async function generateKpopTrack(input: ComposeInput): Promise<Track> {
  const presets: ArtistPreset[] = input.selectedArtistIds
    .map((id) => KPOP_ARTISTS.find((a) => a.id === id))
    .filter((a): a is ArtistPreset => Boolean(a));

  if (input.customArtistName && input.customArtistName.trim()) {
    const customName = input.customArtistName.trim();
    presets.push({
      id: `custom-${Date.now()}`,
      name: customName,
      koreanName: customName,
      groupType: "Solo",
      agencyStyle: "Custom K-POP Studio",
      signatureSound: `${customName} 특유의 독보적인 보컬 음색과 변칙적인 리듬 감성`,
      vocalStyle: `${customName} Signature Vocal`,
      representativeHits: [customName],
      defaultBpm: input.bpm || 128,
      defaultKey: "E Minor",
      synthArchetype: "uk_garage",
      primaryColor: "#ec4899",
      secondaryColor: "#8b5cf6",
      emoji: "✨",
      genres: [input.genre || "Y2K / UK Garage"],
    });
  }

  if (presets.length === 0) {
    presets.push(KPOP_ARTISTS[0]);
  }

  const primaryArtist = presets[0];
  const secondaryArtist = presets.length > 1 ? presets[1] : undefined;
  const isCollab = presets.length > 1;
  const collabRatio = input.collabRatio ?? 50;

  const calculatedBpm =
    input.bpm ||
    (secondaryArtist
      ? Math.round(
          (primaryArtist.defaultBpm * collabRatio +
            secondaryArtist.defaultBpm * (100 - collabRatio)) /
            100
        )
      : primaryArtist.defaultBpm);

  const musicalKey = primaryArtist.defaultKey || "F# Minor";
  const rootNote = KEY_TO_MIDI[musicalKey] || 64;

  const apiKey = (input.apiKey || process.env.GEMINI_API_KEY || "").trim();

  if (apiKey) {
    try {
      const geminiResult = await callGeminiComposer(
        apiKey,
        presets,
        input,
        calculatedBpm,
        musicalKey
      );
      if (geminiResult) {
        return buildTrackObject(
          input,
          presets,
          isCollab,
          collabRatio,
          calculatedBpm,
          musicalKey,
          rootNote,
          geminiResult
        );
      }
    } catch (err) {
      console.warn("Gemini API fallback triggered:", err);
    }
  }

  const fallbackResult = buildSmartKpopComposition(
    presets,
    input,
    calculatedBpm,
    musicalKey
  );

  return buildTrackObject(
    input,
    presets,
    isCollab,
    collabRatio,
    calculatedBpm,
    musicalKey,
    rootNote,
    fallbackResult
  );
}

interface GeneratedSongContent {
  title: string;
  englishTitle: string;
  styleAnalysis: string;
  collabPoint: string;
  tags: string[];
  conceptKeyword: string;
  lyrics: LyricLine[];
  verseMelody?: number[];
  preChorusMelody?: number[];
  chorusMelody?: number[];
}

async function callGeminiComposer(
  apiKey: string,
  presets: ArtistPreset[],
  input: ComposeInput,
  bpm: number,
  musicalKey: string
): Promise<GeneratedSongContent | null> {
  const artistDescriptions = presets
    .map((a) => {
      const roster = ARTIST_MEMBER_ROSTERS[a.id];
      const memberStr = roster ? `실제 멤버 구성: ${roster.allMembers.join(", ")}` : "";
      return `- ${a.name} (${a.koreanName}): ${a.signatureSound} / 대표곡: ${a.representativeHits.join(", ")} / 보컬: ${a.vocalStyle} / ${memberStr}`;
    })
    .join("\n");

  const ytDescriptions =
    input.youtubeRefs.length > 0
      ? input.youtubeRefs.map((y) => `- ${y.title} (${y.url})`).join("\n")
      : "- 아티스트 기본 대표곡 레퍼런스";

  const r1 = ARTIST_MEMBER_ROSTERS[presets[0].id] || ARTIST_MEMBER_ROSTERS.aespa;
  const r2 = ARTIST_MEMBER_ROSTERS[presets[presets.length > 1 ? 1 : 0].id] || r1;

  const prompt = `당신은 대한민국 최고의 K-POP 총괄 프로듀서이자 작사가입니다.
사용자가 선택한 아티스트(들)의 실제 멤버별 보컬 음색·랩 포지션·세계관·리듬 스타일과 유튜브 레퍼런스, 그리고 요청한 컨셉을 바탕으로 완전히 새로운 K-POP 생성 음악(실제 멤버별 피치 합성 보컬 엔진으로 노래할 곡)을 작곡/작사해주세요.

[선택된 아티스트 및 실제 멤버]
${artistDescriptions}
${presets.length > 1 ? `콜라보 블렌딩 비율: ${presets[0].koreanName} ${input.collabRatio ?? 50}% × ${presets[1].koreanName} ${100 - (input.collabRatio ?? 50)}%` : ""}

[참고한 유튜브/음원 레퍼런스]
${ytDescriptions}

[장르 및 무드 설정]
- 장르: ${input.genre}
- 무드: ${input.mood}
- 템포/키: ${bpm} BPM, ${musicalKey}
- 사용자 요청 컨셉/프롬프트: ${input.customPrompt || "아티스트 멤버들의 시그니처 보컬과 세계관이 폭발하는 타이틀곡"}

[중요 지침]
1. 각 파트(INTRO, VERSE 1, PRE-CHORUS, CHORUS, RAP / VERSE 2, BRIDGE, FINAL CHORUS, OUTRO)의 vocal 필드에 반드시 실제 멤버 이름과 포지션(예: "${r1.rapVocal}", "${r1.leadVocal}", "${r2.highVocal}", "${r1.subVocal}", "${r1.groupHarmony}")을 명시하세요!
2. 가사(line, subline)는 해당 파트를 부르는 실제 멤버의 창법(예: 카리나/지젤의 타이트한 랩, 윈터/닝닝의 초고음 벨팅, 하니/해린의 몽환적 음색, 원필/성진의 록 보컬, 필릭스의 동굴 저음 등)이 그대로 느껴지도록 한국어와 영어 훅을 자연스럽게 섞어 작사하세요.
3. 멜로디 배열(verseMelody, preChorusMelody, chorusMelody)은 길이 16의 정수 배열이며 루트 음 기준 반음 간격(0, 2, 3, 5, 7, 10, 12, 15 등)과 쉼표(-99)를 섞어 싱코페이션과 도약이 있는 다채로운 멜로디로 작성하세요.

반드시 아래 JSON 스키마 형식으로만 응답하세요:
{
  "title": "컨셉과 아티스트 매력이 살아있는 곡 제목",
  "englishTitle": "영문 부제",
  "styleAnalysis": "불규칙한 리듬 변주(비트 스위치/싱코페이션)와 멤버별 보컬 음색이 어떻게 결합되었는지 2문장 설명",
  "collabPoint": "멤버별 보컬/랩 파트 분배와 하모니 킬링 포인트 설명",
  "tags": ["태그1", "태그2", "태그3", "태그4"],
  "conceptKeyword": "영문 컨셉 키워드",
  "verseMelody": [0, -99, 3, 5, -99, 7, 5, 3, -99, 2, 3, -99, 5, 3, 0, -99],
  "preChorusMelody": [3, 5, 7, -99, 10, 9, 7, 5, 7, -99, 10, 12, -99, 10, 7, -99],
  "chorusMelody": [12, -99, 10, 7, -99, 5, 7, 10, -99, 12, 15, 12, 10, -99, 7, 5],
  "lyrics": [
    { "time": 0, "section": "INTRO", "vocal": "${r1.rapVocal}", "line": "한국어/영어 가사", "subline": "보조 가사 및 애드리브" },
    { "time": 4.5, "section": "VERSE 1", "vocal": "${r1.leadVocal}", "line": "...", "subline": "..." },
    { "time": 9, "section": "PRE-CHORUS", "vocal": "${r2.highVocal}", "line": "...", "subline": "..." },
    { "time": 13.5, "section": "CHORUS", "vocal": "${r1.groupHarmony}", "line": "...", "subline": "..." },
    { "time": 18, "section": "RAP / VERSE 2", "vocal": "${r2.rapVocal}", "line": "...", "subline": "..." },
    { "time": 22.5, "section": "BRIDGE", "vocal": "${r1.subVocal}", "line": "...", "subline": "..." },
    { "time": 27, "section": "FINAL CHORUS", "vocal": "${r1.groupHarmony}", "line": "...", "subline": "..." },
    { "time": 31.5, "section": "OUTRO", "vocal": "${r2.subVocal}", "line": "...", "subline": "..." }
  ]
}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
      apiKey
    )}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.9,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini HTTP ${response.status}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) return null;

  const parsed = JSON.parse(rawText) as GeneratedSongContent;
  if (!parsed.title || !Array.isArray(parsed.lyrics) || parsed.lyrics.length < 4) {
    return null;
  }
  return parsed;
}

function buildSmartKpopComposition(
  presets: ArtistPreset[],
  input: ComposeInput,
  bpm: number,
  musicalKey: string
): GeneratedSongContent {
  const a1 = presets[0];
  const a2 = presets.length > 1 ? presets[1] : presets[0];
  const isCollab = presets.length > 1;

  const sig1 = ARTIST_MUSICAL_SIGNATURES[a1.id] || ARTIST_MUSICAL_SIGNATURES.newjeans;
  const sig2 = ARTIST_MUSICAL_SIGNATURES[a2.id] || sig1;
  const r1 = ARTIST_MEMBER_ROSTERS[a1.id] || ARTIST_MEMBER_ROSTERS.aespa;
  const r2 = ARTIST_MEMBER_ROSTERS[a2.id] || r1;

  const hit1 = a1.representativeHits[Math.floor(Math.random() * a1.representativeHits.length)] || a1.name;
  const hit2 = a2.representativeHits[Math.floor(Math.random() * a2.representativeHits.length)] || a2.name;

  const w1 = sig1.worldviewKeywords;
  const w2 = sig2.worldviewKeywords;
  const kw1 = w1[Math.floor(Math.random() * w1.length)];
  const kw2 = w2[Math.floor(Math.random() * w2.length)];
  const kw3 = w1[(Math.floor(Math.random() * w1.length) + 1) % w1.length];

  const userConcept = input.customPrompt.trim();
  const conceptPhrase = userConcept || `${kw1}에서 만난 ${kw2}`;

  const titleCandidates = isCollab
    ? [
        `${userConcept ? userConcept.slice(0, 14) : `${kw1.split(" ")[0]} × ${kw2.split(" ")[0]}`} (${a1.name} × ${a2.name})`,
        `${hit1} in ${hit2} (${kw1})`,
        `Parallel Signal: ${a1.koreanName} × ${a2.koreanName}`,
      ]
    : [
        `${userConcept ? userConcept.slice(0, 16) : kw1} (${a1.name} New Single)`,
        `After ${hit1} (${kw3})`,
      ];

  const title = titleCandidates[0];
  const englishTitle = isCollab
    ? `${a1.name} x ${a2.name} Real Member Vocal`
    : `${a1.name} (${r1.allMembers.map((m) => m.split(" ")[0]).join(" · ")}) Vocal Mix`;

  const ytRefTitle =
    input.youtubeRefs[0]?.title
      ?.replace(/\[.*?\]|\(.*?\)|Official|MV|M\/V/gi, "")
      .trim() || "";

  const styleAnalysis = isCollab
    ? `${a1.koreanName}(${r1.leadVocal.split(" ")[0]}·${r1.highVocal.split(" ")[0]})와 ${a2.koreanName}(${r2.leadVocal.split(" ")[0]}·${r2.highVocal.split(" ")[0]}) 멤버들의 실제 음역대와 포지션별 포먼트 음색을 PSOLA 멜로디 피치 보코더로 합성했습니다.${
        ytRefTitle ? ` 유튜브 '${ytRefTitle}'의 편곡 에너지를 반영했습니다.` : ""
      }`
    : `${a1.koreanName} 멤버들(${r1.allMembers.join(", ")})의 실제 파트 분배(메인보컬·리드보컬·메인래퍼)와 고유 음색 포먼트를 멜로디 음정에 맞춰 피치 합성했습니다.`;

  const collabPoint = isCollab
    ? `도입부와 1절은 ${r1.leadVocal}의 음색으로 시작해, 프리코러스에서 ${r2.highVocal}의 고음 빌드를 거쳐 후렴구에서 두 그룹 멤버 전원이 더블링 화음을 터뜨립니다.`
    : `도입부 ${r1.rapVocal}의 시그니처 톤에서 1절 ${r1.leadVocal}, 프리코러스 ${r1.highVocal}의 고음 도약, 그리고 후렴구 ${r1.groupHarmony}로 이어지는 실제 타이틀곡 파트 구성을 구현했습니다.`;

  const lyrics: LyricLine[] = [
    {
      time: 0,
      section: "INTRO",
      vocal: isCollab ? `${r1.subVocal} × ${r2.rapVocal}` : r1.rapVocal,
      line: `${sig1.adlibs[0]}, ${kw1} 위로 불이 켜지는 밤`,
      subline: userConcept ? `${userConcept}, 지금 시작해` : `${sig2.adlibs[0]}`,
    },
    {
      time: 4.5,
      section: "VERSE 1",
      vocal: r1.leadVocal,
      line: userConcept
        ? `${userConcept} 속을 걸어가던 너와 나의 발걸음`
        : `${kw1} 끝에 스며든 낯설고도 황홀한 이 떨림`,
      subline: `${kw3}처럼 선명해지는 우리의 새로운 멜로디`,
    },
    {
      time: 9,
      section: "PRE-CHORUS",
      vocal: isCollab ? r2.highVocal : r1.highVocal,
      line: `익숙했던 박자가 깨지고 ${kw2}의 문이 열릴 때`,
      subline: `망설이지 말고 내 손을 잡아, 심장이 더 빨리 뛰잖아`,
    },
    {
      time: 13.5,
      section: "CHORUS",
      vocal: isCollab
        ? `${r1.highVocal.split(" ")[0]} × ${r2.leadVocal.split(" ")[0]} (콜라보 메인 하모니)`
        : r1.groupHarmony,
      line: `노래해 ${conceptPhrase}! 별빛보다 찬란히 터져 나와!`,
      subline: `${sig1.adlibs[1]}! 우리의 목소리가 하나 되는 순간`,
    },
    {
      time: 18,
      section: "RAP / VERSE 2",
      vocal: isCollab ? r2.rapVocal : `${r1.rapVocal} & ${r1.leadVocal.split(" ")[0]}`,
      line: `${sig2.adlibs[1]}! 정해진 규칙 따윈 뒤집어버리는 플로우`,
      subline: `${kw2} 한가운데서 우리가 새롭게 써 내려가는 쇼`,
    },
    {
      time: 22.5,
      section: "BRIDGE",
      vocal: isCollab ? `${r1.subVocal} & ${r2.highVocal}` : `${r1.subVocal} & ${r1.highVocal.split(" ")[0]}`,
      line: `잠시 모든 비트가 멈추고 우리 숨소리만 남은 이 밤`,
      subline: `영원히 기억될 ${kw3}의 마지막 페이지를 넘어`,
    },
    {
      time: 27,
      section: "FINAL CHORUS",
      vocal: isCollab
        ? `${a1.name} × ${a2.name} 전원 합창 하모니`
        : r1.groupHarmony,
      line: `다시 한 번 외쳐 ${conceptPhrase}! 끝없이 울려 퍼져라!`,
      subline: `${sig2.adlibs[2]}, 이 밤의 주인공은 바로 우리니까!`,
    },
    {
      time: 31.5,
      section: "OUTRO",
      vocal: isCollab ? r2.subVocal : r1.subVocal,
      line: `귓가에 맴도는 ${a1.koreanName}${isCollab ? ` 그리고 ${a2.koreanName}` : ""}의 여운...`,
      subline: `${sig1.adlibs[0]}`,
    },
  ];

  return {
    title,
    englishTitle,
    styleAnalysis,
    collabPoint,
    tags: [
      isCollab ? `${a1.koreanName}x${a2.koreanName}` : `${a1.koreanName}멤버보컬`,
      "멤버별파트분배",
      "피치싱잉합성",
      input.genre.split("/")[0].trim(),
    ],
    conceptKeyword: isCollab
      ? `${a1.name.toUpperCase()} × ${a2.name.toUpperCase()}`
      : `${a1.name.toUpperCase()} MEMBERS AI`,
    lyrics,
  };
}

function buildTrackObject(
  input: ComposeInput,
  presets: ArtistPreset[],
  isCollab: boolean,
  collabRatio: number,
  bpm: number,
  musicalKey: string,
  rootNote: number,
  content: GeneratedSongContent
): Track {
  const a1 = presets[0];
  const a2 = presets.length > 1 ? presets[1] : presets[0];

  const patterns: CoverArtConfig["patternType"][] = [
    "cyber_chrome",
    "y2k_dream",
    "neon_vinyl",
    "band_sunset",
    "velvet_noir",
    "prism_glass",
  ];

  const coverConfig: CoverArtConfig = {
    gradientFrom: a1.primaryColor,
    gradientVia: isCollab ? a2.primaryColor : a1.secondaryColor,
    gradientTo: isCollab ? a2.secondaryColor : "#1e1b4b",
    accentColor: "#fef08a",
    patternType: patterns[Math.floor(Math.random() * patterns.length)],
    badgeText: presets.map((p) => p.name.toUpperCase()).join(" × "),
    conceptKeyword: content.conceptKeyword || "KPOP AI VOCAL",
  };

  const scale: MusicalDNA["scale"] = musicalKey.toLowerCase().includes("major")
    ? "major"
    : musicalKey.toLowerCase().includes("f ")
      ? "phrygian"
      : "minor";

  const seedOffset = Math.floor(Math.random() * 7) + 1;
  const musicalDna = blendMusicalDNA(
    a1.id,
    isCollab ? a2.id : undefined,
    collabRatio,
    rootNote,
    scale,
    seedOffset
  );

  if (Array.isArray(content.verseMelody) && content.verseMelody.length === 16) {
    musicalDna.verseMelody = content.verseMelody;
  }
  if (Array.isArray(content.preChorusMelody) && content.preChorusMelody.length === 16) {
    musicalDna.preChorusMelody = content.preChorusMelody;
  }
  if (Array.isArray(content.chorusMelody) && content.chorusMelody.length === 16) {
    musicalDna.chorusMelody = content.chorusMelody;
  }

  const artistIds = presets.map((p) => p.id);
  const memberAssignedLyrics = assignRealMemberVocals(artistIds, content.lyrics).map(
    (line, idx) => ({
      ...line,
      time: Number((idx * 4.5).toFixed(1)),
    })
  );

  return {
    id: `track-${Date.now()}`,
    title: content.title,
    englishTitle: content.englishTitle,
    creatorId: input.creatorId,
    creatorName: input.creatorName,
    creatorHandle: input.creatorHandle,
    artists: artistIds,
    artistNames: presets.map((p) => `${p.name} (${p.koreanName})`),
    isCollab,
    collabRatio,
    youtubeRefs: input.youtubeRefs,
    genre: input.genre,
    tags: content.tags,
    mood: input.mood,
    bpm,
    musicalKey,
    duration: 38,
    styleAnalysis: content.styleAnalysis,
    collabPoint: content.collabPoint,
    coverConfig,
    musicalDna,
    lyrics: memberAssignedLyrics,
    plays: 1,
    likesCount: 0,
    isLiked: false,
    createdAt: new Date().toISOString(),
  };
}
