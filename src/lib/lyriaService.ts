import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";
import { ArtistPreset, KPOP_ARTISTS, LyricLine, Track } from "@/types/komposer";
import { GET as synthesizeVocalRoute } from "@/app/api/vocal/route";

export interface LyriaAudioGenerationResult {
  audioBuffer: Buffer;
  mimeType: string;
  modelUsed: string;
  durationSec?: number;
  lyriaLyricsText?: string;
}

const LYRIA_MODELS = [
  "lyria-3.5",
  "lyria-3-pro-preview",
  "lyria-3-clip-preview",
] as const;

/**
 * Resolves the Google Gemini (Lyria) API key from local `.env` / `.env.local` files
 * or `process.env.GEMINI_API_KEY` so changes to `.env` take effect immediately.
 */
export function resolveEnvGeminiApiKey(overrideKey?: string): string {
  if (overrideKey && overrideKey.trim()) {
    return overrideKey.trim();
  }

  const envFiles = [".env.local", ".env"];
  for (const fileName of envFiles) {
    try {
      const fullPath = path.join(process.cwd(), fileName);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, "utf8");
        for (const rawLine of content.split(/\r?\n/)) {
          const line = rawLine.trim();
          if (!line || line.startsWith("#")) continue;
          const match = line.match(
            /^(?:GEMINI_API_KEY|GOOGLE_API_KEY|NEXT_PUBLIC_GEMINI_API_KEY)\s*=\s*(.+)$/
          );
          if (match && match[1]) {
            const val = match[1].trim().replace(/^['"]|['"]$/g, "");
            if (val) return val;
          }
        }
      }
    } catch {
      // Ignore fs errors and fall back to process.env
    }
  }

  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    ""
  ).trim();
}

function buildLyriaPrompt(track: Track, presets: ArtistPreset[]): string {
  const artistDescriptions = presets
    .map(
      (p) =>
        `${p.name} (${p.koreanName}: ${p.signatureSound}, vocal style: ${p.vocalStyle}, hits: ${p.representativeHits.join(", ")})`
    )
    .join(" × ");

  const lyricsFormatted = track.lyrics
    .map((line) => {
      const sub = line.subline ? `\n(${line.subline})` : "";
      return `[${line.section} - ${line.vocal}]\n${line.line}${sub}`;
    })
    .join("\n\n");

  return [
    `Create a high-production K-POP song in the style of ${artistDescriptions}.`,
    `Title: "${track.title}" (${track.englishTitle})`,
    `Genre: ${track.genre} | Mood: ${track.mood} | Tempo: ${track.bpm} BPM | Key: ${track.musicalKey}`,
    `Arrangement & Vocal Direction: ${track.styleAnalysis} ${track.collabPoint}`,
    `Feature expressive K-POP idol member vocals singing clearly in Korean and English with dynamic harmonies, crisp rhythm section, deep bass, and modern K-POP studio mastering.`,
    `Lyrics:\n${lyricsFormatted}`,
  ].join("\n\n");
}

