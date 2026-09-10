import { NextResponse } from "next/server";

export const runtime = "nodejs";

type SceneInput = {
  number: number;
  title?: string;
  stock_search?: string;
  duration_seconds?: number;
};

type PexelsFile = {
  id?: number;
  quality?: string;
  file_type?: string;
  width?: number;
  height?: number;
  link?: string;
};

type PexelsVideo = {
  id: number;
  url: string;
  image: string;
  duration: number;
  user?: { name?: string; url?: string };
  video_files?: PexelsFile[];
};

function pickVideoFile(video: PexelsVideo, orientation: "landscape" | "portrait") {
  const files = (video.video_files || []).filter((file) => file.file_type === "video/mp4" && file.link);
  const matching = files.filter((file) => {
    if (!file.width || !file.height) return true;
    return orientation === "portrait" ? file.height >= file.width : file.width >= file.height;
  });
  const pool = matching.length ? matching : files;
  pool.sort((a, b) => {
    const aArea = (a.width || 0) * (a.height || 0);
    const bArea = (b.width || 0) * (b.height || 0);
    return bArea - aArea;
  });
  return pool[0]?.link || null;
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.PEXELS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Stock footage is not configured yet. Add PEXELS_API_KEY to the Vercel server environment." },
        { status: 500 },
      );
    }

    const body = await request.json();
    const scenes = Array.isArray(body.scenes) ? (body.scenes as SceneInput[]) : [];
    const format = typeof body.format === "string" ? body.format : "YouTube";

    if (!scenes.length) {
      return NextResponse.json({ error: "Please provide a generated scene plan first." }, { status: 400 });
    }

    const orientation = format === "YouTube Short" || format === "TikTok / Reel" ? "portrait" : "landscape";
    const selectedScenes = scenes.slice(0, 20);

    const matches = await Promise.all(
      selectedScenes.map(async (scene) => {
        const query = (scene.stock_search || scene.title || "cinematic video").trim().slice(0, 200);
        const url = new URL("https://api.pexels.com/v1/videos/search");
        url.searchParams.set("query", query);
        url.searchParams.set("orientation", orientation);
        url.searchParams.set("per_page", "5");
        url.searchParams.set("locale", "en-US");

        const response = await fetch(url, {
          headers: { Authorization: apiKey },
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Pexels returned ${response.status} for scene ${scene.number}.`);
        }

        const data = (await response.json()) as { videos?: PexelsVideo[] };
        const videos = (data.videos || []).slice(0, 5);

        return {
          scene_number: scene.number,
          query,
          orientation,
          results: videos.map((video) => ({
            id: video.id,
            duration: video.duration,
            thumbnail: video.image,
            pexels_url: video.url,
            creator: video.user?.name || "Pexels creator",
            creator_url: video.user?.url || "https://www.pexels.com",
            video_url: pickVideoFile(video, orientation),
          })),
        };
      }),
    );

    return NextResponse.json({ provider: "Pexels", matches, processed_scenes: selectedScenes.length, total_scenes: scenes.length });
  } catch (error) {
    console.error("Stock matching error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "We could not search stock footage right now. Please try again." },
      { status: 500 },
    );
  }
}
