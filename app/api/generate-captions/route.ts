import { NextResponse } from "next/server";

export const runtime = "nodejs";

type SceneInput = {
  number: number;
  voiceover: string;
  duration_seconds?: number;
};

type Caption = {
  id: number;
  start: number;
  end: number;
  text: string;
};

function buildCaptions(scene: SceneInput): Caption[] {
  const words = scene.voiceover.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];

  const duration = Math.max(Number(scene.duration_seconds) || 5, 1);
  const wordsPerCaption = 6;
  const groups: string[][] = [];
  for (let i = 0; i < words.length; i += wordsPerCaption) {
    groups.push(words.slice(i, i + wordsPerCaption));
  }

  const totalWords = words.length;
  let cursor = 0;
  return groups.map((group, index) => {
    const start = (cursor / totalWords) * duration;
    cursor += group.length;
    const end = (cursor / totalWords) * duration;
    return {
      id: index + 1,
      start: Number(start.toFixed(3)),
      end: Number(end.toFixed(3)),
      text: group.join(" "),
    };
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const scenes = Array.isArray(body?.scenes) ? body.scenes : [];

    if (!scenes.length) {
      return NextResponse.json({ error: "Scenes are required." }, { status: 400 });
    }

    const captions = scenes.map((scene: SceneInput) => ({
      scene_number: scene.number,
      captions: buildCaptions(scene),
    }));

    return NextResponse.json({
      success: true,
      method: "word-timed",
      note: "Caption timing is estimated from the scene duration and exact voiceover text. It can be replaced with audio transcription timing during final rendering.",
      captions,
    });
  } catch (error) {
    console.error("Caption generation error:", error);
    return NextResponse.json({ error: "Failed to generate captions." }, { status: 500 });
  }
}
