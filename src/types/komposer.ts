export interface ArtistPreset {
  id: string;
  name: string;
  koreanName: string;
  groupType: "Girl Group" | "Boy Group" | "Solo" | "Band" | "Co-ed";
  agencyStyle: string;
  signatureSound: string;
  vocalStyle: string;
  representativeHits: string[];
  defaultBpm: number;
  defaultKey: string;
  synthArchetype: "uk_garage" | "hyperpop" | "boom_bap" | "synthwave" | "rock_band" | "rnb_ballad" | "disco_pop" | "jersey_club";
  primaryColor: string;
  secondaryColor: string;
  emoji: string;
  genres: string[];
}

export interface YoutubeReference {
  url: string;
  videoId?: string;
  title: string;
  author?: string;
  thumbnailUrl?: string;
}

export interface LyricLine {
  time: number; // seconds from start
  section: "INTRO" | "VERSE 1" | "PRE-CHORUS" | "CHORUS" | "RAP / VERSE 2" | "BRIDGE" | "FINAL CHORUS" | "OUTRO";
  vocal: string; // e.g., "NewJeans Style", "aespa Style", "Collab Harmony"
  line: string;
  subline?: string; // English / Romanized / ad-lib
}

export interface MusicalDNA {
  synthArchetype: "uk_garage" | "hyperpop" | "boom_bap" | "synthwave" | "rock_band" | "rnb_ballad" | "disco_pop" | "jersey_club";
  secondaryArchetype?: "uk_garage" | "hyperpop" | "boom_bap" | "synthwave" | "rock_band" | "rnb_ballad" | "disco_pop" | "jersey_club";
  rootNote: number; // MIDI note for key root (e.g., 60 = C4)
  scale: "minor" | "major" | "dorian" | "phrygian";
  chordProgression: number[][]; // Array of 4 chords (semitone offsets from root)
  melodyMotif: number[]; // Scale degree offsets for lead hook
  bassGroove: "bouncy" | "sustained_808" | "driving_8th" | "syncopated_slap" | "garage_sub";
  drumDensity: number; // 0.5 to 1.0
  brightness: number; // 0.3 to 1.0
}

export interface CoverArtConfig {
  gradientFrom: string;
  gradientVia: string;
  gradientTo: string;
  accentColor: string;
  patternType: "cyber_chrome" | "y2k_dream" | "neon_vinyl" | "band_sunset" | "velvet_noir" | "prism_glass";
  badgeText: string;
  conceptKeyword: string;
  aiPrompt?: string;
}

export interface Track {
  id: string;
  title: string;
  englishTitle: string;
  creatorId: string;
  creatorName: string;
  creatorHandle: string;
  artists: string[]; // Artist IDs or names
  artistNames: string[]; // Display names e.g. ["NewJeans (뉴진스)", "aespa (에스파)"]
  isCollab: boolean;
  collabRatio: number; // 10 to 90 (50 = 50:50 blend)
  youtubeRefs: YoutubeReference[];
  genre: string;
  tags: string[];
  mood: string;
  bpm: number;
  musicalKey: string;
  duration: number; // in seconds, e.g., 96
  styleAnalysis: string;
  collabPoint: string;
  coverConfig: CoverArtConfig;
  musicalDna: MusicalDNA;
  lyrics: LyricLine[];
  plays: number;
  likesCount: number;
  isLiked?: boolean;
  matchScore?: number;
  matchReasons?: string[];
  createdAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  handle: string;
  bio: string;
  avatarColor: string;
  favoriteArtists: string[];
  favoriteGenres: string[];
  createdAt: string;
}

