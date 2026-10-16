import { NextRequest, NextResponse } from "next/server";
import { getDashboardData } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const userId =
      req.nextUrl.searchParams.get("userId") ||
      req.cookies.get("komposer_uid")?.value ||
      "user-demo-1";

    const data = getDashboardData(userId);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Bootstrap error:", error);
    return NextResponse.json({ error: "Failed to load data" }, { status: 500 });
  }
}

