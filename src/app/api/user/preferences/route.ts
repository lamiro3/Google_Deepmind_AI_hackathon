import { NextRequest, NextResponse } from "next/server";
import { updateUserPreferences, getDashboardData } from "@/lib/db";

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = body.userId || req.cookies.get("komposer_uid")?.value || "user-demo-1";
    const favoriteArtists = Array.isArray(body.favoriteArtists) ? body.favoriteArtists : [];
    const favoriteGenres = Array.isArray(body.favoriteGenres) ? body.favoriteGenres : [];

    updateUserPreferences(userId, favoriteArtists, favoriteGenres, body.name, body.bio);
    const dashboard = getDashboardData(userId);

    return NextResponse.json(dashboard);
  } catch (error) {
    console.error("Update preferences error:", error);
    return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
  }
}