export const KPOP_GENRES: {
  id: string;
  name: string;
  desc: string;
  color: string;
}[] = [
  { id: "Y2K / UK Garage", name: "Y2K / UK 개러지", desc: "몽환적인 신스와 투스텝 드럼의 트렌디한 이지리스닝", color: "#60a5fa" },
  { id: "Hyperpop / Metallic", name: "하이퍼팝 / 쇠맛 일렉트로", desc: "강렬한 메탈릭 베이스와 변칙적인 넥스트 레벨 사운드", color: "#c084fc" },
  { id: "Jersey Club / Dance", name: "저지 클럽 / 댄스팝", desc: "통통 튀는 킥 리듬과 중독성 강한 후크 중심 댄스", color: "#f472b6" },
  { id: "Hip-Hop / Trap", name: "힙합 / 하드 트랩", desc: "묵직한 808 베이스와 폭발적인 래핑·퍼포먼스 비트", color: "#fb923c" },
  { id: "K-Band / Youth Rock", name: "청량 밴드 / 청춘 록", desc: "벅차오르는 일렉 기타와 드럼 사운드의 청춘 밴드", color: "#34d399" },
  { id: "Synthwave / Retro", name: "신스웨이브 / 시티팝", desc: "80년대 레트로 아날로그 신스와 세련된 밤 드라이브 무드", color: "#38bdf8" },
  { id: "R&B / Emotional Ballad", name: "감성 R&B / 음색 발라드", desc: "섬세한 보컬 하모니와 따뜻한 일렉트릭 피아노 선율", color: "#fbbf24" },
  { id: "Disco / Funk Pop", name: "디스코 / 하이틴 펑크", desc: "화려한 브라스와 그루비한 베이스라인의 하이틴 팝", color: "#fb7185" },
];