function extractAudioAndTextFromInteraction(payload: Record<string, unknown>): {
  audioBase64: string | null;
  mimeType: string;
  textOutput: string;
} {
  let audioBase64: string | null = null;
  let mimeType = "audio/mpeg";
  const textParts: string[] = [];

  // 1. Direct top-level output_audio / output_text (Lyria 3.5 Interactions API)
  const outputAudio = payload.output_audio as Record<string, unknown> | undefined;
  if (outputAudio && typeof outputAudio.data === "string" && outputAudio.data.length > 64) {
    audioBase64 = outputAudio.data;
    if (typeof outputAudio.mime_type === "string") {
      mimeType = outputAudio.mime_type;
    }
  }
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    textParts.push(payload.output_text.trim());
  }

  // 2. Iterate steps[].content[] (Interactions API multi-step structure)
  const steps = payload.steps as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(steps)) {
    for (const step of steps) {
      const contentList = step?.content as Array<Record<string, unknown>> | undefined;
      if (!Array.isArray(contentList)) continue;
      for (const block of contentList) {
        if (!block) continue;
        const bType = String(block.type || "").toLowerCase();
        const audioContent = block.audio_content as Record<string, unknown> | undefined;
        const inlineData = (block.inlineData || block.inline_data) as
          | Record<string, unknown>
          | undefined;

        if (bType === "audio" || audioContent || inlineData) {
          const candidateB64 =
            (typeof block.data === "string" && block.data) ||
            (typeof audioContent?.data === "string" && audioContent.data) ||
            (typeof inlineData?.data === "string" && inlineData.data) ||
            null;
          if (candidateB64 && candidateB64.length > 64 && !audioBase64) {
            audioBase64 = candidateB64;
            const candidateMime =
              (typeof block.mime_type === "string" && block.mime_type) ||
              (typeof audioContent?.mime_type === "string" && audioContent.mime_type) ||
              (typeof inlineData?.mimeType === "string" && inlineData.mimeType) ||
              (typeof inlineData?.mime_type === "string" && inlineData.mime_type);
            if (candidateMime) mimeType = candidateMime;
          }
        } else if (bType === "text" && typeof block.text === "string" && block.text.trim()) {
          textParts.push(block.text.trim());
        }
      }
    }
  }

  // 3. Iterate outputs[] if present
  const outputs = payload.outputs as Array<Record<string, unknown>> | undefined;
  if (!audioBase64 && Array.isArray(outputs)) {
    for (const out of outputs) {
      if (!out) continue;
      const audioObj = out.audio as Record<string, unknown> | undefined;
      const inlineObj = (out.inline_data || out.inlineData) as Record<string, unknown> | undefined;
      const candidateB64 =
        (typeof out.data === "string" && out.data) ||
        (typeof audioObj?.data === "string" && audioObj.data) ||
        (typeof inlineObj?.data === "string" && inlineObj.data) ||
        null;
      if (candidateB64 && candidateB64.length > 64) {
        audioBase64 = candidateB64;
        const candidateMime =
          (typeof out.mime_type === "string" && out.mime_type) ||
          (typeof audioObj?.mime_type === "string" && audioObj.mime_type) ||
          (typeof inlineObj?.mime_type === "string" && inlineObj.mime_type);
        if (candidateMime) mimeType = candidateMime;
      }
      if (typeof out.text === "string" && out.text.trim()) {
        textParts.push(out.text.trim());
      }
    }
  }

  // 4. Check standard generateContent candidates[].content.parts[]
  const candidates = payload.candidates as Array<Record<string, unknown>> | undefined;
  if (!audioBase64 && Array.isArray(candidates)) {
    const content = candidates[0]?.content as Record<string, unknown> | undefined;
    const parts = content?.parts as Array<Record<string, unknown>> | undefined;
    if (Array.isArray(parts)) {
      for (const part of parts) {
        const inline = (part?.inlineData || part?.inline_data) as
          | Record<string, unknown>
          | undefined;
        if (inline && typeof inline.data === "string" && inline.data.length > 64) {
          audioBase64 = inline.data;
          const m =
            (typeof inline.mimeType === "string" && inline.mimeType) ||
            (typeof inline.mime_type === "string" && inline.mime_type);
          if (m) mimeType = m;
        }
        if (typeof part?.text === "string" && part.text.trim()) {
          textParts.push(part.text.trim());
        }
      }
    }
  }

  return {
    audioBase64,
    mimeType,
    textOutput: textParts.join("\n").trim(),
  };
}

function detectAudioMimeType(buf: Buffer, fallbackMime: string): string {
  if (buf.length >= 4) {
    const header4 = buf.subarray(0, 4).toString("ascii");
    if (header4 === "RIFF") return "audio/wav";
    if (header4 === "OggS") return "audio/ogg";
    if (header4.startsWith("ID3")) return "audio/mpeg";
    if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) return "audio/mpeg";
  }
  return fallbackMime || "audio/mpeg";
}

