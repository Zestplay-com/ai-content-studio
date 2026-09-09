const features = [
  { title: "AI Script", text: "Turn an idea into a structured, engaging video script." },
  { title: "AI Voice", text: "Generate natural voiceovers for every scene." },
  { title: "Smart Scenes", text: "Match meaningful stock footage to what the script actually says." },
  { title: "Captions", text: "Create timed captions automatically." },
  { title: "MP4 Export", text: "Assemble the project into a ready-to-use video." },
];

export default function Home() {
  return (
    <main style={{ minHeight: "100vh", padding: "48px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "inline-block", padding: "8px 12px", border: "1px solid #263852", borderRadius: 999, color: "#9db3cf", fontSize: 13 }}>
          AI Content Studio · MVP
        </div>

        <section style={{ padding: "72px 0 56px" }}>
          <h1 style={{ fontSize: "clamp(42px, 7vw, 78px)", lineHeight: 0.98, letterSpacing: "-0.05em", maxWidth: 850, margin: 0 }}>
            From an idea to a finished video.
          </h1>
          <p style={{ maxWidth: 680, color: "#a9b9cc", fontSize: 19, lineHeight: 1.7, marginTop: 26 }}>
            AI Content Studio will turn a simple topic into a script, voiceover, intelligently matched visuals, captions, and an exportable MP4.
          </p>
          <div style={{ display: "flex", gap: 14, marginTop: 32, flexWrap: "wrap" }}>
            <button style={{ background: "#f7f9fc", color: "#07111f", border: 0, borderRadius: 12, padding: "14px 20px", fontWeight: 700, cursor: "pointer" }}>
              Create a video
            </button>
            <button style={{ background: "transparent", color: "#f7f9fc", border: "1px solid #2b405c", borderRadius: 12, padding: "14px 20px", cursor: "pointer" }}>
              View workflow
            </button>
          </div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14 }}>
          {features.map((feature) => (
            <article key={feature.title} style={{ border: "1px solid #1d3048", background: "#0b1829", borderRadius: 16, padding: 20 }}>
              <h2 style={{ fontSize: 17, margin: "0 0 10px" }}>{feature.title}</h2>
              <p style={{ color: "#8fa4bd", lineHeight: 1.55, fontSize: 14, margin: 0 }}>{feature.text}</p>
            </article>
          ))}
        </section>

        <footer style={{ color: "#637993", fontSize: 13, padding: "56px 0 20px" }}>
          Built as a scalable foundation. Heavy video rendering will be separated from the web application as the product grows.
        </footer>
      </div>
    </main>
  );
}
