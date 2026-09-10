import { readFileSync, writeFileSync } from "node:fs";

const path = "app/page.tsx";
let text = readFileSync(path, "utf8");

if (text.includes("RENDER_EXPORT_V2")) {
  console.log("Render export already installed.");
  process.exit(0);
}

// Keep the function in the component's JavaScript scope, immediately before
// the JSX return. Do not depend on another installer's generated markup.
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

  // RENDER_EXPORT_V2
`;

text = text.replace(returnAnchor, functionBlock + returnAnchor);

// Use the page's structural closing tag instead of fragile generated JSX.
// This installer is therefore independent of the timeline installer's exact UI.
const mainEnd = "    </main>";
if (!text.includes(mainEnd)) throw new Error("Main page container marker was not found.");

const ui = `
              {timelineReady && (
                <div style={{ marginTop: 12 }}>
                  <button type="button" onClick={exportRenderManifest} style={primaryButton}>Export Render Manifest →</button>
                </div>
              )}
`;
text = text.replace(mainEnd, ui + mainEnd);

writeFileSync(path, text);
console.log("Render manifest export installed successfully.");
