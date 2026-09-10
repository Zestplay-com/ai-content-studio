import { readFileSync, writeFileSync } from "node:fs";

const path = "app/page.tsx";
let text = readFileSync(path, "utf8");

if (text.includes("RENDER_EXPORT_V1")) {
  console.log("Render export already installed.");
  process.exit(0);
}

// Put the export function immediately before the component's JSX return.
// This keeps it unambiguously inside the component's JavaScript scope and
// avoids accidentally inserting JavaScript into a JSX expression.
const returnAnchor = "  return (";
if (!text.includes(returnAnchor)) throw new Error("Component return anchor was not found.");

const functionBlock = `  function exportRenderManifest() {
    try {
      if (!timelineReady) throw new Error("Assemble the timeline first.");
      if (Object.keys(voiceovers).length !== scenes.length) throw new Error("Generate every scene voiceover first.");
      if (Object.keys(captions).length !== scenes.length) throw new Error("Generate captions first.");
      if (Object.keys(selectedClips).length !== stockMatches.length) throw new Error("Choose footage for every matched scene first.");

      const renderScenes = scenes.map((scene: Scene) => {
        const match = stockMatches.find((item) => item.scene_number === scene.number);
        const selectedId = selectedClips[scene.number];
        const clip = match?.results?.find((item) => item.id === selectedId);
        const audio = voiceovers[scene.number];
        if (!clip?.video_url) throw new Error(\`Scene \${scene.number} has no selected video URL.\`);
        if (!audio?.audio_url) throw new Error(\`Scene \${scene.number} has no voiceover audio.\`);
        return {
          number: scene.number,
          title: scene.title,
          duration_seconds: scene.duration_seconds,
          video_url: clip.video_url,
          audio_url: audio.audio_url,
          captions: captions[scene.number] || [],
        };
      });

      const isPortrait = format === "YouTube Short" || format === "TikTok / Reel";
      const manifest = {
        version: 1,
        app: "AI Content Studio",
        format,
        width: isPortrait ? 1080 : 1920,
        height: isPortrait ? 1920 : 1080,
        created_at: new Date().toISOString(),
        scenes: renderScenes,
      };

      const blob = new Blob([JSON.stringify(manifest)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "ai-content-studio-render-manifest.json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setTimelineError(err instanceof Error ? err.message : "Could not export the render manifest.");
    }
  }

  // RENDER_EXPORT_V1
`;

text = text.replace(returnAnchor, functionBlock + returnAnchor);

const marker = '                      <div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: "#0b1b2c", border: "1px solid #29476a" }}>';
if (!text.includes(marker)) throw new Error("Timeline ready panel marker was not found.");

const replacement = `                      <div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: "#0b1b2c", border: "1px solid #29476a" }}>
                        <div style={{ fontWeight: 800 }}>TIMELINE READY</div>
                        <div style={{ color: "#8fa4bd", fontSize: 12, marginTop: 4 }}>All scenes are ordered with footage, voiceover and caption metadata. Export a render manifest to create the MP4 locally with FFmpeg.</div>
                        <button type="button" onClick={exportRenderManifest} style={{ ...primaryButton, marginTop: 12 }}>Export Render Manifest →</button>
                      </div>`;
text = text.replace(marker, replacement);

writeFileSync(path, text);
console.log("Render manifest export installed successfully.");
