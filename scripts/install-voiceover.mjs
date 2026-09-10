import { readFileSync, writeFileSync } from "node:fs";

const path = "app/page.tsx";
let text = readFileSync(path, "utf8");

if (text.includes("VOICEOVER_V1")) {
  console.log("Voiceover already installed.");
  process.exit(0);
}

text = text.replace(
  '  const [selectedClips, setSelectedClips] = useState<Record<number, number>>({});\\n',
  '  const [selectedClips, setSelectedClips] = useState<Record<number, number>>({});\\n  const [voiceoverStyle, setVoiceoverStyle] = useState("Natural");\\n  const [voiceovers, setVoiceovers] = useState<Record<number, { audio_url: string; voice: string; voice_style: string }>>({});\\n  const [generatingVoiceover, setGeneratingVoiceover] = useState<number | null>(null);\\n  const [voiceoverError, setVoiceoverError] = useState("");\\n',
);

text = text.replace(
  '    setSelectedClips({});\\n  }\\n\\n  async function generateScript()',
  '    setSelectedClips({});\\n    setVoiceovers({});\\n    setVoiceoverError("");\\n  }\\n\\n  async function generateScript()',
);

text = text.replace(
  '      setSelectedClips({});\\n    } catch (err) {\\n      setError',
  '      setSelectedClips({});\\n      setVoiceovers({});\\n      setVoiceoverError("");\\n    } catch (err) {\\n      setError',
);

text = text.replace(
  '    setSelectedClips({});\\n    try {\\n      const response = await fetch("/api/generate-scenes"',
  '    setSelectedClips({});\\n    setVoiceovers({});\\n    setVoiceoverError("");\\n    try {\\n      const response = await fetch("/api/generate-scenes"',
);

// The footage picker was upgraded to V2 and owns the selectedClips state.
// Keep this installer compatible with that current marker.
const marker = '              {/* FOOTAGE_PICKER_V2 */}';
if (!text.includes(marker)) throw new Error("Footage picker marker was not found in app/page.tsx");

const functionBlock = `  async function generateSceneVoiceover(scene: any) {
    setGeneratingVoiceover(scene.number);
    setVoiceoverError("");
    try {
      const response = await fetch("/api/generate-voiceover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scene, voiceStyle: voiceoverStyle }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to generate voiceover.");
      setVoiceovers((current) => ({ ...current, [scene.number]: { audio_url: data.audio_url, voice: data.voice, voice_style: data.voice_style } }));
    } catch (err) {
      setVoiceoverError(err instanceof Error ? err.message : "Failed to generate voiceover.");
    } finally {
      setGeneratingVoiceover(null);
    }
  }

  async function generateAllVoiceovers() {
    setVoiceoverError("");
    for (const scene of scenes) await generateSceneVoiceover(scene);
  }

`;

const fnAnchor = '  return (\\n';
if (!text.includes(fnAnchor)) throw new Error("Return anchor was not found in app/page.tsx");
text = text.replace(fnAnchor, functionBlock + fnAnchor);

const ui = `
              {/* VOICEOVER_V1 */}
              {stockMatches.length > 0 && Object.keys(selectedClips).length === stockMatches.length && (
                <section style={{ ...card, marginTop: 18, borderColor: "#29476a" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
                    <div>
                      <h2 style={{ margin: 0, fontSize: 22 }}>AI Voiceover</h2>
                      <p style={{ color: "#7186a0", fontSize: 13, margin: "5px 0 0", lineHeight: 1.5 }}>Turn each scene's exact voiceover script into natural spoken audio.</p>
                    </div>
                    <span style={status}>{Object.keys(voiceovers).length} / {scenes.length} READY</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 18 }}>
                    {(["Natural", "Deep & cinematic", "Warm & friendly", "Energetic"] as const).map((style) => (
                      <button key={style} type="button" onClick={() => setVoiceoverStyle(style)} style={{ ...(voiceoverStyle === style ? primaryButton : secondaryButton), fontSize: 12 }}>{style}</button>
                    ))}
                  </div>
                  {voiceoverError && <div style={{ ...errorBox, marginBottom: 14 }}>{voiceoverError}</div>}
                  <div style={{ display: "grid", gap: 12 }}>
                    {scenes.map((scene) => {
                      const audio = voiceovers[scene.number];
                      const busy = generatingVoiceover === scene.number;
                      return (
                        <article key={scene.number} style={{ border: "1px solid #1d3048", borderRadius: 14, padding: 14, background: "#091522" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                            <div style={{ minWidth: 0, flex: 1 }}><div style={{ fontWeight: 800 }}>Scene {scene.number}: {scene.title}</div><p style={{ color: "#8fa4bd", fontSize: 13, lineHeight: 1.55, margin: "7px 0 0" }}>{scene.voiceover}</p></div>
                            <span style={tag}>{audio ? "VOICEOVER READY" : busy ? "GENERATING…" : "READY"}</span>
                          </div>
                          {audio ? <div style={{ marginTop: 12 }}><audio controls preload="metadata" src={audio.audio_url} style={{ width: "100%" }} /><div style={{ color: "#7186a0", fontSize: 11, marginTop: 6 }}>Voice: {audio.voice} · Style: {audio.voice_style}</div></div> : <button type="button" onClick={() => generateSceneVoiceover(scene)} disabled={generatingVoiceover !== null} style={{ ...secondaryButton, marginTop: 12, opacity: generatingVoiceover !== null ? 0.6 : 1 }}>{busy ? "Generating voiceover…" : "Generate This Voiceover"}</button>}
                        </article>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid #1d3048", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                    <div><div style={{ fontWeight: 750 }}>Voice style: {voiceoverStyle}</div><div style={{ color: "#7186a0", fontSize: 12, marginTop: 4 }}>Audio is generated scene-by-scene so long projects stay reliable.</div></div>
                    <button type="button" onClick={generateAllVoiceovers} disabled={generatingVoiceover !== null || Object.keys(voiceovers).length === scenes.length} style={{ ...primaryButton, opacity: generatingVoiceover !== null || Object.keys(voiceovers).length === scenes.length ? 0.45 : 1 }}>{Object.keys(voiceovers).length === scenes.length ? "✓ All Voiceovers Ready" : generatingVoiceover !== null ? "Generating Voiceovers…" : "Generate All Voiceovers →"}</button>
                  </div>
                  {Object.keys(voiceovers).length === scenes.length && scenes.length > 0 && <div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: "#0b1b2c", border: "1px solid #29476a" }}><div style={{ fontWeight: 800 }}>VOICEOVER READY</div><div style={{ color: "#8fa4bd", fontSize: 12, marginTop: 4 }}>All {scenes.length} scene voiceovers are ready. Next production stage: captions and timeline assembly.</div></div>}
                </section>
              )}
`;
text = text.replace(marker, marker + ui);
writeFileSync(path, text);
console.log("Voiceover studio installed successfully.");
