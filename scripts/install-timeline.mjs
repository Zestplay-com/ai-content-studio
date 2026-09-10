import { readFileSync, writeFileSync } from "node:fs";

const path = "app/page.tsx";
let text = readFileSync(path, "utf8");

if (text.includes("TIMELINE_V1")) {
  console.log("Timeline already installed.");
  process.exit(0);
}

text = text.replace(
  '  const [captionsError, setCaptionsError] = useState("");\n',
  '  const [captionsError, setCaptionsError] = useState("");\n  const [timelineReady, setTimelineReady] = useState(false);\n  const [timelineError, setTimelineError] = useState("");\n',
);

text = text.replace(
  '    setCaptionsError("");\n  }\n\n  async function generateScript()',
  '    setCaptionsError("");\n    setTimelineReady(false);\n    setTimelineError("");\n  }\n\n  async function generateScript()',
);

text = text.replace(
  '      setCaptionsError("");\n    } catch (err) {\n      setError',
  '      setCaptionsError("");\n      setTimelineReady(false);\n      setTimelineError("");\n    } catch (err) {\n      setError',
);

text = text.replace(
  '    setCaptionsError("");\n    try {\n      const response = await fetch("/api/generate-scenes"',
  '    setCaptionsError("");\n    setTimelineReady(false);\n    setTimelineError("");\n    try {\n      const response = await fetch("/api/generate-scenes"',
);

const marker = '              {/* CAPTIONS_V1 */}';
if (!text.includes(marker)) throw new Error("Captions marker was not found in app/page.tsx");

const functionBlock = `\n  function buildTimeline() {\n    setTimelineError("");\n    try {\n      if (Object.keys(voiceovers).length !== scenes.length) throw new Error("Generate every scene voiceover first.");\n      if (Object.keys(captions).length !== scenes.length) throw new Error("Generate captions first.");\n      if (Object.keys(selectedClips).length !== stockMatches.length) throw new Error("Choose footage for every matched scene first.");\n      setTimelineReady(true);\n    } catch (err) {\n      setTimelineError(err instanceof Error ? err.message : "Could not assemble the timeline.");\n    }\n  }\n`;

const fnAnchor = '  async function generateCaptions() {';
if (!text.includes(fnAnchor)) throw new Error("Caption function anchor was not found.");
text = text.replace(fnAnchor, functionBlock + "\n" + fnAnchor);

const ui = `\n              {/* TIMELINE_V1 */}\n              {Object.keys(captions).length === scenes.length && scenes.length > 0 && (\n                <section style={{ ...card, marginTop: 18, borderColor: "#29476a" }}>\n                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>\n                    <div>\n                      <h2 style={{ margin: 0, fontSize: 22 }}>Automatic Timeline Assembly</h2>\n                      <p style={{ color: "#7186a0", fontSize: 13, margin: "5px 0 0", lineHeight: 1.5 }}>\n                        Combine your selected footage, scene voiceovers and caption beats into one ordered video timeline.\n                      </p>\n                    </div>\n                    <span style={status}>{timelineReady ? "TIMELINE READY" : "READY TO ASSEMBLE"}</span>\n                  </div>\n\n                  {timelineError && <div style={{ ...errorBox, marginTop: 14 }}>{timelineError}</div>}\n\n                  {!timelineReady ? (\n                    <div style={{ marginTop: 16 }}>\n                      <button type="button" onClick={buildTimeline} style={primaryButton}>Assemble Timeline →</button>\n                    </div>\n                  ) : (\n                    <div style={{ marginTop: 16 }}>\n                      <div style={{ display: "grid", gap: 10 }}>\n                        {scenes.map((scene) => {\n                          const match = stockMatches.find((item) => item.scene_number === scene.number);\n                          const selectedId = selectedClips[scene.number];\n                          const clip = match?.results?.find((item: any) => item.id === selectedId);\n                          const captionCount = captions[scene.number]?.length || 0;\n                          return (\n                            <article key={scene.number} style={{ border: "1px solid #1d3048", borderRadius: 12, padding: 12, background: "#091522" }}>\n                              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "center" }}>\n                                <span style={{ ...tag, minWidth: 58, textAlign: "center" }}>#{scene.number}</span>\n                                <div>\n                                  <div style={{ fontWeight: 800 }}>{scene.title}</div>\n                                  <div style={{ color: "#7186a0", fontSize: 11, marginTop: 4 }}>{Math.round(scene.duration_seconds || 0)}s · {captionCount} caption beats · {clip ? "Footage attached" : "No footage"}</div>\n                                </div>\n                                <span style={{ color: "#9dc7ff", fontSize: 11, fontWeight: 800 }}>{voiceovers[scene.number]?.voice || "Voice"}</span>\n                              </div>\n                            </article>\n                          );\n                        })}\n                      </div>\n                      <div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: "#0b1b2c", border: "1px solid #29476a" }}>\n                        <div style={{ fontWeight: 800 }}>TIMELINE READY</div>\n                        <div style={{ color: "#8fa4bd", fontSize: 12, marginTop: 4 }}>All scenes are ordered with footage, voiceover and caption metadata. Next production stage: MP4 rendering.</div>\n                      </div>\n                    </div>\n                  )}\n                </section>\n              )}\n`;

text = text.replace(marker, marker + ui);
writeFileSync(path, text);
console.log("Timeline assembly installed successfully.");
