import { NextRequest, NextResponse } from "next/server";
import { authenticateOrRegisterUser, getDashboardData } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = authenticateOrRegisterUser({
      mode: body.mode === "register" ? "register" : "login",
      email: body.email || "",
      password: body.password || "",
      name: body.name || "",
    });

    if (result.error || !result.user) {
      return NextResponse.json({ error: result.error || "인증 실패" }, { status: 400 });
    }

    const dashboard = getDashboardData(result.user.id);
    const res = NextResponse.json(dashboard);
    res.cookies.set("komposer_uid", result.user.id, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json({ error: "Authentication error" }, { status: 500 });
  }
}

