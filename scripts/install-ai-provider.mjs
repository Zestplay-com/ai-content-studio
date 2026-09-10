import { readFileSync, writeFileSync } from "node:fs";

const path = "app/page.tsx";
let text = readFileSync(path, "utf8");

if (text.includes("AI_PROVIDER_V3")) {
  console.log("AI provider selector already installed.");
  process.exit(0);
}

// Upgrade the older V2 selector in-place when a previous generated page is present.
if (text.includes("AI_PROVIDER_V2")) {
  text = text.replace("{/* AI_PROVIDER_V2 */}", "{/* AI_PROVIDER_V3 */}");
  text = text.replace(
    "Auto keeps OpenAI as the primary and uses Vercel AI Gateway as fallback.",
    "Auto tries the configured direct AI providers in order. No Vercel AI Gateway required.",
  );
  text = text.replace(
    '<option value="gemini">Gemini</option>',
    '<option value="gemini">Gemini</option>\n                    <option value="xai">Grok (xAI)</option>\n                    <option value="deepseek">DeepSeek</option>\n                    <option value="mistral">Mistral</option>',
  );
  writeFileSync(path, text);
  console.log("AI provider selector upgraded successfully.");
  process.exit(0);
}

const stateAnchor = '  const [stockError, setStockError] = useState("");\n';
if (text.includes(stateAnchor)) {
  text = text.replace(
    stateAnchor,
    `${stateAnchor}  const [aiProvider, setAiProvider] = useState("auto");\n  const [aiProviderUsed, setAiProviderUsed] = useState("");\n`,
  );
} else if (!text.includes('const [aiProvider, setAiProvider]')) {
  throw new Error("AI provider state anchor was not found in app/page.tsx");
}

text = text.replace(
  'body: JSON.stringify({ topic, length, format, language }),',
  'body: JSON.stringify({ topic, length, format, language, provider: aiProvider }),',
);

text = text.replace(
  'body: JSON.stringify({ script, format }),',
  'body: JSON.stringify({ script, format, provider: aiProvider }),',
);

text = text.replace(
  '      setScript(data.script);\n',
  '      setScript(data.script);\n      setAiProviderUsed(data.provider || aiProvider);\n',
);

// The scene API also returns the provider used, so include it in the local
// response type. Without this, strict TypeScript rejects data.provider.
text = text.replace(
  'let data: { scenes?: Scene[]; error?: string } = {};',
  'let data: { scenes?: Scene[]; provider?: string; error?: string } = {};',
);

text = text.replace(
  '      setScenes(Array.isArray(data.scenes) ? data.scenes : []);\n',
  '      setScenes(Array.isArray(data.scenes) ? data.scenes : []);\n      if (data.provider) setAiProviderUsed(data.provider);\n',
);

const anchor = '              <div style={{ ...card, marginTop: 24 }}>\n';
if (!text.includes(anchor)) throw new Error("Creator card anchor was not found in app/page.tsx");

const ui = `              {/* AI_PROVIDER_V3 */}
              <div style={{ ...card, marginTop: 18, borderColor: "#29476a" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>AI Provider</div>
                    <div style={{ color: "#7186a0", fontSize: 12, marginTop: 5, lineHeight: 1.5 }}>Choose the AI that writes your script and scenes. Auto tries configured direct providers and does not require Vercel AI Gateway.</div>
                  </div>
                  <select value={aiProvider} onChange={(e) => { setAiProvider(e.target.value); setAiProviderUsed(""); }} style={{ ...input, width: "auto", minWidth: 205 }}>
                    <option value="auto">Auto — Recommended</option>
                    <option value="openai">OpenAI</option>
                    <option value="claude">Claude</option>
                    <option value="gemini">Gemini</option>
                    <option value="xai">Grok (xAI)</option>
                    <option value="deepseek">DeepSeek</option>
                    <option value="mistral">Mistral</option>
                  </select>
                </div>
                {aiProviderUsed && <div style={{ color: "#9fc4ff", fontSize: 11, marginTop: 9 }}>✓ AI used: {aiProviderUsed}</div>}
              </div>

`;

text = text.replace(anchor, ui + anchor);
writeFileSync(path, text);
console.log("AI provider selector installed successfully.");
