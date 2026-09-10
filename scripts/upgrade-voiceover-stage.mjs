import { readFileSync, writeFileSync } from "node:fs";

const path = "app/page.tsx";
let text = readFileSync(path, "utf8");

// Footage picker owns showVoiceoverStage. This installer only adds the
// provider state and upgrades the existing voiceover stage behavior.
const showState = '  const [showVoiceoverStage, setShowVoiceoverStage] = useState(false);\n';
const providerState = '  const [voiceoverProvider, setVoiceoverProvider] = useState("auto");\n';

const showStatePattern = /^[ \t]*const \[showVoiceoverStage, setShowVoiceoverStage\] = useState\(false\);[ \t]*\r?\n?/gm;
const providerStatePattern = /^[ \t]*const \[voiceoverProvider, setVoiceoverProvider\] = useState\("auto"\);[ \t]*\r?\n?/gm;
text = text.replace(showStatePattern, "");
text = text.replace(providerStatePattern, "");

const stockState = '  const [stockError, setStockError] = useState("");\n';
if (!text.includes(stockState)) throw new Error("Stock error state was not found.");
text = text.replace(stockState, stockState + showState);
text = text.replace(showState, showState + providerState);

if (!text.includes("VOICEOVER_STAGE_V1")) {
  const voiceMarker = '              {/* VOICEOVER_V1 */}';
  const voiceStart = text.indexOf(voiceMarker);
  if (voiceStart === -1) throw new Error("VOICEOVER_V1 marker was not found.");
  text = text.slice(0, voiceStart) + '              {/* VOICEOVER_STAGE_V1 */}\n' + text.slice(voiceStart);
}

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

const voiceStart = text.indexOf('              {/* VOICEOVER_STAGE_V1 */}');
if (voiceStart === -1) throw new Error("VOICEOVER_STAGE_V1 marker was not found.");

const sectionStart = text.indexOf('<section style={{ ...card, marginTop: 18, borderColor: "#29476a" }}>', voiceStart);
if (sectionStart === -1) throw new Error("Voiceover section was not found after VOICEOVER_STAGE_V1 marker.");
text = text.slice(0, sectionStart) + text.slice(sectionStart).replace(
  '<section style={{ ...card, marginTop: 18, borderColor: "#29476a" }}>',
  '<section id="voiceover-section" style={{ ...card, marginTop: 18, borderColor: "#29476a" }}>'
);

const controlsMarker = '                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 18 }}>\n';
const controlsStart = text.indexOf(controlsMarker, voiceStart);
if (controlsStart !== -1 && !text.includes("VOICEOVER_STAGE_PROVIDER_CONTROLS")) {
  const controls = `                  {/* VOICEOVER_STAGE_PROVIDER_CONTROLS */}\n                  <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 10, marginBottom: 14 }}>
                    <select value={voiceoverProvider} onChange={(e) => setVoiceoverProvider(e.target.value)} style={input}>
                      <option value="auto">Auto — OpenAI → ElevenLabs → Gemini → xAI</option>
                      <option value="openai">OpenAI TTS</option>
                      <option value="elevenlabs">ElevenLabs</option>
                      <option value="gemini">Gemini TTS</option>
                      <option value="xai">xAI TTS</option>
                    </select>
                    <div style={{ color: "#7186a0", fontSize: 11, display: "flex", alignItems: "center" }}>Auto tries the next configured provider when a provider hits a limit, fails, or is unavailable. No Vercel AI Gateway required.</div>
                  </div>\n`;
  text = text.slice(0, controlsStart) + controls + text.slice(controlsStart);
}

text = text.replace(
  'onClick={() => document.getElementById("voiceover-section")?.scrollIntoView({ behavior: "smooth", block: "start" })}',
  'onClick={() => { setShowVoiceoverStage(true); window.requestAnimationFrame(() => document.getElementById("voiceover-section")?.scrollIntoView({ behavior: "smooth", block: "start" })); }}',
);

writeFileSync(path, text);
console.log("Voiceover stage upgrade installed successfully.");
