"use client";

import { useState } from "react";

type Match = {
  scene_number: number;
  query: string;
  orientation: string;
  results: Array<{
    id: number;
    duration: number;
    thumbnail: string;
    pexels_url: string;
    creator: string;
    creator_url: string;
    video_url: string | null;
  }>;
};

const sampleScenes = [
  { number: 1, title: "Late-night struggle", stock_search: "stressed entrepreneur working alone late at night laptop", duration_seconds: 8 },
  { number: 2, title: "Money leaving", stock_search: "person checking bank account bills phone worried", duration_seconds: 7 },
  { number: 3, title: "Taking control", stock_search: "young adult planning personal finances notebook laptop", duration_seconds: 8 },
];

export default function StockMatcherPage() {
  const [format, setFormat] = useState("YouTube");
  const [scenesText, setScenesText] = useState(JSON.stringify(sampleScenes, null, 2));
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function matchStock() {
    setLoading(true);
    setError("");
    setMatches([]);
    try {
      let scenes: unknown;
      try {
        scenes = JSON.parse(scenesText);
      } catch {
        throw new Error("The scene JSON is not valid. Check the format and try again.");
      }
      if (!Array.isArray(scenes) || scenes.length === 0) {
        throw new Error("Add at least one scene before searching.");
      }

      const response = await fetch("/api/match-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenes, format }),
      });
      const text = await response.text();
      let data: { matches?: Match[]; error?: string } = {};
      try { data = JSON.parse(text); } catch { throw new Error(`The stock service returned an unexpected response (${response.status}).`); }
      if (!response.ok) throw new Error(data.error || "Could not search stock footage.");
      setMatches(data.matches || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not search stock footage.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", padding: "32px 20px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <a href="/" style={{ color: "#9db3cf", textDecoration: "none" }}>← Back to AI Content Studio</a>
        <div style={{ marginTop: 28 }}>
          <span style={pill}>STOCK MATCHING</span>
          <h1 style={{ fontSize: "clamp(36px, 6vw, 58px)", letterSpacing: "-0.05em", margin: "16px 0 10px" }}>Find footage that actually matches each scene.</h1>
          <p style={{ color: "#8fa4bd", lineHeight: 1.7, maxWidth: 760 }}>The AI scene plan supplies meaningful search phrases. This stage searches Pexels video and returns several candidates for every scene, with the correct orientation for the chosen format.</p>
        </div>

        <section style={{ ...card, marginTop: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 14, alignItems: "end" }}>
            <div><label style={label}>Format</label><select value={format} onChange={(e) => setFormat(e.target.value)} style={input}><option>YouTube</option><option>YouTube Short</option><option>TikTok / Reel</option></select></div>
          </div>
          <label style={{ ...label, marginTop: 18 }}>Scene plan JSON</label>
          <textarea value={scenesText} onChange={(e) => setScenesText(e.target.value)} style={{ ...input, minHeight: 300, fontFamily: "monospace", fontSize: 12, lineHeight: 1.55, resize: "vertical" }} />
          <button type="button" onClick={matchStock} disabled={loading} style={{ ...primaryButton, marginTop: 16, opacity: loading ? 0.6 : 1 }}>{loading ? "Searching Pexels…" : "Find Matching Footage →"}</button>
          {loading && <p style={{ color: "#7186a0", fontSize: 12 }}>Searching each scene with its own contextual query. Please wait…</p>}
        </section>

        {error && <div style={{ ...card, marginTop: 16, borderColor: "#6b3340" }}><strong>Something went wrong</strong><p style={{ color: "#d7a9b2", marginBottom: 0 }}>{error}</p></div>}

        {matches.length > 0 && <section style={{ marginTop: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><div><h2 style={{ margin: 0 }}>Matching footage</h2><p style={{ color: "#7186a0", margin: "5px 0 0", fontSize: 13 }}>Pexels results ranked for each scene query.</p></div><span style={status}>MATCHES READY</span></div>
          <div style={{ display: "grid", gap: 16 }}>
            {matches.map((match) => <article key={match.scene_number} style={card}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Scene {match.scene_number}</div>
              <div style={{ color: "#9db3cf", fontSize: 13, marginBottom: 14 }}>Search: <strong>{match.query}</strong> · {match.orientation}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                {match.results.map((result) => <div key={result.id} style={resultCard}>
                  <div style={{ position: "relative", aspectRatio: "16 / 9", background: "#07111f", borderRadius: 10, overflow: "hidden" }}>
                    <img src={result.thumbnail} alt="Pexels video preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                  <div style={{ marginTop: 9, fontSize: 12, color: "#9db3cf" }}>{result.duration}s · {result.creator}</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 9 }}>
                    {result.video_url && <a href={result.video_url} target="_blank" rel="noreferrer" style={smallButton}>Preview video</a>}
                    <a href={result.pexels_url} target="_blank" rel="noreferrer" style={smallButton}>Pexels</a>
                  </div>
                </div>)}
              </div>
            </article>)}
          </div>
          <p style={{ color: "#7186a0", fontSize: 12, marginTop: 16 }}>Photos/videos provided by Pexels. Use the Pexels attribution/link requirements when displaying or exporting their media.</p>
        </section>}
      </div>
    </main>
  );
}

const primaryButton = { background: "#f7f9fc", color: "#07111f", border: 0, borderRadius: 11, padding: "11px 17px", fontWeight: 750, cursor: "pointer" } as const;
const card = { border: "1px solid #1d3048", background: "#0b1829", borderRadius: 16, padding: 20 } as const;
const resultCard = { border: "1px solid #263852", background: "#07111f", borderRadius: 12, padding: 10 } as const;
const pill = { display: "inline-block", padding: "7px 10px", border: "1px solid #263852", borderRadius: 999, color: "#9db3cf", fontSize: 11, letterSpacing: "0.08em", fontWeight: 700 } as const;
const status = { border: "1px solid #263852", borderRadius: 999, padding: "6px 9px", color: "#9db3cf", fontSize: 12 } as const;
const label = { display: "block", color: "#c5d1df", fontSize: 13, fontWeight: 650, marginBottom: 8 } as const;
const input = { width: "100%", boxSizing: "border-box" as const, background: "#07111f", color: "#f7f9fc", border: "1px solid #263852", borderRadius: 10, padding: "12px 13px", font: "inherit", outline: "none" } as const;
const smallButton = { display: "inline-block", border: "1px solid #263852", borderRadius: 8, padding: "7px 9px", color: "#c5d1df", textDecoration: "none", fontSize: 12 } as const;
