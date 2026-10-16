import { NextRequest, NextResponse } from "next/server";
import { incrementTrackPlay } from "@/lib/db";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const plays = incrementTrackPlay(id);
    return NextResponse.json({ plays });
  } catch (error) {
    console.error("Play increment error:", error);
    return NextResponse.json({ error: "Failed to increment play" }, { status: 500 });
  }
}

