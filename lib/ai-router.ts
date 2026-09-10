import OpenAI from "openai";

export type AiProvider = "auto" | "openai" | "claude" | "gemini" | "xai" | "deepseek" | "mistral";

type TextOptions = {
  provider?: unknown;
  instructions: string;
  input: string;
};

export function normalizeAiProvider(value: unknown): AiProvider {
  if (
    value === "openai" ||
    value === "claude" ||
    value === "gemini" ||
    value === "xai" ||
    value === "deepseek" ||
    value === "mistral"
  ) return value;
  return "auto";
}

async function generateWithOpenAI(instructions: string, input: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");

  const client = new OpenAI({ apiKey });
  const response = await client.responses.create({
    model: process.env.OPENAI_TEXT_MODEL || "gpt-5.6-luna",
    instructions,
    input,
  });

  const text = response.output_text?.trim();
  if (!text) throw new Error("OpenAI returned an empty response.");
  return text;
}

async function generateWithAnthropic(instructions: string, input: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured.");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_TEXT_MODEL || "claude-sonnet-4-5",
      max_tokens: 5000,
      system: instructions,
      messages: [{ role: "user", content: input }],
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || `Anthropic request failed (${response.status}).`);
  const text = Array.isArray(data?.content)
    ? data.content.filter((item: { type?: string }) => item.type === "text").map((item: { text?: string }) => item.text || "").join("\n").trim()
    : "";
  if (!text) throw new Error("Anthropic returned an empty response.");
  return text;
}

async function generateWithGemini(instructions: string, input: string) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY or GOOGLE_API_KEY is not configured.");

  const model = process.env.GEMINI_TEXT_MODEL || "gemini-2.5-pro";
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: instructions }] },
      contents: [{ role: "user", parts: [{ text: input }] }],
      generationConfig: { temperature: 0.7 },
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || `Gemini request failed (${response.status}).`);
  const text = data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("\n").trim();
  if (!text) throw new Error("Gemini returned an empty response.");
  return text;
}

async function generateWithXai(instructions: string, input: string) {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("XAI_API_KEY is not configured.");

  return generateWithOpenAICompatible(
    "https://api.x.ai/v1/chat/completions",
    apiKey,
    process.env.XAI_TEXT_MODEL || "grok-4-1-fast",
    instructions,
    input,
  );
}

async function generateWithDeepSeek(instructions: string, input: string) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY is not configured.");

  return generateWithOpenAICompatible(
    "https://api.deepseek.com/chat/completions",
    apiKey,
    process.env.DEEPSEEK_TEXT_MODEL || "deepseek-chat",
    instructions,
    input,
  );
}

async function generateWithMistral(instructions: string, input: string) {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) throw new Error("MISTRAL_API_KEY is not configured.");

  return generateWithOpenAICompatible(
    "https://api.mistral.ai/v1/chat/completions",
    apiKey,
    process.env.MISTRAL_TEXT_MODEL || "mistral-large-latest",
    instructions,
    input,
  );
}

async function generateWithOpenAICompatible(
  url: string,
  apiKey: string,
  model: string,
  instructions: string,
  input: string,
) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: instructions },
        { role: "user", content: input },
      ],
      temperature: 0.7,
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || `AI provider request failed (${response.status}).`);
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("AI provider returned an empty response.");
  return text;
}

const DIRECT_PROVIDERS: Array<[string, () => Promise<string>]> = [
  ["openai", () => Promise.reject(new Error("not called"))],
  ["claude", () => Promise.reject(new Error("not called"))],
  ["gemini", () => Promise.reject(new Error("not called"))],
  ["xai", () => Promise.reject(new Error("not called"))],
  ["deepseek", () => Promise.reject(new Error("not called"))],
  ["mistral", () => Promise.reject(new Error("not called"))],
];

async function runProvider(provider: Exclude<AiProvider, "auto">, instructions: string, input: string) {
  switch (provider) {
    case "openai": return generateWithOpenAI(instructions, input);
    case "claude": return generateWithAnthropic(instructions, input);
    case "gemini": return generateWithGemini(instructions, input);
    case "xai": return generateWithXai(instructions, input);
    case "deepseek": return generateWithDeepSeek(instructions, input);
    case "mistral": return generateWithMistral(instructions, input);
  }
}

export async function generateAiText(options: TextOptions) {
  const provider = normalizeAiProvider(options.provider);

  if (provider !== "auto") {
    return {
      text: await runProvider(provider, options.instructions, options.input),
      provider,
    };
  }

  const attempts: string[] = [];
  const configured: Array<Exclude<AiProvider, "auto">> = [
    "openai",
    "claude",
    "gemini",
    "xai",
    "deepseek",
    "mistral",
  ];

  for (const candidate of configured) {
    try {
      const text = await runProvider(candidate, options.instructions, options.input);
      return { text, provider: candidate };
    } catch (error) {
      attempts.push(`${candidate}: ${error instanceof Error ? error.message : "failed"}`);
    }
  }

  throw new Error(`All configured AI providers failed. ${attempts.join(" | ")}`);
}
