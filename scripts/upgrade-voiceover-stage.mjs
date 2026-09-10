import { readFileSync, writeFileSync } from "node:fs";

const path = "app/page.tsx";
let text = readFileSync(path, "utf8");

if (text.includes("VOICEOVER_STAGE_V1")) {
  console.log("Voiceover stage upgrade already installed.");
  process.exit(0);
}

text = text.replace(
  '  const [stockError, setStockError] = useState("");\n',
  '  const [stockError, setStockError] = useState("");\n  const [showVoiceoverStage, setShowVoiceoverStage] = useState(false);\n  const [voiceoverProvider, setVoiceoverProvider] = useState("auto");\n',
);

text = text.replace(
  '    setStockError("");\n  }\n\n  async function generateScript()',
  '    setStockError("");\n    setShowVoiceoverStage(false);\n  }\n\n  async function generateScript()',
);

text = text.replace(
  '      setStockError("");\n    } catch (err) {\n      setError',
  '      setStockError("");\n      setShowVoiceoverStage(false);\n    } catch (err) {\n      setError',
);

text = text.replace(
  '    setStockError("");\n    try {\n      const response = await fetch("/api/generate-scenes"',
  '    setStockError("");\n    setShowVoiceoverStage(false);\n    try {\n      const response = await fetch("/api/generate-scenes"',
);

text = text.replace(
  'body: JSON.stringify({ scene, voiceStyle: voiceoverStyle }),',
  'body: JSON.stringify({ scene, voiceStyle: voiceoverStyle, provider: voiceoverProvider }),',
);

text = text.replace(
  '{stockMatches.length > 0 && Object.keys(selectedClips).length === stockMatches.length && (',
  '{showVoiceoverStage && stockMatches.length > 0 && Object.keys(selectedClips).length === stockMatches.length && (',
);

const voiceMarker = '              {/* VOICEOVER_V1 */}';
const voiceStart = text.indexOf(voiceMarker);
if (voiceStart === -1) throw new Error("VOICEOVER_V1 marker was not found.");
const sectionStart = text.indexOf('<section style={{ ...card, marginTop: 18, borderColor: "#29476a" }}>', voiceStart);
if (sectionStart === -1) throw new Error("Voiceover section was not found after VOICEOVER_V1 marker.");
text = text.slice(0, sectionStart) + text.slice(sectionStart).replace(
  '<section style={{ ...card, marginTop: 18, borderColor: "#29476a" }}>',
  '<section id="voiceover-section" style={{ ...card, marginTop: 18, borderColor: "#29476a" }}>'
);

const controlsMarker = '                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 18 }}>\n';
const controlsStart = text.indexOf(controlsMarker, voiceStart);
if (controlsStart !== -1 && !text.includes("VOICEOVER_STAGE_PROVIDER_CONTROLS")) {
  const controls = `                  {/* VOICEOVER_STAGE_PROVIDER_CONTROLS */}\n                  <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 10, marginBottom: 14 }}>
                    <select value={voiceoverProvider} onChange={(e) => setVoiceoverProvider(e.target.value)} style={input}>
                      <option value="auto">Auto — OpenAI → AI Gateway fallback</option>
                      <option value="openai">OpenAI TTS</option>
                      <option value="gateway-xai">Vercel AI Gateway — Grok TTS</option>
                      <option value="elevenlabs">ElevenLabs (optional)</option>
                    </select>
                    <div style={{ color: "#7186a0", fontSize: 11, display: "flex", alignItems: "center" }}>Auto uses OpenAI first, then tries Vercel AI Gateway if OpenAI fails.</div>
                  </div>\n`;
  text = text.slice(0, controlsStart) + controls + text.slice(controlsStart);
}

text = text.replace(
  'onClick={() => document.getElementById("voiceover-section")?.scrollIntoView({ behavior: "smooth", block: "start" })}',
  'onClick={() => { setShowVoiceoverStage(true); window.requestAnimationFrame(() => document.getElementById("voiceover-section")?.scrollIntoView({ behavior: "smooth", block: "start" })); }}',
);

text = text.replace(
  '              {/* VOICEOVER_STAGE_V1 */}',
  '              {/* VOICEOVER_STAGE_V1 */}',
);

writeFileSync(path, text);
console.log("Voiceover stage upgrade installed successfully.");
