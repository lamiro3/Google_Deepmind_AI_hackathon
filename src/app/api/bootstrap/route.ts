import { NextRequest, NextResponse } from "next/server";
import { getDashboardData } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const queryUserId = req.nextUrl.searchParams.get("userId");
    const cookieUserId = req.cookies.get("komposer_uid")?.value;
    const rawUserId = queryUserId ?? cookieUserId ?? null;
    const userId = !rawUserId || rawUserId === "guest" ? null : rawUserId;

    const data = getDashboardData(userId);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Bootstrap error:", error);
    return NextResponse.json({ error: "Failed to load data" }, { status: 500 });
  }
}