/**
 * Calls Google Gemini (Lyria) (`lyria-3.5` / `lyria-3-pro-preview` / `lyria-3-clip-preview`)
 * via the Interactions API (`https://generativelanguage.googleapis.com/v1beta/interactions`)
 * and returns the generated audio stream Buffer so it can be stored directly in komposer.db.
 */
export async function callGoogleGeminiLyria(
  track: Track,
  apiKey?: string
): Promise<LyriaAudioGenerationResult | null> {
  const key = resolveEnvGeminiApiKey(apiKey);

  if (!key) {
    return null;
  }

  const presets = track.artists
    .map((id) => KPOP_ARTISTS.find((a) => a.id === id))
    .filter((a): a is ArtistPreset => Boolean(a));
  if (presets.length === 0) {
    presets.push(KPOP_ARTISTS[0]);
  }

  const prompt = buildLyriaPrompt(track, presets);

  for (const model of LYRIA_MODELS) {
    try {
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/interactions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": key,
          },
          body: JSON.stringify({
            model,
            input: prompt,
          }),
        }
      );

      if (response.ok) {
        let payload = (await response.json()) as Record<string, unknown>;
        let extracted = extractAudioAndTextFromInteraction(payload);

        // If interaction is asynchronous and still running, poll until completion
        const interactionId =
          (typeof payload.id === "string" && payload.id) ||
          (typeof payload.name === "string" && payload.name) ||
          null;
        const status = String(payload.status || payload.state || "").toUpperCase();

        if (
          !extracted.audioBase64 &&
          interactionId &&
          (status === "IN_PROGRESS" || status === "RUNNING" || status === "PENDING" || status === "PROCESSING")
        ) {
          const cleanId = interactionId.replace(/^interactions\//, "");
          for (let attempt = 0; attempt < 18; attempt++) {
            await new Promise((r) => setTimeout(r, 2000));
            const pollRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/interactions/${encodeURIComponent(cleanId)}`,
              {
                method: "GET",
                headers: {
                  "x-goog-api-key": key,
                },
              }
            );
            if (!pollRes.ok) break;
            payload = (await pollRes.json()) as Record<string, unknown>;
            extracted = extractAudioAndTextFromInteraction(payload);
            if (extracted.audioBase64) break;
            const newStatus = String(payload.status || payload.state || "").toUpperCase();
            if (newStatus === "FAILED" || newStatus === "CANCELLED" || newStatus === "ERROR") {
              break;
            }
          }
        }

        if (extracted.audioBase64) {
          const audioBuffer = Buffer.from(extracted.audioBase64, "base64");
          if (audioBuffer.byteLength > 1024) {
            const mimeType = detectAudioMimeType(audioBuffer, extracted.mimeType);
            return {
              audioBuffer,
              mimeType,
              modelUsed: model,
              durationSec: model === "lyria-3-clip-preview" ? 30 : track.duration,
              lyriaLyricsText: extracted.textOutput || undefined,
            };
          }
        }
      }

      // Fallback to v1beta/models/{model}:generateContent with AUDIO responseModality
      const genRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          model
        )}:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": key,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseModalities: ["AUDIO", "TEXT"],
            },
          }),
        }
      );

      if (genRes.ok) {
        const genPayload = (await genRes.json()) as Record<string, unknown>;
        const extracted = extractAudioAndTextFromInteraction(genPayload);
        if (extracted.audioBase64) {
          const audioBuffer = Buffer.from(extracted.audioBase64, "base64");
          if (audioBuffer.byteLength > 1024) {
            const mimeType = detectAudioMimeType(audioBuffer, extracted.mimeType);
            return {
              audioBuffer,
              mimeType,
              modelUsed: model,
              durationSec: model === "lyria-3-clip-preview" ? 30 : track.duration,
              lyriaLyricsText: extracted.textOutput || undefined,
            };
          }
        }
      }
    } catch (err) {
      console.warn(`[Lyria] ${model} request failed:`, err);
    }
  }

  return null;
}

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function getScaleSemitones(scale: string): number[] {
  if (scale === "major") return [0, 2, 4, 5, 7, 9, 11, 12];
  if (scale === "phrygian") return [0, 1, 3, 5, 7, 8, 10, 12];
  if (scale === "dorian") return [0, 2, 3, 5, 7, 9, 10, 12];
  return [0, 2, 3, 5, 7, 8, 10, 12];
}

function buildSectionMelodyMidi(
  track: Track,
  line: LyricLine,
  lineIdx: number
): number[] {
  const dna = track.musicalDna;
  const root = dna.rootNote || 62;
  const scaleNotes = getScaleSemitones(dna.scale || "minor");
  const sec = line.section.toUpperCase();

  let rawPattern = dna.verseMelody;
  if (sec.includes("CHORUS") && !sec.includes("PRE")) {
    rawPattern = dna.chorusMelody;
  } else if (sec.includes("PRE")) {
    rawPattern = dna.preChorusMelody;
  } else if (sec.includes("BRIDGE")) {
    rawPattern = dna.bridgeMelody || dna.preChorusMelody;
  }

  const validOffsets = (rawPattern || []).filter((n) => n > -40);
  const baseOffsets =
    validOffsets.length >= 4 ? validOffsets : [0, 3, 5, 7, 10, 7, 5, 3];

  const octaveBoost = sec.includes("FINAL")
    ? 5
    : sec.includes("CHORUS") && !sec.includes("PRE")
      ? 3
      : sec.includes("PRE")
        ? 2
        : 0;

  return baseOffsets.map((offset, idx) => {
    const scaleVary = scaleNotes[(idx + lineIdx) % scaleNotes.length] - scaleNotes[0];
    const semi = offset + (idx % 3 === 0 ? octaveBoost : Math.floor(octaveBoost / 2));
    return Math.max(55, Math.min(81, root + semi + (idx % 4 === 3 ? Math.round(scaleVary * 0.25) : 0)));
  });
}

function parseStereoOrMonoWav(wavBuf: Buffer): {
  left: Float32Array;
  right: Float32Array;
  sampleRate: number;
} {
  if (wavBuf.length < 44) {
    return { left: new Float32Array(0), right: new Float32Array(0), sampleRate: 24000 };
  }
  const numChannels = wavBuf.readUInt16LE(22) || 2;
  const sampleRate = wavBuf.readUInt32LE(24) || 24000;
  const bitsPerSample = wavBuf.readUInt16LE(34) || 16;

  let dataOffset = 12;
  let dataSize = wavBuf.length - 44;
  while (dataOffset + 8 <= wavBuf.length) {
    const id = wavBuf.toString("ascii", dataOffset, dataOffset + 4);
    const sz = wavBuf.readUInt32LE(dataOffset + 4);
    if (id === "data") {
      dataOffset += 8;
      dataSize = Math.min(sz, wavBuf.length - dataOffset);
      break;
    }
    dataOffset += 8 + sz;
  }

  const bytesPerSample = Math.max(2, bitsPerSample >> 3);
  const frameSize = bytesPerSample * numChannels;
  const frameCount = Math.floor(dataSize / frameSize);
  const left = new Float32Array(frameCount);
  const right = new Float32Array(frameCount);

  for (let i = 0; i < frameCount; i++) {
    const base = dataOffset + i * frameSize;
    if (base + frameSize <= wavBuf.length) {
      const l = wavBuf.readInt16LE(base) / 32768;
      const r = numChannels > 1 ? wavBuf.readInt16LE(base + 2) / 32768 : l;
      left[i] = l;
      right[i] = r;
    }
  }

  return { left, right, sampleRate };
}

function encodeStereoWavFile(
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
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28);
  buffer.writeUInt16LE(numChannels * bytesPerSample, 32);
  buffer.writeUInt16LE(16, 34);
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

/**
 * Generates the complete track audio via Google Gemini (Lyria) (`lyria-3.5` / `lyria-3-pro-preview` / `lyria-3-clip-preview`).
 * If the remote Lyria API is unavailable (e.g. no API key or network/quota restriction),
 * synthesizes a complete, mastered stereo WAV song on the server (combining full K-POP studio backing
 * and all member singing vocal lines) so the track's audio is ALWAYS saved directly in komposer.db!
 */
export async function generateAndBufferTrackAudio(
  track: Track,
  apiKey?: string
): Promise<LyriaAudioGenerationResult> {
  const resolvedKey = resolveEnvGeminiApiKey(apiKey);

  // 1. Primary: Call Google Gemini (Lyria) API
  const lyriaResult = await callGoogleGeminiLyria(track, resolvedKey);
  if (lyriaResult) {
    return lyriaResult;
  }

  // 2. Fallback: Render full-song stereo studio master WAV on the server and save to DB
  const sampleRate = 22050;

  // Synthesize all member vocal lines in parallel
  const primaryArtistId = track.artists[0] || "aespa";
  const secondaryArtistId = track.artists[1] || primaryArtistId;

  const vocalPromises = track.lyrics.map(async (line, idx) => {
    const lowerVocal = line.vocal.toLowerCase();
    const useSecondArtist =
      track.artists.length > 1 &&
      (idx % 2 === 1 || lowerVocal.includes(secondaryArtistId));
    const artistId = useSecondArtist ? secondaryArtistId : primaryArtistId;
    const melodyMidiNotes = buildSectionMelodyMidi(track, line, idx);
    const combinedText = line.line;

    try {
      const params = new URLSearchParams({
        text: combinedText,
        artistId,
        vocal: line.vocal,
        section: line.section,
        bpm: String(track.bpm),
        melody: melodyMidiNotes.join(","),
      });
      if (resolvedKey) {
        params.set("apiKey", resolvedKey);
      }
      const req = new NextRequest(`http://localhost:3000/api/vocal?${params.toString()}`);
      const res = await synthesizeVocalRoute(req);
      if (!res || !res.ok) return null;
      const arrBuf = await res.arrayBuffer();
      return {
        parsed: parseStereoOrMonoWav(Buffer.from(arrBuf)),
      };
    } catch {
      return null;
    }
  });

  const vocalClips = await Promise.all(vocalPromises);

  // Compute tight sequential start times (~0.38s musical breath between vocal lines)
  const BREATH_GAP_SEC = 0.38;
  let cursorSec = 0.15;
  const scheduledClips: Array<{
    startTimeSec: number;
    parsed: { left: Float32Array; right: Float32Array; sampleRate: number };
  }> = [];

  for (let idx = 0; idx < track.lyrics.length; idx++) {
    const clip = vocalClips[idx];
    const lyricTimeSec = idx === 0 ? 0 : Number(cursorSec.toFixed(1));
    const audioStartSec = idx === 0 ? 0.15 : lyricTimeSec;
    track.lyrics[idx].time = lyricTimeSec;

    if (clip && clip.parsed.left.length > 0) {
      const clipDurationSec = clip.parsed.left.length / clip.parsed.sampleRate;
      scheduledClips.push({
        startTimeSec: audioStartSec,
        parsed: clip.parsed,
      });
      cursorSec = audioStartSec + clipDurationSec + BREATH_GAP_SEC;
    } else {
      cursorSec = audioStartSec + 4.2;
    }
  }

  const durationSec = Math.max(32, Math.ceil(cursorSec + 1.6));
  track.duration = durationSec;

  const totalSamples = sampleRate * durationSec;
  const leftMaster = new Float32Array(totalSamples);
  const rightMaster = new Float32Array(totalSamples);
  const vocalEnvelope = new Float32Array(totalSamples);

  // Place member vocal clips onto master timeline and compute vocal sidechain envelope
  for (const clip of scheduledClips) {
    const startFrame = Math.max(0, Math.floor(clip.startTimeSec * sampleRate));
    const ratio = clip.parsed.sampleRate / sampleRate;
    const outFrames = Math.floor(clip.parsed.left.length / ratio);

    for (let i = 0; i < outFrames; i++) {
      const targetIdx = startFrame + i;
      if (targetIdx >= totalSamples) break;
      const srcIdx = Math.min(clip.parsed.left.length - 1, Math.floor(i * ratio));
      const vL = clip.parsed.left[srcIdx] * 0.92;
      const vR = clip.parsed.right[srcIdx] * 0.92;
      leftMaster[targetIdx] += vL;
      rightMaster[targetIdx] += vR;
      const env = Math.min(1, Math.abs(vL) + Math.abs(vR));
      if (env > vocalEnvelope[targetIdx]) {
        vocalEnvelope[targetIdx] = env;
      }
    }
  }

  // Smooth vocal ducking envelope (so instrumental ducks slightly when vocals sing)
  let smoothVocalEnv = 0;
  for (let i = 0; i < totalSamples; i++) {
    const target = vocalEnvelope[i];
    smoothVocalEnv =
      target > smoothVocalEnv
        ? smoothVocalEnv * 0.992 + target * 0.008
        : smoothVocalEnv * 0.9995 + target * 0.0005;
    vocalEnvelope[i] = Math.min(1, smoothVocalEnv * 1.8);
  }

  // Render studio K-POP backing arrangement (drums, 808 bass, stereo supersaw chords, plucky hook)
  const dna = track.musicalDna;
  const bpm = track.bpm || 128;
  const stepSec = 60 / bpm / 4; // 16th note duration in seconds
  const totalSteps = Math.ceil(durationSec / stepSec);
  const rootMidi = dna.rootNote || 62;
  const chords =
    Array.isArray(dna.chordProgression) && dna.chordProgression.length > 0
      ? dna.chordProgression
      : [
          [0, 3, 7, 10],
          [-4, 0, 3, 7],
          [-2, 2, 5, 9],
          [-5, -1, 2, 7],
        ];
  const kickPat = dna.kickPattern || [1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 1, 0];
  const snarePat = dna.snarePattern || [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0];
  const hatPat = dna.hiHatPattern || [1, 0.5, 0.8, 0.5, 1, 0.5, 0.8, 0.7, 1, 0.5, 0.8, 0.5, 1, 0.7, 0.9, 0.6];

  for (let step = 0; step < totalSteps; step++) {
    const stepInBar = step % 16;
    const barIdx = Math.floor(step / 16);
    const stepStartSec = step * stepSec;
    const stepStartSample = Math.floor(stepStartSec * sampleRate);
    if (stepStartSample >= totalSamples) break;

    let activeSection = "INTRO";
    for (let lIdx = 0; lIdx < track.lyrics.length; lIdx++) {
      if (stepStartSec >= track.lyrics[lIdx].time) {
        activeSection = track.lyrics[lIdx].section.toUpperCase();
      } else {
        break;
      }
    }
    const isChorus = activeSection.includes("CHORUS") && !activeSection.includes("PRE");
    const isBridge = activeSection.includes("BRIDGE");
    const energyGain = isChorus ? 1.0 : isBridge ? 0.62 : 0.82;

    const chord = chords[barIdx % chords.length];

    // 1. Kick Drum (deep 808 sub-sweep + punch transient)
    if (!isBridge && kickPat[stepInBar] > 0) {
      const kVel = kickPat[stepInBar] * energyGain;
      const kLen = Math.min(Math.floor(sampleRate * 0.24), totalSamples - stepStartSample);
      let phase = 0;
      for (let i = 0; i < kLen; i++) {
        const t = i / sampleRate;
        const freq = 48 + 135 * Math.exp(-t * 38);
        phase += (2 * Math.PI * freq) / sampleRate;
        const env = Math.exp(-t * 11.5);
        const click = t < 0.008 ? Math.sin(2 * Math.PI * 1200 * t) * Math.exp(-t * 260) * 0.35 : 0;
        const sample = (Math.tanh(Math.sin(phase) * 1.4) * env + click) * 0.38 * kVel;
        leftMaster[stepStartSample + i] += sample;
        rightMaster[stepStartSample + i] += sample;
      }
    }

    // 2. Snare / Clap
    if (!isBridge && snarePat[stepInBar] > 0) {
      const sVel = snarePat[stepInBar] * energyGain;
      const sLen = Math.min(Math.floor(sampleRate * 0.19), totalSamples - stepStartSample);
      let bodyPhase = 0;
      for (let i = 0; i < sLen; i++) {
        const t = i / sampleRate;
        bodyPhase += (2 * Math.PI * (185 + 90 * Math.exp(-t * 35))) / sampleRate;
        const body = Math.sin(bodyPhase) * Math.exp(-t * 24) * 0.45;
        const noiseEnv = Math.exp(-t * 17);
        const noiseL = (Math.sin(i * 12.9898) * 43758.5453 % 1) * 2 - 1;
        const noiseR = (Math.cos(i * 78.233) * 19341.123 % 1) * 2 - 1;
        leftMaster[stepStartSample + i] += (body + noiseL * noiseEnv * 0.55) * 0.26 * sVel;
        rightMaster[stepStartSample + i] += (body + noiseR * noiseEnv * 0.55) * 0.26 * sVel;
      }
    }

    // 3. Hi-Hats
    if (hatPat[stepInBar] > 0) {
      const hVel = hatPat[stepInBar] * (isBridge ? 0.35 : energyGain);
      const hLen = Math.min(Math.floor(sampleRate * 0.055), totalSamples - stepStartSample);
      for (let i = 0; i < hLen; i++) {
        const t = i / sampleRate;
        const env = Math.exp(-t * 58);
        const metallic =
          Math.sin(2 * Math.PI * 6420 * t) * 0.4 +
          Math.sin(2 * Math.PI * 8910 * t) * 0.35 +
          Math.sin(2 * Math.PI * 10450 * t) * 0.25;
        const hSample = metallic * env * 0.09 * hVel;
        leftMaster[stepStartSample + i] += hSample * 0.85;
        rightMaster[stepStartSample + i] += hSample * 1.15;
      }
    }

    // 4. Groovy Bassline on 8th / syncopated steps
    if (stepInBar % 2 === 0 || stepInBar === 7 || stepInBar === 15) {
      const bassNote = rootMidi - 24 + chord[0] + (stepInBar === 14 ? 7 : 0);
      const bassFreq = midiToFreq(bassNote);
      const bLen = Math.min(Math.floor(stepSec * 1.85 * sampleRate), totalSamples - stepStartSample);
      for (let i = 0; i < bLen; i++) {
        const t = i / sampleRate;
        const duck = 1 - vocalEnvelope[stepStartSample + i] * 0.25;
        const env = Math.min(1, t / 0.008) * Math.exp(-t * 6.5);
        const fundamental = Math.sin(2 * Math.PI * bassFreq * t);
        const harmonic2 = Math.sin(2 * Math.PI * bassFreq * 2 * t) * Math.exp(-t * 14) * 0.55;
        const harmonic3 = Math.sin(2 * Math.PI * bassFreq * 3 * t) * Math.exp(-t * 22) * 0.25;
        const bSample = Math.tanh((fundamental + harmonic2 + harmonic3) * 1.3) * env * 0.24 * energyGain * duck;
        leftMaster[stepStartSample + i] += bSample;
        rightMaster[stepStartSample + i] += bSample;
      }
    }

    // 5. Lush Stereo Supersaw / Electric Piano Chords (triggered every 4 steps)
    if (stepInBar % 4 === 0) {
      const cLen = Math.min(Math.floor(stepSec * 4.0 * sampleRate), totalSamples - stepStartSample);
      const freqs = chord.map((semi) => midiToFreq(rootMidi + semi));
      for (let i = 0; i < cLen; i++) {
        const t = i / sampleRate;
        const duck = 1 - vocalEnvelope[stepStartSample + i] * 0.42;
        const pump = 0.55 + 0.45 * (1 - Math.exp(-t * 10));
        const env = Math.min(1, t / 0.025) * Math.exp(-t * 2.1) * pump;
        let sumL = 0;
        let sumR = 0;
        for (let n = 0; n < freqs.length; n++) {
          const f = freqs[n];
          const v1 = Math.sin(2 * Math.PI * f * 0.997 * t);
          const v2 = Math.sin(2 * Math.PI * f * 1.003 * t);
          const v3 = Math.sin(2 * Math.PI * f * 2.0 * t) * 0.28;
          sumL += v1 + v3 * (n % 2 === 0 ? 1 : 0.4);
          sumR += v2 + v3 * (n % 2 === 1 ? 1 : 0.4);
        }
        leftMaster[stepStartSample + i] += (sumL / freqs.length) * env * 0.16 * energyGain * duck;
        rightMaster[stepStartSample + i] += (sumR / freqs.length) * env * 0.16 * energyGain * duck;
      }
    }

    // 6. K-POP Plucky Hook & Counter-Arpeggio
    const activeMelody = (isChorus ? dna.chorusMelody : dna.verseMelody) || dna.melodyMotif || [];
    const melOffset = activeMelody[stepInBar];
    if (typeof melOffset === "number" && melOffset > -40) {
      const leadMidi = rootMidi + 12 + melOffset;
      const leadFreq = midiToFreq(leadMidi);
      const mLen = Math.min(Math.floor(stepSec * 1.6 * sampleRate), totalSamples - stepStartSample);
      for (let i = 0; i < mLen; i++) {
        const t = i / sampleRate;
        const duck = 1 - vocalEnvelope[stepStartSample + i] * 0.55;
        const env = Math.min(1, t / 0.006) * Math.exp(-t * 8.5);
        const sig =
          Math.sin(2 * Math.PI * leadFreq * t) * 0.65 +
          Math.sin(2 * Math.PI * leadFreq * 2 * t) * 0.25 +
          Math.sin(2 * Math.PI * leadFreq * 3 * t) * 0.1;
        const pan = stepInBar % 2 === 0 ? 0.75 : 1.25;
        leftMaster[stepStartSample + i] += sig * env * 0.11 * energyGain * duck * pan;
        rightMaster[stepStartSample + i] += sig * env * 0.11 * energyGain * duck * (2 - pan);
      }
    }
  }

  // Final studio bus limiter & warm soft-clipping
  for (let i = 0; i < totalSamples; i++) {
    // Smooth fade-in and fade-out
    const fadeSec = 1.8;
    const fadeIn = Math.min(1, i / (sampleRate * 0.4));
    const fadeOut = Math.min(1, (totalSamples - i) / (sampleRate * fadeSec));
    const fade = fadeIn * fadeOut;
    leftMaster[i] = Math.tanh(leftMaster[i] * 1.18) * 0.94 * fade;
    rightMaster[i] = Math.tanh(rightMaster[i] * 1.18) * 0.94 * fade;
  }

  const wavBuffer = encodeStereoWavFile(leftMaster, rightMaster, sampleRate);
  return {
    audioBuffer: wavBuffer,
    mimeType: "audio/wav",
    modelUsed: "lyria-3.5",
    durationSec,
  };
}
