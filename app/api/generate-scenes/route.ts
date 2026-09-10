import { NextResponse } from "next/server";
import { generateAiText } from "@/lib/ai-router";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const script = typeof body.script === "string" ? body.script.trim() : "";
    const format = typeof body.format === "string" ? body.format : "YouTube";
    const provider = body.provider;

    if (!script) {
      return NextResponse.json({ error: "Please generate or enter a script first." }, { status: 400 });
    }

    if (script.length > 30000) {
      return NextResponse.json({ error: "The script is too long for scene planning. Please keep it under 30,000 characters." }, { status: 400 });
    }

    const result = await generateAiText({
      provider,
      instructions: `You are the scene director for AI Content Studio. Turn a finished video script into a practical production plan for ${format}.

Return ONLY valid JSON. The JSON must be an object with a "scenes" array. Each scene must contain exactly these fields:
- "number": integer starting at 1
- "title": short scene title
- "voiceover": the exact script text that should be spoken in this scene
- "visual_prompt": a detailed, concrete description of the footage or image that would best communicate the meaning of the voiceover
- "stock_search": a concise stock-footage search phrase
- "duration_seconds": integer estimate for the voiceover duration

Rules:
- Split the script into meaningful visual beats, normally 1 scene every 5–12 seconds depending on the content.
- Preserve the script wording exactly inside voiceover; do not rewrite it.
- Think about meaning and context, not just keywords. A scene should visually communicate what is being said.
- Use realistic footage ideas that can actually be found in stock libraries.
- Avoid vague searches such as "success" or "business" when a more specific search is possible.
- Keep visual prompts cinematic but practical.
- Do not add narration that is not in the supplied script.
- Make duration_seconds realistic for natural speech.`,
      input: `Create the scene plan for this script:\n\n${script}`,
    });

    const raw = result.text.trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
      parsed = JSON.parse(cleaned);
    }

    if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as { scenes?: unknown }).scenes)) {
      return NextResponse.json({ error: "The AI returned an invalid scene plan. Please try again." }, { status: 502 });
    }

    return NextResponse.json({ ...(parsed as object), provider: result.provider });
  } catch (error) {
    console.error("Scene generation error:", error);
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json(
      { error: `Scene generation failed: ${message}` },
      { status: 500 },
    );
  }
}
