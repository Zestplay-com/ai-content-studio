import { NextResponse } from "next/server";
import { generateAiText } from "@/lib/ai-router";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const topic = typeof body.topic === "string" ? body.topic.trim() : "";
    const length = typeof body.length === "string" ? body.length : "5 minutes";
    const format = typeof body.format === "string" ? body.format : "YouTube";
    const language = typeof body.language === "string" ? body.language : "English";
    const provider = body.provider;

    if (!topic) {
      return NextResponse.json({ error: "Please enter a video topic." }, { status: 400 });
    }

    if (topic.length > 5000) {
      return NextResponse.json({ error: "Your topic is too long. Please keep it under 5,000 characters." }, { status: 400 });
    }

    const result = await generateAiText({
      provider,
      instructions: `You are the senior scriptwriter for AI Content Studio. Write engaging, natural video scripts that sound human when spoken aloud.

Requirements:
- Write in ${language}.
- Target approximately ${length} of spoken content.
- Format: ${format}.
- Start with a strong hook that creates curiosity immediately.
- Keep sentences natural and easy for an AI voice to speak.
- Use clear sections and smooth transitions.
- Avoid unnecessary jargon, filler, and robotic phrasing.
- Do not invent statistics, quotations, studies, or specific facts unless they are clearly presented as general examples.
- End with a concise, relevant call to action.
- Return only the finished script. Do not add commentary about your process.`,
      input: `Create a complete video script about this topic:\n\n${topic}`,
    });

    return NextResponse.json({ script: result.text, provider: result.provider });
  } catch (error) {
    console.error("Script generation error:", error);
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json(
      { error: `Script generation failed: ${message}` },
      { status: 500 },
    );
  }
}
