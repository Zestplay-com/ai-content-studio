import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const OPENAI_VOICE_MAP: Record<string, string> = {
  Natural: "marin",
  "Deep & cinematic": "cedar",
  "Warm & friendly": "coral",
  Energetic: "verse",
};

const GEMINI_VOICE_MAP: Record<string, string> = {
  Natural: "Kore",
  "Deep & cinematic": "Charon",
  "Warm & friendly": "Aoede",
  Energetic: "Puck",
};

const XAI_VOICE_MAP: Record<string, string> = {
  Natural: "eve",
  "Deep & cinematic": "ara",
  "Warm & friendly": "eve",
  Energetic: "leo",
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

function pcm16ToWav(pcm: Uint8Array, sampleRate = 24000, channels = 1) {
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * channels * 2;
  const blockAlign = channels * 2;
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.byteLength, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.byteLength, 40);
  return new Uint8Array(Buffer.concat([header, Buffer.from(pcm)]));
}

async function generateOpenAI(text: string, voiceStyle: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
  const client = new OpenAI({ apiKey });
  const voice = OPENAI_VOICE_MAP[voiceStyle] || OPENAI_VOICE_MAP.Natural;
  const speech = await client.audio.speech.create({
    model: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
    voice,
    input: text,
    instructions: styleInstructions(voiceStyle),
    response_format: "mp3",
    speed: 1.0,
  });
  return { audio_url: dataUrl(new Uint8Array(await speech.arrayBuffer())), voice, provider: "openai", mime_type: "audio/mpeg" };
}

async function generateElevenLabs(text: string) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!apiKey || !voiceId) {
    throw new Error("ElevenLabs is not configured. Add ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID.");
  }
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
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
  return { audio_url: dataUrl(new Uint8Array(await response.arrayBuffer())), voice: voiceId, provider: "elevenlabs", mime_type: "audio/mpeg" };
}

async function generateGemini(text: string, voiceStyle: string) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");
  const model = process.env.GEMINI_TTS_MODEL || "gemini-2.5-flash-preview-tts";
  const voice = GEMINI_VOICE_MAP[voiceStyle] || GEMINI_VOICE_MAP.Natural;
  const prompt = `${styleInstructions(voiceStyle)}\n\nSpeak only the following transcript:\n${text}`;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
      },
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gemini TTS request failed (${response.status}): ${detail.slice(0, 300)}`);
  }
  const json = await response.json();
  const part = json?.candidates?.[0]?.content?.parts?.find((item: any) => item?.inlineData?.data);
  if (!part?.inlineData?.data) throw new Error("Gemini TTS returned no audio data.");
  const pcm = new Uint8Array(Buffer.from(part.inlineData.data, "base64"));
  const wav = pcm16ToWav(pcm, 24000, 1);
  return { audio_url: dataUrl(wav, "audio/wav"), voice, provider: "gemini", mime_type: "audio/wav" };
}

async function generateXAI(text: string, voiceStyle: string) {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("XAI_API_KEY is not configured.");
  const voice = process.env.XAI_VOICE_ID || XAI_VOICE_MAP[voiceStyle] || XAI_VOICE_MAP.Natural;
  const response = await fetch("https://api.x.ai/v1/tts", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice_id: voice, language: "en" }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`xAI TTS request failed (${response.status}): ${detail.slice(0, 300)}`);
  }
  return { audio_url: dataUrl(new Uint8Array(await response.arrayBuffer())), voice, provider: "xai", mime_type: "audio/mpeg" };
}

type VoiceResult = { audio_url: string; voice: string; provider: string; mime_type: string };

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
    const run = async (name: string, fn: () => Promise<VoiceResult>) => {
      try { return await fn(); }
      catch (error) {
        attempts.push(`${name}: ${error instanceof Error ? error.message : "failed"}`);
        return null;
      }
    };

    let result: VoiceResult | null = null;
    if (provider === "openai") result = await run("openai", () => generateOpenAI(scene.voiceover, voiceStyle));
    else if (provider === "elevenlabs") result = await run("elevenlabs", () => generateElevenLabs(scene.voiceover));
    else if (provider === "gemini") result = await run("gemini", () => generateGemini(scene.voiceover, voiceStyle));
    else if (provider === "xai") result = await run("xai", () => generateXAI(scene.voiceover, voiceStyle));
    else {
      // Auto is a real failover chain. If a provider is out of credits, rate-limited,
      // unavailable, or misconfigured, the next configured provider is tried.
      result = await run("openai", () => generateOpenAI(scene.voiceover, voiceStyle));
      if (!result) result = await run("elevenlabs", () => generateElevenLabs(scene.voiceover));
      if (!result) result = await run("gemini", () => generateGemini(scene.voiceover, voiceStyle));
      if (!result) result = await run("xai", () => generateXAI(scene.voiceover, voiceStyle));
    }

    if (!result) return NextResponse.json({ error: `Voiceover generation failed. ${attempts.join(" | ")}` }, { status: 500 });

    return NextResponse.json({
      success: true,
      scene_number: scene.number,
      voice: result.voice,
      voice_style: voiceStyle,
      provider: result.provider,
      audio_url: result.audio_url,
      mime_type: result.mime_type,
    });
  } catch (error) {
    console.error("Voiceover generation error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to generate voiceover." }, { status: 500 });
  }
}
