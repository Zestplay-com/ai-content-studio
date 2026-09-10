import { NextResponse } from "next/server";
import OpenAI from "openai";
import { experimental_generateSpeech as generateSpeech, gateway } from "ai";

export const runtime = "nodejs";

const OPENAI_VOICE_MAP: Record<string, string> = {
  Natural: "marin",
  "Deep & cinematic": "cedar",
  "Warm & friendly": "coral",
  Energetic: "verse",
};

const GATEWAY_VOICE_MAP: Record<string, string> = {
  Natural: "eve",
  "Deep & cinematic": "ara",
  "Warm & friendly": "rex",
  Energetic: "sal",
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

function dataUrl(bytes: Uint8Array, mime = "audio/mpeg") {
  return `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;
}

async function generateOpenAI(text: string, voiceStyle: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
  const client = new OpenAI({ apiKey });
  const voice = OPENAI_VOICE_MAP[voiceStyle] || OPENAI_VOICE_MAP.Natural;
  const speech = await client.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice,
    input: text,
    instructions: styleInstructions(voiceStyle),
    response_format: "mp3",
    speed: 1.0,
  });
  return { audio_url: dataUrl(new Uint8Array(await speech.arrayBuffer())), voice, provider: "openai" };
}

async function generateGateway(text: string, voiceStyle: string) {
  if (!process.env.VERCEL && !process.env.AI_GATEWAY_API_KEY) {
    throw new Error("Vercel AI Gateway is not available in this environment. Deploy on Vercel or configure AI_GATEWAY_API_KEY.");
  }
  const voice = GATEWAY_VOICE_MAP[voiceStyle] || GATEWAY_VOICE_MAP.Natural;
  const result = await generateSpeech({
    model: gateway.speechModel("spacexai/grok-tts"),
    text,
    voice,
    outputFormat: "mp3",
    instructions: styleInstructions(voiceStyle),
    speed: 1,
  });
  return { audio_url: dataUrl(result.audio.uint8Array), voice, provider: "ai-gateway-grok" };
}

async function generateElevenLabs(text: string, voiceStyle: string) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!apiKey || !voiceId) {
    throw new Error("ElevenLabs is optional but not configured. Add ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID, or use Auto/OpenAI/Gateway.");
  }
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      output_format: "mp3_44100_128",
      voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.2, use_speaker_boost: true },
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`ElevenLabs request failed (${response.status}): ${detail.slice(0, 300)}`);
  }
  return { audio_url: dataUrl(new Uint8Array(await response.arrayBuffer())), voice: voiceId, provider: "elevenlabs", voice_style: voiceStyle };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const scene = body?.scene;
    const voiceStyle = body?.voiceStyle || "Natural";
    const provider = body?.provider || "auto";

    if (!scene || typeof scene.voiceover !== "string" || !scene.voiceover.trim()) {
      return NextResponse.json({ error: "A scene with voiceover text is required." }, { status: 400 });
    }

    if (scene.voiceover.length > 4096) {
      return NextResponse.json({ error: "This scene is too long for a single voiceover. Please split it into smaller scenes." }, { status: 400 });
    }

    const attempts: string[] = [];
    const run = async (name: string, fn: () => Promise<{ audio_url: string; voice: string; provider: string }>) => {
      try {
        return await fn();
      } catch (error) {
        attempts.push(`${name}: ${error instanceof Error ? error.message : "failed"}`);
        return null;
      }
    };

    let result: { audio_url: string; voice: string; provider: string } | null = null;

    if (provider === "openai") result = await run("openai", () => generateOpenAI(scene.voiceover, voiceStyle));
    else if (provider === "gateway-xai") result = await run("ai-gateway-grok", () => generateGateway(scene.voiceover, voiceStyle));
    else if (provider === "elevenlabs") result = await run("elevenlabs", () => generateElevenLabs(scene.voiceover, voiceStyle));
    else {
      result = await run("openai", () => generateOpenAI(scene.voiceover, voiceStyle));
      if (!result) result = await run("ai-gateway-grok", () => generateGateway(scene.voiceover, voiceStyle));
      if (!result && process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_VOICE_ID) {
        result = await run("elevenlabs", () => generateElevenLabs(scene.voiceover, voiceStyle));
      }
    }

    if (!result) {
      return NextResponse.json({ error: `All selected voice providers failed. ${attempts.join(" | ")}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      scene_number: scene.number,
      voice: result.voice,
      voice_style: voiceStyle,
      provider: result.provider,
      audio_url: result.audio_url,
      mime_type: "audio/mpeg",
    });
  } catch (error) {
    console.error("Voiceover generation error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate voiceover.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