export const KPOP_ARTISTS: ArtistPreset[] = [
  {
    id: "newjeans",
    name: "NewJeans",
    koreanName: "뉴진스",
    groupType: "Girl Group",
    agencyStyle: "ADOR / Y2K Minimal Groove",
    signatureSound: "UK 개러지·저지 클럽 리듬 위에 얹힌 맑고 힘 뺀 가성 보컬과 아련한 코드 진행",
    vocalStyle: "Airy & Natural Y2K R&B",
    representativeHits: ["Ditto", "Hype Boy", "Super Shy", "OMG"],
    defaultBpm: 134,
    defaultKey: "F# Minor",
    synthArchetype: "uk_garage",
    primaryColor: "#3b82f6",
    secondaryColor: "#93c5fd",
    emoji: "🐰",
    genres: ["Y2K / UK Garage", "Jersey Club / Dance", "R&B / Emotional Ballad"],
  },
  {
    id: "aespa",
    name: "aespa",
    koreanName: "에스파",
    groupType: "Girl Group",
    agencyStyle: "SM / Metallic Hyperpop",
    signatureSound: "묵직한 메탈릭 디스토션 신스 베이스('쇠맛')와 폭발적인 고음 브릿지, 퓨처리스틱 비트 전환",
    vocalStyle: "Powerful High-Note & Sharp Metallic Rap",
    representativeHits: ["Supernova", "Armageddon", "Whiplash", "Next Level"],
    defaultBpm: 124,
    defaultKey: "E Minor",
    synthArchetype: "hyperpop",
    primaryColor: "#a855f7",
    secondaryColor: "#ec4899",
    emoji: "🪐",
    genres: ["Hyperpop / Metallic", "Hip-Hop / Trap", "Jersey Club / Dance"],
  },
  {
    id: "day6",
    name: "DAY6",
    koreanName: "데이식스",
    groupType: "Band",
    agencyStyle: "JYP Studio J / Youth Band Rock",
    signatureSound: "청량하고 벅차오르는 밴드 풀사운드, 건반과 일렉기타의 조화, 공감 가는 청춘 서사 보컬",
    vocalStyle: "Emotional Husky Rock Vocal",
    representativeHits: ["한 페이지가 될 수 있게", "예뻤어", "Welcome to the Show", "HAPPY"],
    defaultBpm: 142,
    defaultKey: "D Major",
    synthArchetype: "rock_band",
    primaryColor: "#10b981",
    secondaryColor: "#38bdf8",
    emoji: "🎸",
    genres: ["K-Band / Youth Rock", "Synthwave / Retro"],
  },
  {
    id: "iu",
    name: "IU",
    koreanName: "아이유",
    groupType: "Solo",
    agencyStyle: "EDAM / Lyricist Pop & Acoustic",
    signatureSound: "서정적인 어쿠스틱/피아노 선율과 동화 같은 오케스트레이션, 속삭이듯 시작해 터지는 독보적 음색",
    vocalStyle: "Warm Storytelling Falsetto & Belting",
    representativeHits: ["Love wins all", "밤편지", "라일락", "스물셋"],
    defaultBpm: 112,
    defaultKey: "Eb Major",
    synthArchetype: "rnb_ballad",
    primaryColor: "#c084fc",
    secondaryColor: "#f472b6",
    emoji: "lilac",
    genres: ["R&B / Emotional Ballad", "Disco / Funk Pop", "K-Band / Youth Rock"],
  },
  {
    id: "bts",
    name: "BTS",
    koreanName: "방탄소년단",
    groupType: "Boy Group",
    agencyStyle: "BIGHIT / Global Pop & Hip-Hop Anthem",
    signatureSound: "감각적인 랩 라인과 트렌디한 팝 보컬의 완벽한 밸런스, 스타디움 스케일의 코러스 드롭",
    vocalStyle: "Dynamic Rap-Vocal Synergy & Falsetto Groove",
    representativeHits: ["Dynamite", "봄날 (Spring Day)", "Butter", "달려라 방탄"],
    defaultBpm: 118,
    defaultKey: "C# Minor",
    synthArchetype: "disco_pop",
    primaryColor: "#8b5cf6",
    secondaryColor: "#6366f1",
    emoji: "💜",
    genres: ["Disco / Funk Pop", "Hip-Hop / Trap", "R&B / Emotional Ballad"],
  },
  {
    id: "blackpink",
    name: "BLACKPINK",
    koreanName: "블랙핑크",
    groupType: "Girl Group",
    agencyStyle: "YG / EDM Trap & Brass Drop",
    signatureSound: "중동풍/브라스 리드 루프와 강렬한 808 트랩 비트, 개성 강한 보컬 톤과 피날레 댄스 브레이크",
    vocalStyle: "Fierce Low-Tone Rap & Unique Soulful Rosé/Jennie Vocal",
    representativeHits: ["How You Like That", "Pink Venom", "Shut Down", "DDU-DU DDU-DU"],
    defaultBpm: 130,
    defaultKey: "G Minor",
    synthArchetype: "boom_bap",
    primaryColor: "#f43f5e",
    secondaryColor: "#1f2937",
    emoji: "🖤",
    genres: ["Hip-Hop / Trap", "Hyperpop / Metallic"],
  },
  {
    id: "seventeen",
    name: "SEVENTEEN",
    koreanName: "세븐틴",
    groupType: "Boy Group",
    agencyStyle: "PLEDIS / Energetic Funk & Synth Anthem",
    signatureSound: "에너지 넘치는 브라스·펑크 리듬과 다인원 칼군무가 그려지는 폭발적인 떼창 코러스",
    vocalStyle: "Explosive Multi-Harmony & Rhythmic Chant",
    representativeHits: ["손오공 (Super)", "아주 NICE", "청춘찬가", "음악의 신"],
    defaultBpm: 128,
    defaultKey: "A Minor",
    synthArchetype: "disco_pop",
    primaryColor: "#f97316",
    secondaryColor: "#60a5fa",
    emoji: "💎",
    genres: ["Disco / Funk Pop", "K-Band / Youth Rock", "Hip-Hop / Trap"],
  },
  {
    id: "lesserafim",
    name: "LE SSERAFIM",
    koreanName: "르세라핌",
    groupType: "Girl Group",
    agencyStyle: "SOURCE MUSIC / Runway Club & Afro-House",
    signatureSound: "런웨이 워킹이 연상되는 세련된 하우스·아프로 라틴 베이스라인과 중독성 있는 반복 챈트",
    vocalStyle: "Chic Low-Register Chant & Groovy R&B",
    representativeHits: ["CRAZY", "Smart", "ANTIFRAGILE", "Perfect Night"],
    defaultBpm: 126,
    defaultKey: "D Minor",
    synthArchetype: "jersey_club",
    primaryColor: "#38bdf8",
    secondaryColor: "#818cf8",
    emoji: "⚡",
    genres: ["Jersey Club / Dance", "Y2K / UK Garage", "Hyperpop / Metallic"],
  },
  {
    id: "straykids",
    name: "Stray Kids",
    koreanName: "스트레이 키즈",
    groupType: "Boy Group",
    agencyStyle: "JYP 3RACHA / Mala-Taste Experimental Trap",
    signatureSound: "속사포 랩과 강렬한 디스토션 브라스, 예측불허의 템포 체인지가 돋보이는 '마라맛' 일렉트로 트랩",
    vocalStyle: "Deep Felix Bass & Aggressive Fast-Flow Rap",
    representativeHits: ["Chk Chk Boom", "신메뉴 (God's Menu)", "특 (S-Class)", "락 (LALALALA)"],
    defaultBpm: 138,
    defaultKey: "F Minor",
    synthArchetype: "boom_bap",
    primaryColor: "#ef4444",
    secondaryColor: "#f59e0b",
    emoji: "🧭",
    genres: ["Hip-Hop / Trap", "Hyperpop / Metallic"],
  },
  {
    id: "ive",
    name: "IVE",
    koreanName: "아이브",
    groupType: "Girl Group",
    agencyStyle: "STARSHIP / Narcissistic Elegant Pop",
    signatureSound: "화려하고 우아한 현악/신스 라인과 당당한 나르시시즘 세계관, 벅차오르는 다이브 코러스",
    vocalStyle: "Elegant High-Teen & Mysterious Low Drop",
    representativeHits: ["LOVE DIVE", "I AM", "해야 (HEYA)", "After LIKE"],
    defaultBpm: 122,
    defaultKey: "B Minor",
    synthArchetype: "synthwave",
    primaryColor: "#ec4899",
    secondaryColor: "#fbbf24",
    emoji: "👑",
    genres: ["Synthwave / Retro", "Disco / Funk Pop", "Jersey Club / Dance"],
  },
  {
    id: "gdragon",
    name: "G-DRAGON",
    koreanName: "지드래곤",
    groupType: "Solo",
    agencyStyle: "Galaxy / Iconic Swag Hip-Hop & Art Pop",
    signatureSound: "독특한 하이톤 나잘 보이스 랩과 장난스럽지만 날카로운 신스 리프, 감성적인 피아노 멜로디 반전",
    vocalStyle: "Signature Nasal Flow & Raw Emotional Sing-Rap",
    representativeHits: ["POWER", "무제 (Untitled)", "삐딱하게 (Crooked)", "HOME SWEET HOME"],
    defaultBpm: 132,
    defaultKey: "C Minor",
    synthArchetype: "boom_bap",
    primaryColor: "#eab308",
    secondaryColor: "#ef4444",
    emoji: "🌼",
    genres: ["Hip-Hop / Trap", "K-Band / Youth Rock", "R&B / Emotional Ballad"],
  },
  {
    id: "riize",
    name: "RIIZE",
    koreanName: "라이즈",
    groupType: "Boy Group",
    agencyStyle: "SM / Emotional Pop & Funk Guitar",
    signatureSound: "펑키한 기타 슬랩과 하우스 리듬, 청춘의 성장을 담은 세련된 이모셔널 팝",
    vocalStyle: "Groovy Boyish R&B & Clean Chorus",
    representativeHits: ["Get A Guitar", "Boom Boom Bass", "Love 119", "Impossible"],
    defaultBpm: 125,
    defaultKey: "G Major",
    synthArchetype: "disco_pop",
    primaryColor: "#fb923c",
    secondaryColor: "#38bdf8",
    emoji: "🎸",
    genres: ["Disco / Funk Pop", "Y2K / UK Garage", "Jersey Club / Dance"],
  },
];

