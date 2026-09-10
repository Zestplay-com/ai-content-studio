import { readFileSync, writeFileSync } from "node:fs";

const path = "app/page.tsx";
let text = readFileSync(path, "utf8");

if (text.includes("TIMELINE_V1")) {
  console.log("Timeline already installed.");
  process.exit(0);
}

text = text.replace('  const [captionsError, setCaptionsError] = useState("");\n', '  const [captionsError, setCaptionsError] = useState("");\n  const [timelineReady, setTimelineReady] = useState(false);\n  const [timelineError, setTimelineError] = useState("");\n');
text = text.replace('    setCaptionsError("");\n  }\n\n  async function generateScript()', '    setCaptionsError("");\n    setTimelineReady(false);\n    setTimelineError("");\n  }\n\n  async function generateScript()');
text = text.replace('      setCaptionsError("");\n    } catch (err) {\n      setError', '      setCaptionsError("");\n      setTimelineReady(false);\n      setTimelineError("");\n    } catch (err) {\n      setError');
text = text.replace('    setCaptionsError("");\n    try {\n      const response = await fetch("/api/generate-scenes"', '    setCaptionsError("");\n    setTimelineReady(false);\n    setTimelineError("");\n    try {\n      const response = await fetch("/api/generate-scenes"');

const marker = '              {/* CAPTIONS_V1 */}';
if (!text.includes(marker)) throw new Error("Captions marker was not found in app/page.tsx");

const functionBlock = `  function buildTimeline() {
    setTimelineError("");
    try {
      if (Object.keys(voiceovers).length !== scenes.length) throw new Error("Generate every scene voiceover first.");
      if (Object.keys(captions).length !== scenes.length) throw new Error("Generate captions first.");
      if (Object.keys(selectedClips).length !== stockMatches.length) throw new Error("Choose footage for every matched scene first.");
      setTimelineReady(true);
    } catch (err) {
      setTimelineError(err instanceof Error ? err.message : "Could not assemble the timeline.");
    }
  }

`;
const fnAnchor = '  return (\n';
if (!text.includes(fnAnchor)) throw new Error("Return anchor was not found in app/page.tsx");
text = text.replace(fnAnchor, functionBlock + fnAnchor);

const ui = `
              {/* TIMELINE_V1 */}
              {Object.keys(captions).length === scenes.length && scenes.length > 0 && (
                <section style={{ ...card, marginTop: 18, borderColor: "#29476a" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}><div><h2 style={{ margin: 0, fontSize: 22 }}>Automatic Timeline Assembly</h2><p style={{ color: "#7186a0", fontSize: 13, margin: "5px 0 0", lineHeight: 1.5 }}>Combine your selected footage, scene voiceovers and caption beats into one ordered video timeline.</p></div><span style={status}>{timelineReady ? "TIMELINE READY" : "READY TO ASSEMBLE"}</span></div>
                  {timelineError && <div style={{ ...errorBox, marginTop: 14 }}>{timelineError}</div>}
                  {!timelineReady ? <div style={{ marginTop: 16 }}><button type="button" onClick={buildTimeline} style={primaryButton}>Assemble Timeline →</button></div> : <div style={{ marginTop: 16 }}><div style={{ display: "grid", gap: 10 }}>{scenes.map((scene) => { const match = stockMatches.find((item) => item.scene_number === scene.number); const selectedId = selectedClips[scene.number]; const clip = match?.results?.find((item: any) => item.id === selectedId); const captionCount = captions[scene.number]?.length || 0; return <article key={scene.number} style={{ border: "1px solid #1d3048", borderRadius: 12, padding: 12, background: "#091522" }}><div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "center" }}><span style={{ ...tag, minWidth: 58, textAlign: "center" }}>#{scene.number}</span><div><div style={{ fontWeight: 800 }}>{scene.title}</div><div style={{ color: "#7186a0", fontSize: 11, marginTop: 4 }}>{Math.round(scene.duration_seconds || 0)}s · {captionCount} caption beats · {clip ? "Footage attached" : "No footage"}</div></div><span style={{ color: "#9dc7ff", fontSize: 11, fontWeight: 800 }}>{voiceovers[scene.number]?.voice || "Voice"}</span></div></article>; })}</div><div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: "#0b1b2c", border: "1px solid #29476a" }}><div style={{ fontWeight: 800 }}>TIMELINE READY</div><div style={{ color: "#8fa4bd", fontSize: 12, marginTop: 4 }}>All scenes are ordered with footage, voiceover and caption metadata. Export a render manifest to create the MP4 locally with FFmpeg.</div></div></div>}
                </section>
              )}
`;
text = text.replace(marker, marker + ui);
writeFileSync(path, text);
console.log("Timeline assembly installed successfully.");
