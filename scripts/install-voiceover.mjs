import { readFileSync, writeFileSync } from "node:fs";

const path = "app/page.tsx";
let text = readFileSync(path, "utf8");

if (text.includes("VOICEOVER_V1")) {
  console.log("Voiceover already installed.");
  process.exit(0);
}

text = text.replace(
  '  const [selectedClips, setSelectedClips] = useState<Record<number, number>>({});\n',
  '  const [selectedClips, setSelectedClips] = useState<Record<number, number>>({});\n  const [voiceoverStyle, setVoiceoverStyle] = useState("Natural");\n  const [voiceovers, setVoiceovers] = useState<Record<number, { audio_url: string; voice: string; voice_style: string }>>({});\n  const [generatingVoiceover, setGeneratingVoiceover] = useState<number | null>(null);\n  const [voiceoverError, setVoiceoverError] = useState("");\n',
);

text = text.replace(
  '    setSelectedClips({});\n  }\n\n  async function generateScript()',
  '    setSelectedClips({});\n    setVoiceovers({});\n    setVoiceoverError("");\n  }\n\n  async function generateScript()',
);

text = text.replace(
  '      setSelectedClips({});\n    } catch (err) {\n      setError',
  '      setSelectedClips({});\n      setVoiceovers({});\n      setVoiceoverError("");\n    } catch (err) {\n      setError',
);

text = text.replace(
  '    setSelectedClips({});\n    try {\n      const response = await fetch("/api/generate-scenes"',
  '    setSelectedClips({});\n    setVoiceovers({});\n    setVoiceoverError("");\n    try {\n      const response = await fetch("/api/generate-scenes"',
);

const marker = '              {/* FOOTAGE_PICKER_V1 */}';
if (!text.includes(marker)) {
  throw new Error("Footage picker marker was not found in app/page.tsx");
}

const functionBlock = `\n  async function generateSceneVoiceover(scene: any) {\n    setGeneratingVoiceover(scene.number);\n    setVoiceoverError("");\n    try {\n      const response = await fetch("/api/generate-voiceover", {\n        method: "POST",\n        headers: { "Content-Type": "application/json" },\n        body: JSON.stringify({ scene, voiceStyle: voiceoverStyle }),\n      });\n      const data = await response.json();\n      if (!response.ok) throw new Error(data.error || "Failed to generate voiceover.");\n      setVoiceovers((current) => ({ ...current, [scene.number]: { audio_url: data.audio_url, voice: data.voice, voice_style: data.voice_style } }));\n    } catch (err) {\n      setVoiceoverError(err instanceof Error ? err.message : "Failed to generate voiceover.");\n    } finally {\n      setGeneratingVoiceover(null);\n    }\n  }\n\n  async function generateAllVoiceovers() {\n    setVoiceoverError("");\n    for (const scene of scenes) {\n      await generateSceneVoiceover(scene);\n    }\n  }\n`;

text = text.replace(marker, functionBlock + "\n" + marker);

const ui = `\n              {/* VOICEOVER_V1 */}\n              {stockMatches.length > 0 && Object.keys(selectedClips).length === stockMatches.length && (\n                <section style={{ ...card, marginTop: 18, borderColor: "#29476a" }}>\n                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>\n                    <div>\n                      <h2 style={{ margin: 0, fontSize: 22 }}>AI Voiceover</h2>\n                      <p style={{ color: "#7186a0", fontSize: 13, margin: "5px 0 0", lineHeight: 1.5 }}>\n                        Turn each scene's exact voiceover script into natural spoken audio.\n                      </p>\n                    </div>\n                    <span style={status}>{Object.keys(voiceovers).length} / {scenes.length} READY</span>\n                  </div>\n\n                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 18 }}>\n                    {(["Natural", "Deep & cinematic", "Warm & friendly", "Energetic"] as const).map((style) => (\n                      <button key={style} type="button" onClick={() => setVoiceoverStyle(style)} style={{ ...(voiceoverStyle === style ? primaryButton : secondaryButton), fontSize: 12 }}>\n                        {style}\n                      </button>\n                    ))}\n                  </div>\n\n                  {voiceoverError && <div style={{ ...errorBox, marginBottom: 14 }}>{voiceoverError}</div>}\n\n                  <div style={{ display: "grid", gap: 12 }}>\n                    {scenes.map((scene) => {\n                      const audio = voiceovers[scene.number];\n                      const busy = generatingVoiceover === scene.number;\n                      return (\n                        <article key={scene.number} style={{ border: "1px solid #1d3048", borderRadius: 14, padding: 14, background: "#091522" }}>\n                          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>\n                            <div style={{ minWidth: 0, flex: 1 }}>\n                              <div style={{ fontWeight: 800 }}>Scene {scene.number}: {scene.title}</div>\n                              <p style={{ color: "#8fa4bd", fontSize: 13, lineHeight: 1.55, margin: "7px 0 0" }}>{scene.voiceover}</p>\n                            </div>\n                            <span style={tag}>{audio ? "VOICEOVER READY" : busy ? "GENERATING…" : "READY"}</span>\n                          </div>\n                          {audio ? (\n                            <div style={{ marginTop: 12 }}>\n                              <audio controls preload="metadata" src={audio.audio_url} style={{ width: "100%" }} />\n                              <div style={{ color: "#7186a0", fontSize: 11, marginTop: 6 }}>Voice: {audio.voice} · Style: {audio.voice_style}</div>\n                            </div>\n                          ) : (\n                            <button type="button" onClick={() => generateSceneVoiceover(scene)} disabled={generatingVoiceover !== null} style={{ ...secondaryButton, marginTop: 12, opacity: generatingVoiceover !== null ? 0.6 : 1 }}>\n                              {busy ? "Generating voiceover…" : "Generate This Voiceover"}\n                            </button>\n                          )}\n                        </article>\n                      );\n                    })}\n                  </div>\n\n                  <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid #1d3048", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>\n                    <div>\n                      <div style={{ fontWeight: 750 }}>Voice style: {voiceoverStyle}</div>\n                      <div style={{ color: "#7186a0", fontSize: 12, marginTop: 4 }}>Audio is generated scene-by-scene so long projects stay reliable.</div>\n                    </div>\n                    <button type="button" onClick={generateAllVoiceovers} disabled={generatingVoiceover !== null || Object.keys(voiceovers).length === scenes.length} style={{ ...primaryButton, opacity: generatingVoiceover !== null || Object.keys(voiceovers).length === scenes.length ? 0.45 : 1 }}>\n                      {Object.keys(voiceovers).length === scenes.length ? "✓ All Voiceovers Ready" : generatingVoiceover !== null ? "Generating Voiceovers…" : "Generate All Voiceovers →"}\n                    </button>\n                  </div>\n\n                  {Object.keys(voiceovers).length === scenes.length && scenes.length > 0 && (\n                    <div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: "#0b1b2c", border: "1px solid #29476a" }}>\n                      <div style={{ fontWeight: 800 }}>VOICEOVER READY</div>\n                      <div style={{ color: "#8fa4bd", fontSize: 12, marginTop: 4 }}>All {scenes.length} scene voiceovers are ready. Next production stage: captions and timeline assembly.</div>\n                    </div>\n                  )}\n                </section>\n              )}\n`;

text = text.replace(marker, marker + ui);
writeFileSync(path, text);
console.log("Voiceover studio installed successfully.");
