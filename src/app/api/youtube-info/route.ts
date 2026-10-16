import { NextRequest, NextResponse } from "next/server";

function extractYoutubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.slice(1) || null;
    }
    if (parsed.searchParams.get("v")) {
      return parsed.searchParams.get("v");
    }
    const shortsMatch = parsed.pathname.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
    if (shortsMatch) return shortsMatch[1];
  } catch {
    // fallback regex
  }
  const match = url.match(/(?:v=|youtu\.be\/|\/embed\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url") || "";
  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  const videoId = extractYoutubeVideoId(url);
  const defaultThumb = videoId
    ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
    : undefined;

  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(3500) });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({
        url,
        videoId: videoId || undefined,
        title: data.title || "YouTube K-POP MV Reference",
        author: data.author_name || "Official Channel",
        thumbnailUrl: data.thumbnail_url || defaultThumb,
      });
    }
  } catch {
    // Fallback if offline or sandboxed
  }

  return NextResponse.json({
    url,
    videoId: videoId || undefined,
    title: videoId ? `YouTube MV Reference (${videoId})` : "K-POP YouTube Reference Track",
    author: "YouTube Music / MV",
    thumbnailUrl: defaultThumb,
  });
}

