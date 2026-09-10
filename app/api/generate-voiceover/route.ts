import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const VOICE_MAP: Record<string, string> = {
  Natural: "marin",
  "Deep & cinematic": "cedar",
  "Warm & friendly": "coral",
  Energetic: "verse",
};

function styleInstructions(style: string) {
  switch (style) {
    case "Deep & cinematic":
      return "Speak with a deep, steady, cinematic documentary tone. Sound confident, serious, and emotionally controlled. Use natural pauses and never sound rushed.";
    case "Warm & friendly":
      return "Speak warmly and naturally, like a trusted friend explaining something important. Be approachable, sincere, and conversational.";
    case "Energetic":
      return "Speak with energetic, confident delivery. Keep the pace lively and engaging while remaining clear and natural. Emphasize important ideas without sounding exaggerated.";
    default:
      return "Speak naturally, clearly, and confidently. Use a conversational delivery with subtle emotion and comfortable pauses.";
  }
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI Voiceover is not configured yet. Add OPENAI_API_KEY to the Vercel server environment." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const scene = body?.scene;
    const voiceStyle = body?.voiceStyle || "Natural";

    if (!scene || typeof scene.voiceover !== "string" || !scene.voiceover.trim()) {
      return NextResponse.json({ error: "A scene with voiceover text is required." }, { status: 400 });
    }

    if (scene.voiceover.length > 4096) {
      return NextResponse.json({ error: "This scene is too long for a single voiceover. Please split it into smaller scenes." }, { status: 400 });
    }

    const client = new OpenAI({ apiKey });
    const voice = VOICE_MAP[voiceStyle] || VOICE_MAP.Natural;

    const speech = await client.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice,
      input: scene.voiceover,
      instructions: styleInstructions(voiceStyle),
      response_format: "mp3",
      speed: 1.0,
    });

    const audioBuffer = Buffer.from(await speech.arrayBuffer());
    const audioUrl = `data:audio/mpeg;base64,${audioBuffer.toString("base64")}`;

    return NextResponse.json({
      success: true,
      scene_number: scene.number,
      voice,
      voice_style: voiceStyle,
      audio_url: audioUrl,
      mime_type: "audio/mpeg",
    });
  } catch (error) {
    console.error("Voiceover generation error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate voiceover.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
