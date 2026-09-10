"use client";

import { useState } from "react";

type Scene = {
  number: number;
  title: string;
  voiceover: string;
  visual_prompt: string;
  stock_search: string;
  duration_seconds: number;
};

const features = [
  { title: "AI Script", text: "Turn an idea into a structured, engaging video script." },
  { title: "AI Voice", text: "Generate natural voiceovers for every scene." },
  { title: "Smart Scenes", text: "Match meaningful stock footage to what the script actually says." },
  { title: "Captions", text: "Create timed captions automatically." },
  { title: "MP4 Export", text: "Assemble the project into a ready-to-use video." },
];

const projects = [
  { title: "Getting Started", status: "Draft", date: "Just now" },
  { title: "Your first AI video will appear here", status: "Ready", date: "" },
];

export default function Home() {
  const [showCreator, setShowCreator] = useState(false);
  const [topic, setTopic] = useState("");
  const [length, setLength] = useState("5 minutes");
  const [format, setFormat] = useState("YouTube");
  const [language, setLanguage] = useState("English");
  const [voice, setVoice] = useState("Natural");
  const [created, setCreated] = useState(false);
  const [script, setScript] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatingScenes, setGeneratingScenes] = useState(false);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [error, setError] = useState("");
  const [sceneError, setSceneError] = useState("");

  function createProject() {
    if (!topic.trim()) return;
    setCreated(true);
    setScript("");
    setScenes([]);
    setError("");
    setSceneError("");
  }

  async function generateScript() {
    if (!topic.trim() || generating) return;
    setGenerating(true);
    setError("");
    try {
      const response = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, length, format, language }),
      });
      const text = await response.text();
      let data: { script?: string; error?: string } = {};
      try { data = JSON.parse(text); } catch { throw new Error(`The server returned an unexpected response (${response.status}).`); }
      if (!response.ok) throw new Error(data.error || "Could not generate the script.");
      setScript(data.script || "");
      setScenes([]);
      setSceneError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate the script.");
    } finally {
      setGenerating(false);
    }
  }

  async function generateScenes() {
    if (!script.trim() || generatingScenes) return;
    setGeneratingScenes(true);
    setSceneError("");
    try {
      const response = await fetch("/api/generate-scenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script, format }),
      });
      const text = await response.text();
      let data: { scenes?: Scene[]; error?: string } = {};
      try { data = JSON.parse(text); } catch { throw new Error(`The scene service returned an unexpected response (${response.status}).`); }
      if (!response.ok) throw new Error(data.error || "Could not generate scenes.");
      setScenes(Array.isArray(data.scenes) ? data.scenes : []);
    } catch (err) {
      setSceneError(err instanceof Error ? err.message : "Could not generate scenes.");
    } finally {
      setGeneratingScenes(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", padding: "32px 20px" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, paddingBottom: 28 }}>
          <div><div style={{ fontWeight: 800, fontSize: 18 }}>AI Content Studio</div><div style={{ color: "#7186a0", fontSize: 12, marginTop: 3 }}>Create. Edit. Publish.</div></div>
          <button type="button" onClick={() => setShowCreator(true)} style={primaryButton}>+ New Video</button>
        </header>

        {!showCreator ? (
          <>
            <section style={{ border: "1px solid #1d3048", background: "linear-gradient(135deg, #0b1829, #0a1422)", borderRadius: 22, padding: "42px 30px", marginBottom: 24 }}>
              <span style={pill}>AI VIDEO WORKSPACE</span>
              <h1 style={{ fontSize: "clamp(38px, 6vw, 68px)", lineHeight: 1, letterSpacing: "-0.05em", maxWidth: 760, margin: "20px 0 18px" }}>Turn your idea into a finished video.</h1>
              <p style={{ maxWidth: 680, color: "#a9b9cc", fontSize: 17, lineHeight: 1.7, margin: 0 }}>Start with a simple topic. AI Content Studio will guide you from script to voice, scenes, captions, and eventually MP4 export.</p>
              <button type="button" onClick={() => setShowCreator(true)} style={{ ...primaryButton, marginTop: 26, padding: "15px 22px" }}>Create your first video →</button>
            </section>
            <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 14, marginBottom: 28 }}>
              {features.map((feature) => <article key={feature.title} style={card}><h2 style={{ fontSize: 16, margin: "0 0 9px" }}>{feature.title}</h2><p style={{ color: "#8fa4bd", lineHeight: 1.55, fontSize: 14, margin: 0 }}>{feature.text}</p></article>)}
            </section>
            <section><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><h2 style={{ fontSize: 20, margin: 0 }}>Recent projects</h2><span style={{ color: "#7186a0", fontSize: 13 }}>{projects.length} projects</span></div><div style={{ display: "grid", gap: 10 }}>{projects.map((project) => <div key={project.title} style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 15 }}><div><div style={{ fontWeight: 650 }}>{project.title}</div>{project.date && <div style={{ color: "#7186a0", fontSize: 12, marginTop: 5 }}>{project.date}</div>}</div><span style={status}>{project.status}</span></div>)}</div></section>
          </>
        ) : (
          <section>
            <button type="button" onClick={() => { setShowCreator(false); setCreated(false); setScript(""); setScenes([]); setError(""); setSceneError(""); }} style={backButton}>← Dashboard</button>
            <div style={{ maxWidth: 850, margin: "28px auto 60px" }}>
              <span style={pill}>NEW VIDEO</span>
              <h1 style={{ fontSize: "clamp(34px, 5vw, 52px)", letterSpacing: "-0.04em", margin: "16px 0 10px" }}>What do you want to create?</h1>
              <p style={{ color: "#8fa4bd", lineHeight: 1.6, marginTop: 0 }}>Give us an idea. We’ll turn it into a video project you can refine before rendering.</p>

              <div style={{ ...card, marginTop: 24 }}>
                <label style={label}>Video idea or topic</label>
                <textarea value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Example: 5 money habits that secretly keep people broke" style={{ ...input, minHeight: 130, resize: "vertical" }} />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginTop: 18 }}>
                  <div><label style={label}>Length</label><select value={length} onChange={(e) => setLength(e.target.value)} style={input}><option>60 seconds</option><option>3 minutes</option><option>5 minutes</option><option>10 minutes</option><option>15 minutes</option></select></div>
                  <div><label style={label}>Format</label><select value={format} onChange={(e) => setFormat(e.target.value)} style={input}><option>YouTube</option><option>YouTube Short</option><option>TikTok / Reel</option></select></div>
                  <div><label style={label}>Language</label><select value={language} onChange={(e) => setLanguage(e.target.value)} style={input}><option>English</option><option>French</option><option>Spanish</option></select></div>
                  <div><label style={label}>Voice</label><select value={voice} onChange={(e) => setVoice(e.target.value)} style={input}><option>Natural</option><option>Deep & cinematic</option><option>Warm & friendly</option><option>Energetic</option></select></div>
                </div>
                <button type="button" disabled={!topic.trim()} onClick={createProject} style={{ ...primaryButton, width: "100%", marginTop: 22, opacity: topic.trim() ? 1 : 0.45 }}>Create Video Project →</button>
              </div>

              {created && <div style={{ ...card, marginTop: 16, borderColor: "#29476a" }}>
                <div style={{ fontWeight: 750, marginBottom: 8 }}>Project created successfully.</div>
                <p style={{ color: "#8fa4bd", margin: 0, lineHeight: 1.6 }}>Your project is ready for AI script generation.</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}><span style={tag}>{length}</span><span style={tag}>{format}</span><span style={tag}>{language}</span><span style={tag}>{voice}</span></div>
                <button type="button" onClick={generateScript} disabled={generating} style={{ ...primaryButton, marginTop: 18, opacity: generating ? 0.6 : 1 }}>{generating ? "Writing your script…" : script ? "Regenerate AI Script" : "Generate AI Script →"}</button>
                {generating && <p style={{ color: "#7186a0", fontSize: 12, marginBottom: 0 }}>AI is writing your script. Please wait…</p>}
              </div>}

              {error && <div style={{ ...card, marginTop: 16, borderColor: "#6b3340" }}><div style={{ fontWeight: 700 }}>Something went wrong</div><p style={{ color: "#d7a9b2", marginBottom: 0, lineHeight: 1.5 }}>{error}</p></div>}

              {script && <div style={{ ...card, marginTop: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 12 }}><div><div style={{ fontWeight: 800, fontSize: 18 }}>AI-generated script</div><div style={{ color: "#7186a0", fontSize: 12, marginTop: 4 }}>Review and edit before moving to scenes and voiceover.</div></div><span style={status}>AI READY</span></div>
                <textarea value={script} onChange={(e) => setScript(e.target.value)} style={{ ...input, minHeight: 520, lineHeight: 1.7, resize: "vertical" }} />
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
                  <button type="button" style={primaryButton} onClick={generateScript} disabled={generating}>{generating ? "Generating…" : "Regenerate"}</button>
                  <button type="button" style={secondaryButton} onClick={generateScenes} disabled={generatingScenes}>{generatingScenes ? "Planning scenes…" : "Continue to Scenes →"}</button>
                </div>
                {generatingScenes && <p style={{ color: "#7186a0", fontSize: 12 }}>AI is analyzing the script and creating meaningful visual beats…</p>}
              </div>}

              {sceneError && <div style={{ ...card, marginTop: 16, borderColor: "#6b3340" }}><div style={{ fontWeight: 700 }}>Scene generation failed</div><p style={{ color: "#d7a9b2", marginBottom: 0, lineHeight: 1.5 }}>{sceneError}</p></div>}

              {scenes.length > 0 && <div style={{ marginTop: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><div><h2 style={{ margin: 0, fontSize: 22 }}>Smart Scene Plan</h2><p style={{ color: "#7186a0", fontSize: 13, margin: "5px 0 0" }}>{scenes.length} scenes created from your script.</p></div><span style={status}>SCENES READY</span></div>
                <div style={{ display: "grid", gap: 12 }}>
                  {scenes.map((scene) => <article key={scene.number} style={card}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 12 }}><div style={{ fontWeight: 800 }}>Scene {scene.number}: {scene.title}</div><span style={tag}>{scene.duration_seconds}s</span></div>
                    <div style={sceneSection}><div style={miniLabel}>VOICEOVER</div><p style={sceneText}>{scene.voiceover}</p></div>
                    <div style={sceneSection}><div style={miniLabel}>VISUAL DIRECTION</div><p style={sceneText}>{scene.visual_prompt}</p></div>
                    <div style={{ marginTop: 12 }}><div style={miniLabel}>STOCK SEARCH</div><span style={searchTag}>{scene.stock_search}</span></div>
                  </article>)}
                </div>
                <div style={{ ...card, marginTop: 16, borderColor: "#29476a" }}><div style={{ fontWeight: 750 }}>Next production stage</div><p style={{ color: "#8fa4bd", lineHeight: 1.6, marginBottom: 0 }}>These scene directions are now ready to drive automatic stock-footage search and matching. Voiceover, captions, and MP4 rendering come after that.</p></div>
              </div>}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

