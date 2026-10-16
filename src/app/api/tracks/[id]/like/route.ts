import { NextRequest, NextResponse } from "next/server";
import { toggleTrackLike, getDashboardData } from "@/lib/db";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const userId = body.userId || req.cookies.get("komposer_uid")?.value || "user-demo-1";

    const result = toggleTrackLike(userId, id);
    const dashboard = getDashboardData(userId);

    return NextResponse.json({
      ...result,
      dashboard,
    });
  } catch (error) {
    console.error("Like toggle error:", error);
    return NextResponse.json({ error: "Failed to toggle like" }, { status: 500 });
  }
}

