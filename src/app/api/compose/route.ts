import { NextRequest, NextResponse } from "next/server";
import { getUserById, insertTrack, getDashboardData } from "@/lib/db";
import { generateKpopTrack } from "@/lib/geminiComposer";
import { YoutubeReference } from "@/types/komposer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = body.userId || req.cookies.get("komposer_uid")?.value || "user-demo-1";
    const user = getUserById(userId);

    const youtubeRefs: YoutubeReference[] = Array.isArray(body.youtubeRefs)
      ? body.youtubeRefs
      : [];

    const newTrack = await generateKpopTrack({
      selectedArtistIds: Array.isArray(body.selectedArtistIds) ? body.selectedArtistIds : ["newjeans"],
      customArtistName: body.customArtistName || "",
      collabRatio: typeof body.collabRatio === "number" ? body.collabRatio : 50,
      youtubeRefs,
      genre: body.genre || "Y2K / UK Garage",
      mood: body.mood || "Dreamy & Trendy",
      customPrompt: body.customPrompt || "",
      bpm: typeof body.bpm === "number" ? body.bpm : undefined,
      creatorId: user.id,
      creatorName: user.name,
      creatorHandle: user.handle,
      apiKey: body.apiKey || "",
    });

    insertTrack(newTrack);
    const dashboard = getDashboardData(user.id);

    return NextResponse.json({
      track: newTrack,
      dashboard,
    });
  } catch (error) {
    console.error("Compose API error:", error);
    return NextResponse.json({ error: "Failed to compose track" }, { status: 500 });
  }
}