const primaryButton = { background: "#f7f9fc", color: "#07111f", border: 0, borderRadius: 11, padding: "11px 17px", fontWeight: 750, cursor: "pointer" } as const;
const secondaryButton = { background: "transparent", color: "#9db3cf", border: "1px solid #263852", borderRadius: 11, padding: "11px 17px", fontWeight: 700, cursor: "pointer" } as const;
const backButton = { background: "transparent", color: "#9db3cf", border: "1px solid #263852", borderRadius: 10, padding: "9px 13px", cursor: "pointer" } as const;
const card = { border: "1px solid #1d3048", background: "#0b1829", borderRadius: 16, padding: 20 } as const;
const pill = { display: "inline-block", padding: "7px 10px", border: "1px solid #263852", borderRadius: 999, color: "#9db3cf", fontSize: 11, letterSpacing: "0.08em", fontWeight: 700 } as const;
const status = { border: "1px solid #263852", borderRadius: 999, padding: "6px 9px", color: "#9db3cf", fontSize: 12 } as const;
const label = { display: "block", color: "#c5d1df", fontSize: 13, fontWeight: 650, marginBottom: 8 } as const;
const input = { width: "100%", boxSizing: "border-box" as const, background: "#07111f", color: "#f7f9fc", border: "1px solid #263852", borderRadius: 10, padding: "12px 13px", font: "inherit", outline: "none" } as const;
const tag = { display: "inline-block", border: "1px solid #263852", borderRadius: 8, padding: "6px 9px", color: "#9db3cf", fontSize: 12 } as const;
const sceneSection = { borderTop: "1px solid #1d3048", paddingTop: 12, marginTop: 12 } as const;
const miniLabel = { color: "#7186a0", fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", marginBottom: 5 } as const;
const sceneText = { color: "#c5d1df", lineHeight: 1.6, margin: 0, fontSize: 14 } as const;
const searchTag = { display: "inline-block", background: "#07111f", border: "1px solid #263852", borderRadius: 8, padding: "8px 10px", color: "#d5dfeb", fontSize: 13 } as const;
