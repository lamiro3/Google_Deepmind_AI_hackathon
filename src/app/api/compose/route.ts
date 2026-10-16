import { NextRequest, NextResponse } from "next/server";
import { getUserById, insertTrack, saveTrackAudio, getDashboardData } from "@/lib/db";
import { generateKpopTrack } from "@/lib/geminiComposer";
import { generateAndBufferTrackAudio, resolveEnvGeminiApiKey } from "@/lib/lyriaService";
import { YoutubeReference } from "@/types/komposer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawUserId = body.userId || req.cookies.get("komposer_uid")?.value || null;
    const isGuest = !rawUserId || rawUserId === "guest";
    const user = isGuest ? null : getUserById(rawUserId);

    const youtubeRefs: YoutubeReference[] = Array.isArray(body.youtubeRefs)
      ? body.youtubeRefs
      : [];

    // Always resolve GEMINI_API_KEY from local .env / .env.local / process.env
    const apiKey = resolveEnvGeminiApiKey();

    const newTrack = await generateKpopTrack({
      selectedArtistIds: Array.isArray(body.selectedArtistIds) ? body.selectedArtistIds : ["newjeans"],
      customArtistName: body.customArtistName || "",
      collabRatio: typeof body.collabRatio === "number" ? body.collabRatio : 50,
      youtubeRefs,
      genre: body.genre || "Y2K / UK Garage",
      mood: body.mood || "Dreamy & Trendy",
      customPrompt: body.customPrompt || "",
      bpm: typeof body.bpm === "number" ? body.bpm : undefined,
      creatorId: user ? user.id : "guest",
      creatorName: user ? user.name : "Guest Producer",
      creatorHandle: user ? user.handle : "@guest_producer",
      apiKey,
    });

    // Generate complete music audio via Google Gemini (Lyria) using local .env key and store directly in komposer.db
    const lyriaAudio = await generateAndBufferTrackAudio(newTrack, apiKey);
    const audioBuffer = lyriaAudio.audioBuffer;
    const mimeType = lyriaAudio.mimeType;
    const modelUsed = lyriaAudio.modelUsed;
    const durationSec =
      lyriaAudio.durationSec && lyriaAudio.durationSec > 0
        ? lyriaAudio.durationSec
        : newTrack.duration;

    newTrack.audioUrl = `/api/audio/${newTrack.id}`;
    newTrack.lyriaModel = modelUsed;
    newTrack.duration = durationSec;

    insertTrack(newTrack);
    saveTrackAudio(
      newTrack.id,
      audioBuffer,
      mimeType,
      modelUsed
    );

    const dashboard = getDashboardData(user ? user.id : null);

    return NextResponse.json({
      track: newTrack,
      dashboard,
    });
  } catch (error) {
    console.error("Compose API error:", error);
    return NextResponse.json({ error: "Failed to compose track" }, { status: 500 });
  }
}

