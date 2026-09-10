import { readFileSync, writeFileSync } from "node:fs";

const path = "app/page.tsx";
let text = readFileSync(path, "utf8");

if (text.includes("AI_PROVIDER_V1")) {
  console.log("AI provider selector already installed.");
  process.exit(0);
}

text = text.replace(
  '  const [stockError, setStockError] = useState("");\n',
  '  const [stockError, setStockError] = useState("");\n  const [aiProvider, setAiProvider] = useState("auto");\n',
);

text = text.replace(
  'body: JSON.stringify({ topic, length, format, language }),',
  'body: JSON.stringify({ topic, length, format, language, provider: aiProvider }),',
);

text = text.replace(
  'body: JSON.stringify({ script, format }),',
  'body: JSON.stringify({ script, format, provider: aiProvider }),',
);

const anchor = '              <div style={{ ...card, marginTop: 24 }}>\n';
if (!text.includes(anchor)) throw new Error("Creator card anchor was not found in app/page.tsx");

const ui = `              {/* AI_PROVIDER_V1 */}\n              <div style={{ ...card, marginTop: 18, borderColor: "#29476a" }}>\n                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>\n                  <div>\n                    <div style={{ fontWeight: 800, fontSize: 15 }}>AI Provider</div>\n                    <div style={{ color: "#7186a0", fontSize: 12, marginTop: 5, lineHeight: 1.5 }}>Choose a provider or let AI Content Studio switch automatically if one is unavailable.</div>\n                  </div>\n                  <select value={aiProvider} onChange={(e) => setAiProvider(e.target.value)} style={{ ...input, width: "auto", minWidth: 180 }}>\n                    <option value="auto">Auto — Recommended</option>\n                    <option value="openai">OpenAI</option>\n                    <option value="claude">Claude</option>\n                    <option value="gemini">Gemini</option>\n                  </select>\n                </div>\n                <div style={{ color: "#8fa4bd", fontSize: 11, marginTop: 9 }}>Auto uses OpenAI first, then can fall back through Vercel AI Gateway when configured.</div>\n              </div>\n\n`;

text = text.replace(anchor, ui + anchor);
writeFileSync(path, text);
console.log("AI provider selector installed successfully.");
