import OpenAI from "openai";
import { generateText, gateway } from "ai";

export type AiProvider = "auto" | "openai" | "claude" | "gemini";

const GATEWAY_MODELS: Record<Exclude<AiProvider, "auto" | "openai">, string> = {
  claude: "anthropic/claude-sonnet-4.5",
  gemini: "google/gemini-2.5-pro",
};

const AUTO_FALLBACK_MODELS = [
  "anthropic/claude-sonnet-4.5",
  "google/gemini-2.5-pro",
  "openai/gpt-5.4",
];

export function normalizeAiProvider(value: unknown): AiProvider {
  if (value === "openai" || value === "claude" || value === "gemini") return value;
  return "auto";
}

function gatewayIsAvailable() {
  return Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL);
}

async function generateWithOpenAI(instructions: string, input: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");

  const client = new OpenAI({ apiKey });
  const response = await client.responses.create({
    model: "gpt-5.6-luna",
    instructions,
    input,
  });

  const text = response.output_text?.trim();
  if (!text) throw new Error("OpenAI returned an empty response.");
  return text;
}

async function generateWithGateway(model: string, instructions: string, input: string) {
  const result = await generateText({
    model: gateway(model),
    system: instructions,
    prompt: input,
  });
  const text = result.text?.trim();
  if (!text) throw new Error(`${model} returned an empty response.`);
  return text;
}

export async function generateAiText(options: {
  provider?: unknown;
  instructions: string;
  input: string;
}) {
  const provider = normalizeAiProvider(options.provider);
  const attempts: string[] = [];

  if (provider === "openai") {
    return { text: await generateWithOpenAI(options.instructions, options.input), provider: "openai" };
  }

  if (provider === "claude" || provider === "gemini") {
    if (!gatewayIsAvailable()) {
      throw new Error("AI Gateway is not configured. Add AI_GATEWAY_API_KEY in Vercel, or choose Auto/OpenAI.");
    }
    const model = GATEWAY_MODELS[provider];
    return { text: await generateWithGateway(model, options.instructions, options.input), provider };
  }

  // Auto mode keeps today's working OpenAI path as the primary provider.
  // If it fails, AI Gateway can transparently move to another provider/model.
  try {
    return { text: await generateWithOpenAI(options.instructions, options.input), provider: "openai" };
  } catch (error) {
    attempts.push(`openai: ${error instanceof Error ? error.message : "failed"}`);
  }

  if (!gatewayIsAvailable()) {
    throw new Error(`All configured AI providers failed. ${attempts.join(" | ")}`);
  }

  for (const model of AUTO_FALLBACK_MODELS) {
    try {
      const text = await generateWithGateway(model, options.instructions, options.input);
      return { text, provider: model.split("/")[0] };
    } catch (error) {
      attempts.push(`${model}: ${error instanceof Error ? error.message : "failed"}`);
    }
  }

  throw new Error(`All AI providers failed. ${attempts.join(" | ")}`);
}
