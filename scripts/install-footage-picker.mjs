import { readFileSync, writeFileSync } from "node:fs";

const path = "app/page.tsx";
let text = readFileSync(path, "utf8");

if (text.includes("FOOTAGE_PICKER_V1")) {
  console.log("Footage picker already installed.");
  process.exit(0);
}

text = text.replace(
  '  const [stockError, setStockError] = useState("");\n',
  '  const [stockError, setStockError] = useState("");\n  const [selectedClips, setSelectedClips] = useState<Record<number, number>>({});\n',
);

text = text.replace(
  '    setStockError("");\n  }\n\n  async function generateScript()',
  '    setStockError("");\n    setSelectedClips({});\n  }\n\n  async function generateScript()',
);

text = text.replace(
  '      setStockError("");\n    } catch (err) {\n      setError',
  '      setStockError("");\n      setSelectedClips({});\n    } catch (err) {\n      setError',
);

text = text.replace(
  '    setStockError("");\n    try {\n      const response = await fetch("/api/generate-scenes"',
  '    setStockError("");\n    setSelectedClips({});\n    try {\n      const response = await fetch("/api/generate-scenes"',
);

text = text.replace(
  '      setStockMatches(Array.isArray(data.matches) ? data.matches : []);\n',
  '      const matches = Array.isArray(data.matches) ? data.matches : [];\n      setStockMatches(matches);\n      setSelectedClips(Object.fromEntries(matches.map((match) => [match.scene_number, match.results[0]?.id]).filter((entry) => entry[1] !== undefined)) as Record<number, number>);\n',
);

const marker = "              {stockError && ";
const picker = `              {/* FOOTAGE_PICKER_V1 */}
              {stockMatches.length > 0 && (
                <section style={{ ...card, marginTop: 18, borderColor: "#29476a" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
                    <div>
                      <h2 style={{ margin: 0, fontSize: 22 }}>Choose Your Footage</h2>
                      <p style={{ color: "#7186a0", fontSize: 13, margin: "5px 0 0", lineHeight: 1.5 }}>
                        Review the AI recommendations and choose the exact clip that should be used for each scene.
                      </p>
                    </div>
                    <span style={status}>{Object.keys(selectedClips).length} / {scenes.length} SELECTED</span>
                  </div>
                  <div style={{ display: "grid", gap: 18, marginTop: 18 }}>
                    {stockMatches.map((match) => {
                      const scene = scenes.find((item) => item.number === match.scene_number);
                      const selectedId = selectedClips[match.scene_number];
                      return (
                        <article key={match.scene_number} style={{ border: "1px solid #1d3048", borderRadius: 16, padding: 14, background: "#091522" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
                            <div>
                              <div style={{ fontWeight: 800 }}>Scene {match.scene_number}{scene ? \`: \${scene.title}\` : ""}</div>
                              {scene && <p style={{ color: "#8fa4bd", fontSize: 13, lineHeight: 1.5, margin: "6px 0 0" }}>{scene.voiceover}</p>}
                            </div>
                            <span style={tag}>{match.results.length} options</span>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                            {match.results.map((result, index) => {
                              const isSelected = selectedId === result.id;
                              return (
                                <div key={result.id} style={{ border: isSelected ? "2px solid #6ea8fe" : "1px solid #1d3048", borderRadius: 12, overflow: "hidden", background: "#0b1829" }}>
                                  <div style={{ position: "relative", aspectRatio: "16 / 9", background: "#050b12" }}>
                                    {result.video_url ? (
                                      <video controls preload="metadata" poster={result.thumbnail} src={result.video_url} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                                    ) : (
                                      <img src={result.thumbnail} alt={\`Scene \${match.scene_number} footage option \${index + 1}\`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                                    )}
                                    {index === 0 && <span style={{ position: "absolute", top: 8, left: 8, padding: "5px 8px", borderRadius: 999, background: "rgba(7,15,25,.88)", fontSize: 10, fontWeight: 800, letterSpacing: ".08em" }}>AI RECOMMENDED</span>}
                                  </div>
                                  <div style={{ padding: 10 }}>
                                    <div style={{ color: "#7186a0", fontSize: 11, marginBottom: 8 }}>{Math.round(result.duration)}s · {result.creator}</div>
                                    <button type="button" onClick={() => setSelectedClips((current) => ({ ...current, [match.scene_number]: result.id }))} style={{ ...(isSelected ? primaryButton : secondaryButton), width: "100%", fontSize: 12 }}>
                                      {isSelected ? "✓ Selected" : "Use This Clip"}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid #1d3048", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontWeight: 750 }}>Footage selection saved for this session.</div>
                      <div style={{ color: "#7186a0", fontSize: 12, marginTop: 4 }}>Next production stage: AI Voiceover</div>
                    </div>
                    <button type="button" onClick={() => document.getElementById("voiceover-section")?.scrollIntoView({ behavior: "smooth", block: "start" })} disabled={Object.keys(selectedClips).length < stockMatches.length} style={{ ...primaryButton, opacity: Object.keys(selectedClips).length < stockMatches.length ? 0.45 : 1 }}>
                      Continue to Voiceover →
                    </button>
                  </div>
                </section>
              )}

`;

if (!text.includes(marker)) {
  throw new Error("Could not find the stock error insertion point in app/page.tsx");
}

text = text.replace(marker, picker + marker);
writeFileSync(path, text);
console.log("Footage picker installed successfully.");
