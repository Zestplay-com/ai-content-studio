import { readFileSync, writeFileSync } from "node:fs";

const path = "app/page.tsx";
let text = readFileSync(path, "utf8");

if (text.includes("CAPTIONS_V1")) {
  console.log("Captions already installed.");
  process.exit(0);
}

text = text.replace('  const [voiceoverError, setVoiceoverError] = useState("");\n', '  const [voiceoverError, setVoiceoverError] = useState("");\n  const [captions, setCaptions] = useState<Record<number, { id: number; start: number; end: number; text: string }[]>>({});\n  const [captionsLoading, setCaptionsLoading] = useState(false);\n  const [captionsError, setCaptionsError] = useState("");\n');
text = text.replace('    setVoiceoverError("");\n  }\n\n  async function generateScript()', '    setVoiceoverError("");\n    setCaptions({});\n    setCaptionsError("");\n  }\n\n  async function generateScript()');
text = text.replace('      setVoiceoverError("");\n    } catch (err) {\n      setError', '      setVoiceoverError("");\n      setCaptions({});\n      setCaptionsError("");\n    } catch (err) {\n      setError');
text = text.replace('    setVoiceoverError("");\n    try {\n      const response = await fetch("/api/generate-scenes"', '    setVoiceoverError("");\n    setCaptions({});\n    setCaptionsError("");\n    try {\n      const response = await fetch("/api/generate-scenes"');

const marker = '              {/* VOICEOVER_V1 */}';
if (!text.includes(marker)) throw new Error("Voiceover marker was not found in app/page.tsx");

const functionBlock = `  async function generateCaptions() {
    setCaptionsLoading(true);
    setCaptionsError("");
    try {
      const response = await fetch("/api/generate-captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenes }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to generate captions.");
      const next = Object.fromEntries((data.captions || []).map((item: any) => [item.scene_number, item.captions]));
      setCaptions(next);
    } catch (err) {
      setCaptionsError(err instanceof Error ? err.message : "Failed to generate captions.");
    } finally {
      setCaptionsLoading(false);
    }
  }

`;
const fnAnchor = '  return (\n';
if (!text.includes(fnAnchor)) throw new Error("Return anchor was not found in app/page.tsx");
text = text.replace(fnAnchor, functionBlock + fnAnchor);

const ui = `
              {/* CAPTIONS_V1 */}
              {Object.keys(voiceovers).length === scenes.length && scenes.length > 0 && (
                <section style={{ ...card, marginTop: 18, borderColor: "#29476a" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                    <div><h2 style={{ margin: 0, fontSize: 22 }}>Automatic Captions</h2><p style={{ color: "#7186a0", fontSize: 13, margin: "5px 0 0", lineHeight: 1.5 }}>Create readable caption beats from the exact scene voiceover. These timings will feed the final video timeline.</p></div>
                    <span style={status}>{Object.keys(captions).length} / {scenes.length} CAPTIONED</span>
                  </div>
                  {captionsError && <div style={{ ...errorBox, marginTop: 14 }}>{captionsError}</div>}
                  {Object.keys(captions).length === 0 ? <div style={{ marginTop: 16 }}><button type="button" onClick={generateCaptions} disabled={captionsLoading} style={{ ...primaryButton, opacity: captionsLoading ? 0.6 : 1 }}>{captionsLoading ? "Generating Captions…" : "Generate Captions →"}</button></div> : <div style={{ display: "grid", gap: 12, marginTop: 16 }}>{scenes.map((scene) => <article key={scene.number} style={{ border: "1px solid #1d3048", borderRadius: 14, padding: 14, background: "#091522" }}><div style={{ fontWeight: 800, marginBottom: 10 }}>Scene {scene.number}: {scene.title}</div><div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>{(captions[scene.number] || []).map((caption) => <span key={caption.id} style={{ padding: "7px 9px", borderRadius: 8, background: "#0f2236", border: "1px solid #203b58", color: "#dce9f7", fontSize: 12 }}><strong>{caption.text}</strong> <span style={{ color: "#7186a0" }}>{caption.start.toFixed(1)}–{caption.end.toFixed(1)}s</span></span>)}</div></article>)}<div style={{ marginTop: 4, padding: 14, borderRadius: 12, background: "#0b1b2c", border: "1px solid #29476a" }}><div style={{ fontWeight: 800 }}>CAPTIONS READY</div><div style={{ color: "#8fa4bd", fontSize: 12, marginTop: 4 }}>Caption beats are prepared for the timeline. Next production stage: timeline assembly and final video rendering.</div></div></div>}
                </section>
              )}
`;
text = text.replace(marker, marker + ui);
writeFileSync(path, text);
console.log("Captions studio installed successfully.");
