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

export async function generateKpopTrack(input: ComposeInput): Promise<Track> {
  // Resolve artist presets
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
      signatureSound: `${customName} 특유의 개성 있는 보컬 톤과 트렌디한 비트 감성`,
      vocalStyle: `${customName} Signature Vocal`,
      representativeHits: [customName],
      defaultBpm: input.bpm || 126,
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

  // Intelligent K-POP Collab Synthesis Fallback
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
  melodyMotif: number[];
}

async function callGeminiComposer(
  apiKey: string,
  presets: ArtistPreset[],
  input: ComposeInput,
  bpm: number,
  musicalKey: string
): Promise<GeneratedSongContent | null> {
  const artistDescriptions = presets
    .map(
      (a) =>
        `- ${a.name} (${a.koreanName}): ${a.signatureSound} / 대표곡: ${a.representativeHits.join(", ")} / 보컬: ${a.vocalStyle}`
    )
    .join("\n");

  const ytDescriptions =
    input.youtubeRefs.length > 0
      ? input.youtubeRefs.map((y) => `- ${y.title} (${y.url})`).join("\n")
      : "- 아티스트 기본 대표곡 레퍼런스";

  const prompt = `당신은 대한민국 최고의 K-POP 총괄 프로듀서입니다.
사용자가 선택한 아티스트(들)의 스타일과 유튜브 레퍼런스를 바탕으로, 완전히 새로운 K-POP 생성 음악(Collab 또는 솔로 스타일 신곡)을 작곡/작사해주세요.

[선택된 아티스트]
${artistDescriptions}
${presets.length > 1 ? `콜라보 블렌딩 비율: ${presets[0].koreanName} ${input.collabRatio ?? 50}% × ${presets[1].koreanName} ${100 - (input.collabRatio ?? 50)}%` : ""}

[참고한 유튜브/음원 레퍼런스]
${ytDescriptions}

[장르 및 무드 설정]
- 장르: ${input.genre}
- 무드: ${input.mood}
- 템포/키: ${bpm} BPM, ${musicalKey}
- 사용자 요청 프롬프트: ${input.customPrompt || "중독성 있고 세련된 시그니처 신곡을 만들어줘"}

반드시 아래 JSON 스키마 형식으로만 응답하세요 (마크다운 코드블록 없이 순수 JSON):
{
  "title": "한국어와 영어 훅이 어우러진 매력적인 곡 제목",
  "englishTitle": "영문 부제",
  "styleAnalysis": "참조한 아티스트/유튜브 곡의 어떤 사운드적 요소(드럼, 베이스, 신스, 보컬 톤)를 결합해 이 곡을 만들었는지 2문장 설명",
  "collabPoint": "파트 분배와 코러스 하모니에서 어떤 킬링 포인트가 있는지 1~2문장 설명",
  "tags": ["태그1", "태그2", "태그3", "태그4"],
  "conceptKeyword": "앨범 커버에 들어갈 짧은 영문 컨셉 키워드 (예: NEON ECLIPSE)",
  "melodyMotif": [0, 3, 7, 10, 7, 5, 3, 2],
  "lyrics": [
    { "time": 0, "section": "INTRO", "vocal": "${presets[0].name} Style", "line": "한국어/영어 가사", "subline": "(보조 가사 또는 애드리브)" },
    { "time": 11, "section": "VERSE 1", "vocal": "${presets[0].name} Style", "line": "...", "subline": "..." },
    { "time": 22, "section": "PRE-CHORUS", "vocal": "${presets[presets.length > 1 ? 1 : 0].name} Style", "line": "...", "subline": "..." },
    { "time": 33, "section": "CHORUS", "vocal": "Collab Harmony", "line": "...", "subline": "..." },
    { "time": 45, "section": "RAP / VERSE 2", "vocal": "${presets[presets.length > 1 ? 1 : 0].name} Style", "line": "...", "subline": "..." },
    { "time": 57, "section": "BRIDGE", "vocal": "${presets[0].name} Style", "line": "...", "subline": "..." },
    { "time": 68, "section": "FINAL CHORUS", "vocal": "Collab Harmony", "line": "...", "subline": "..." },
    { "time": 78, "section": "OUTRO", "vocal": "Collab Harmony", "line": "...", "subline": "..." }
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
          temperature: 0.85,
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
  const hit1 = a1.representativeHits[0] || a1.name;
  const hit2 = a2.representativeHits[0] || a2.name;

  const ytRefTitle =
    input.youtubeRefs[0]?.title
      ?.replace(/\[.*?\]|\(.*?\)|Official|MV|M\/V/gi, "")
      .trim() || "";

  const promptKeyword = input.customPrompt.trim();

  // Creative title generation
  const titleTemplates = isCollab
    ? [
        `${hit1} × ${hit2}: Midnight Prism (새벽의 프리즘)`,
        `Neon ${hit1} (너와 나의 평행우주)`,
        `Deja Vu Wave (${a1.koreanName} × ${a2.koreanName} Mix)`,
        `Mirror Signal (거울 속의 시그널)`,
      ]
    : [
        `Next ${hit1} (끝나지 않는 계절)`,
        `Starlight Frequency (${a1.koreanName} AI Track)`,
        `Blue Hour Encore (우리만의 앵콜)`,
      ];

  const pickedTemplate =
    promptKeyword.length > 2 && promptKeyword.length <= 24
      ? `${promptKeyword} (${isCollab ? `${a1.name} × ${a2.name}` : `${a1.name} Style`})`
      : titleTemplates[Math.floor(Math.random() * titleTemplates.length)];

  const englishTitle = isCollab
    ? `${a1.name} x ${a2.name} Concept Mix`
    : `${a1.name} Signature AI Track`;

  const styleAnalysis = isCollab
    ? `${a1.koreanName}의 시그니처(${a1.signatureSound})와 ${a2.koreanName}의 사운드(${a2.signatureSound})를 ${
        input.collabRatio ?? 50
      }:${100 - (input.collabRatio ?? 50)} 비율로 블렌딩했습니다.${
        ytRefTitle ? ` 유튜브 레퍼런스 '${ytRefTitle}'의 리듬 진행과 무드를 모티브로 재해석했습니다.` : ""
      }`
    : `${a1.koreanName} 특유의 ${a1.signatureSound} 스타일을 살려, ${input.genre} 장르와 ${bpm} BPM 템포로 새롭게 프로듀싱한 생성 음악입니다.`;

  const collabPoint = isCollab
    ? `1절 벌스는 ${a1.koreanName} 스타일의 보컬 톤이 리드하고, 프리코러스와 랩 파트에서 ${a2.koreanName} 특유의 다이내믹이 교차한 뒤 후렴에서 두 아티스트의 화음이 폭발합니다.`
    : `${a1.koreanName}의 보컬 매력이 가장 돋보이는 음역대와 중독성 있는 훅 멜로디를 중심으로 구성되었습니다.`;

  const lyrics: LyricLine[] = [
    {
      time: 0,
      section: "INTRO",
      vocal: `${a1.name} Style`,
      line: `Ooh-whoa, 익숙한 전주 너머로 열린 새로운 트랙`,
      subline: `(${isCollab ? `${a1.name} × ${a2.name}` : a1.name} on the Komposer beat, ${bpm} BPM)`,
    },
    {
      time: 11,
      section: "VERSE 1",
      vocal: `${a1.name} Style`,
      line: promptKeyword
        ? `${promptKeyword}처럼 번져가는 우리 둘만의 주파수`
        : `수백 번 돌려 듣던 플레이리스트 끝에 찾아온 설렘`,
      subline: `네 눈빛이 반짝이면 공기의 색깔마저 달라져`,
    },
    {
      time: 22,
      section: "PRE-CHORUS",
      vocal: `${a2.name} Style`,
      line: `심장 소리가 베이스를 따라 조금씩 빨라질 때`,
      subline: `경계를 넘어 새로운 차원의 문을 열어 봐 지금`,
    },
    {
      time: 33,
      section: "CHORUS",
      vocal: isCollab ? "Collab Harmony" : `${a1.name} Full Vocal`,
      line: `Play this ${englishTitle}! 멈추지 않는 우리의 멜로디!`,
      subline: `질리지 않는 밤하늘 위로 가장 눈부신 불꽃을 터뜨려`,
    },
    {
      time: 45,
      section: "RAP / VERSE 2",
      vocal: `${a2.name} Style`,
      line: `Yeah, 익숙함 속에 숨겨둔 반전의 리듬 체인지`,
      subline: `어제의 반복을 깨고 완전히 새로워진 스테이지`,
    },
    {
      time: 57,
      section: "BRIDGE",
      vocal: `${a1.name} Style`,
      line: `조명이 모두 꺼진 뒤에도 귓가에 맴돌 목소리`,
      subline: `두 개의 별이 하나의 궤도로 포개지는 이 순간`,
    },
    {
      time: 68,
      section: "FINAL CHORUS",
      vocal: isCollab ? "Collab Harmony" : `${a1.name} Full Vocal`,
      line: `Sing it louder tonight! 끝없이 이어질 우리의 신곡!`,
      subline: `From the first note till the dawn, 절대 멈추지 마!`,
    },
    {
      time: 78,
      section: "OUTRO",
      vocal: isCollab ? "Collab Harmony" : `${a1.name} Style`,
      line: `La-la-la, 영원히 리플레이될 이 순간 (${musicalKey})`,
      subline: `(Signature synth & bass fade out)`,
    },
  ];

  return {
    title: pickedTemplate,
    englishTitle,
    styleAnalysis,
    collabPoint,
    tags: [
      isCollab ? `${a1.koreanName}x${a2.koreanName}` : `${a1.koreanName}스타일`,
      input.genre.split("/")[0].trim(),
      input.mood.split("&")[0].trim() || "트렌디신곡",
      "AI작곡",
    ],
    conceptKeyword: isCollab
      ? `${a1.name.toUpperCase()} × ${a2.name.toUpperCase()}`
      : `${a1.name.toUpperCase()} AI`,
    melodyMotif: [0, 3, 7, 10, 7, 5, 3, 2],
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
    conceptKeyword: content.conceptKeyword || "KPOP AI STUDIO",
  };

  const scale: MusicalDNA["scale"] = musicalKey.toLowerCase().includes("major")
    ? "major"
    : "minor";

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

  const musicalDna: MusicalDNA = {
    synthArchetype: a1.synthArchetype,
    secondaryArchetype: isCollab ? a2.synthArchetype : undefined,
    rootNote,
    scale,
    chordProgression,
    melodyMotif:
      Array.isArray(content.melodyMotif) && content.melodyMotif.length >= 4
        ? content.melodyMotif
        : [0, 3, 7, 10, 7, 5, 3, 2],
    bassGroove:
      a1.synthArchetype === "uk_garage"
        ? "garage_sub"
        : a1.synthArchetype === "boom_bap"
          ? "sustained_808"
          : a1.synthArchetype === "rock_band"
            ? "driving_8th"
            : "syncopated_slap",
    drumDensity: 0.9,
    brightness: 0.85,
  };

  return {
    id: `track-${Date.now()}`,
    title: content.title,
    englishTitle: content.englishTitle,
    creatorId: input.creatorId,
    creatorName: input.creatorName,
    creatorHandle: input.creatorHandle,
    artists: presets.map((p) => p.id),
    artistNames: presets.map((p) => `${p.name} (${p.koreanName})`),
    isCollab,
    collabRatio,
    youtubeRefs: input.youtubeRefs,
    genre: input.genre,
    tags: content.tags,
    mood: input.mood,
    bpm,
    musicalKey,
    duration: 86,
    styleAnalysis: content.styleAnalysis,
    collabPoint: content.collabPoint,
    coverConfig,
    musicalDna,
    lyrics: content.lyrics,
    plays: 1,
    likesCount: 0,
    isLiked: false,
    createdAt: new Date().toISOString(),
  };
}

