import { readFileSync, writeFileSync } from "node:fs";

const path = "app/page.tsx";
let text = readFileSync(path, "utf8");

if (text.includes("AI_PROVIDER_V2")) {
  console.log("AI provider selector already installed.");
  process.exit(0);
}

text = text.replace(
  '  const [stockError, setStockError] = useState("");\n',
  '  const [stockError, setStockError] = useState("");\n  const [aiProvider, setAiProvider] = useState("auto");\n  const [aiProviderUsed, setAiProviderUsed] = useState("");\n',
);

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

text = text.replace(
  '      setScenes(Array.isArray(data.scenes) ? data.scenes : []);\n',
  '      setScenes(Array.isArray(data.scenes) ? data.scenes : []);\n      if (data.provider) setAiProviderUsed(data.provider);\n',
);

const oldMarker = "AI_PROVIDER_V1";
if (!text.includes(oldMarker)) {
  throw new Error("AI provider v1 marker was not found in app/page.tsx");
}

text = text.replace(/\s*\/\* AI_PROVIDER_V1 \*\/[\s\S]*?\n\s*<\/div>\n\s*<\/div>\n\s*<\/div>\n/, "\n");

const anchor = '              <div style={{ ...card, marginTop: 24 }}>\n';
if (!text.includes(anchor)) throw new Error("Creator card anchor was not found in app/page.tsx");

const ui = `              {/* AI_PROVIDER_V2 */}
              <div style={{ ...card, marginTop: 18, borderColor: "#29476a" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>AI Provider</div>
                    <div style={{ color: "#7186a0", fontSize: 12, marginTop: 5, lineHeight: 1.5 }}>Choose the AI that writes your script and scenes. Auto keeps OpenAI as the primary and uses Vercel AI Gateway as fallback.</div>
                  </div>
                  <select value={aiProvider} onChange={(e) => { setAiProvider(e.target.value); setAiProviderUsed(""); }} style={{ ...input, width: "auto", minWidth: 205 }}>
                    <option value="auto">Auto — Recommended</option>
                    <option value="openai">OpenAI</option>
                    <option value="claude">Claude</option>
                    <option value="gemini">Gemini</option>
                  </select>
                </div>
                {aiProviderUsed && <div style={{ color: "#9fc4ff", fontSize: 11, marginTop: 9 }}>✓ AI used: {aiProviderUsed}</div>}
              </div>

`;

text = text.replace(anchor, ui + anchor);
writeFileSync(path, text);
console.log("AI provider selector installed successfully.");
