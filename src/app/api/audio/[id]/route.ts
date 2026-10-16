import { NextRequest, NextResponse } from "next/server";
import {
  getTrackAudio,
  getTrackById,
  saveTrackAudio,
  updateTrackLyricsAndDuration,
} from "@/lib/db";
import { generateAndBufferTrackAudio } from "@/lib/lyriaService";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Track ID is required" }, { status: 400 });
    }

    let audioRecord = getTrackAudio(id);
    if (!audioRecord || !audioRecord.audioBlob) {
      const track = getTrackById(id);
      if (track) {
        const generated = await generateAndBufferTrackAudio(track);
        updateTrackLyricsAndDuration(id, track.lyrics, track.duration);
        saveTrackAudio(id, generated.audioBuffer, generated.mimeType, generated.modelUsed);
        audioRecord = {
          audioBlob: generated.audioBuffer,
          mimeType: generated.mimeType,
          modelUsed: generated.modelUsed,
        };
      }
    }

    if (!audioRecord || !audioRecord.audioBlob) {
      return NextResponse.json(
        { error: "Stored audio not found for this track" },
        { status: 404 }
      );
    }

    const uint8 = new Uint8Array(audioRecord.audioBlob);

    return new NextResponse(uint8, {
      status: 200,
      headers: {
        "Content-Type": audioRecord.mimeType || "audio/mpeg",
        "Content-Length": String(uint8.byteLength),
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-store",
        "X-Lyria-Model": audioRecord.modelUsed || "lyria-3.5",
      },
    });
  } catch (error) {
    console.error("Failed to serve DB track audio:", error);
    return NextResponse.json(
      { error: "Failed to load track audio from DB" },
      { status: 500 }
    );
  }
}

