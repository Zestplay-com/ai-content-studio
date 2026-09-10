import { readFileSync, writeFileSync } from "node:fs";

const path = "app/page.tsx";
let text = readFileSync(path, "utf8");

if (text.includes("PRODUCTION_FLOW_V1")) {
  console.log("Production flow already installed.");
  process.exit(0);
}

const returnAnchor = "  return (";
if (!text.includes(returnAnchor)) throw new Error("Component return anchor was not found.");

const stateAnchor = '  const [stockError, setStockError] = useState("");\n';
if (!text.includes(stateAnchor)) throw new Error("Stock state anchor was not found.");
text = text.replace(stateAnchor, stateAnchor + '  const [renderingVideo, setRenderingVideo] = useState(false);\n  const [renderError, setRenderError] = useState("");\n  const [renderedVideoUrl, setRenderedVideoUrl] = useState("");\n  const [renderedVideoType, setRenderedVideoType] = useState("");\n');

const functionBlock = `  async function renderVideoInBrowser() {
    if (renderingVideo) return;
    setRenderError("");
    setRenderingVideo(true);
    setRenderedVideoUrl("");
    try {
      if (!timelineReady) throw new Error("Assemble the timeline first.");
      if (Object.keys(voiceovers).length !== scenes.length) throw new Error("Generate every scene voiceover first.");
      if (Object.keys(captions).length !== scenes.length) throw new Error("Generate captions first.");
      if (Object.keys(selectedClips).length !== stockMatches.length) throw new Error("Choose footage for every scene first.");
      if (typeof MediaRecorder === "undefined") throw new Error("This browser cannot render video in the studio.");

      const portrait = format === "YouTube Short" || format === "TikTok / Reel";
      const width = portrait ? 1080 : 1920;
      const height = portrait ? 1920 : 1080;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not create the video canvas.");

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) throw new Error("This browser does not support the audio renderer.");
      const audioContext = new AudioContextClass();
      await audioContext.resume();
      const audioDestination = audioContext.createMediaStreamDestination();
      const canvasStream = canvas.captureStream(30);
      const combinedStream = new MediaStream([...canvasStream.getVideoTracks(), ...audioDestination.stream.getAudioTracks()]);

      const preferredTypes = [
        "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
        "video/mp4",
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
      ];
      const mimeType = preferredTypes.find((type) => MediaRecorder.isTypeSupported(type)) || "";
      if (!mimeType) throw new Error("This browser cannot encode a supported video format.");

      const chunks: BlobPart[] = [];
      const recorder = new MediaRecorder(combinedStream, { mimeType, videoBitsPerSecond: 5000000, audioBitsPerSecond: 128000 });
      const stopped = new Promise<Blob>((resolve, reject) => {
        recorder.ondataavailable = (event) => { if (event.data.size > 0) chunks.push(event.data); };
        recorder.onerror = () => reject(new Error("The browser video recorder failed."));
        recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || mimeType }));
      });
      recorder.start(1000);

      const fitVideo = (video: HTMLVideoElement) => {
        const sourceRatio = video.videoWidth / Math.max(1, video.videoHeight);
        const targetRatio = width / height;
        let drawWidth = width;
        let drawHeight = height;
        if (sourceRatio > targetRatio) drawWidth = height * sourceRatio;
        else drawHeight = width / sourceRatio;
        const x = (width - drawWidth) / 2;
        const y = (height - drawHeight) / 2;
        ctx.drawImage(video, x, y, drawWidth, drawHeight);
      };

      const waitForVideo = (video: HTMLVideoElement) => new Promise<void>((resolve, reject) => {
        const onReady = () => { cleanup(); resolve(); };
        const onError = () => { cleanup(); reject(new Error("A selected stock clip could not be loaded for rendering.")); };
        const cleanup = () => { video.removeEventListener("loadeddata", onReady); video.removeEventListener("error", onError); };
        video.addEventListener("loadeddata", onReady, { once: true });
        video.addEventListener("error", onError, { once: true });
        if (video.readyState >= 2) onReady();
      });

      for (const scene of scenes) {
        const match = stockMatches.find((item) => item.scene_number === scene.number);
        const clip = match?.results?.find((item: any) => item.id === selectedClips[scene.number]);
        const audioData = voiceovers[scene.number]?.audio_url;
        if (!clip?.video_url || !audioData) throw new Error(`Scene ${scene.number} is missing footage or voiceover audio.`);

        const video = document.createElement("video");
        video.crossOrigin = "anonymous";
        video.playsInline = true;
        video.muted = true;
        video.loop = true;
        video.src = clip.video_url;
        await waitForVideo(video);
        await video.play();

        const audio = document.createElement("audio");
        audio.src = audioData;
        audio.preload = "auto";
        const source = audioContext.createMediaElementSource(audio);
        source.connect(audioDestination);
        await audio.play();

        const durationMs = Math.max(1000, Number(scene.duration_seconds || 1) * 1000);
        const startedAt = performance.now();
        await new Promise<void>((resolve) => {
          const draw = () => {
            const elapsed = performance.now() - startedAt;
            const elapsedSeconds = elapsed / 1000;
            ctx.fillStyle = "#050a10";
            ctx.fillRect(0, 0, width, height);
            fitVideo(video);

            const activeCaptions = (captions[scene.number] || []).filter((caption) => elapsedSeconds >= caption.start && elapsedSeconds <= caption.end);
            if (activeCaptions.length > 0) {
              const captionText = activeCaptions.map((caption) => caption.text).join(" ");
              const fontSize = portrait ? 54 : 48;
              ctx.font = `800 ${fontSize}px Arial, sans-serif`;
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              const maxWidth = width * 0.82;
              const words = captionText.split(/\\s+/);
              const lines: string[] = [];
              let line = "";
              for (const word of words) {
                const test = line ? `${line} ${word}` : word;
                if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; } else line = test;
              }
              if (line) lines.push(line);
              const lineHeight = fontSize * 1.18;
              const boxHeight = lines.length * lineHeight + 38;
              const boxY = height - boxHeight - (portrait ? 150 : 90);
              ctx.fillStyle = "rgba(0,0,0,.72)";
              ctx.fillRect(width * 0.08, boxY, width * 0.84, boxHeight);
              ctx.fillStyle = "#ffffff";
              lines.forEach((lineText, index) => ctx.fillText(lineText, width / 2, boxY + 19 + lineHeight * (index + 0.5)));
            }

            if (elapsed < durationMs) requestAnimationFrame(draw);
            else resolve();
          };
          requestAnimationFrame(draw);
        });

        video.pause();
        audio.pause();
        source.disconnect();
        video.removeAttribute("src");
        audio.removeAttribute("src");
        video.load();
        audio.load();
      }

      recorder.stop();
      const blob = await stopped;
      const url = URL.createObjectURL(blob);
      const extension = mimeType.includes("mp4") ? "mp4" : "webm";
      setRenderedVideoType(extension.toUpperCase());
      setRenderedVideoUrl(url);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ai-content-studio-video.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      await audioContext.close();
    } catch (err) {
      setRenderError(err instanceof Error ? err.message : "Could not render the video.");
    } finally {
      setRenderingVideo(false);
    }
  }

  // PRODUCTION_FLOW_V1
`;
text = text.replace(returnAnchor, functionBlock + returnAnchor);

const voiceReady = '<div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: "#0b1b2c", border: "1px solid #29476a" }}><div style={{ fontWeight: 800 }}>VOICEOVER READY</div><div style={{ color: "#8fa4bd", fontSize: 12, marginTop: 4 }}>All {scenes.length} scene voiceovers are ready. Next production stage: captions and timeline assembly.</div></div>';
if (!text.includes(voiceReady)) throw new Error("Voiceover ready block was not found.");
text = text.replace(voiceReady, voiceReady + '<div style={{ marginTop: 12 }}><button type="button" onClick={async () => { await generateCaptions(); goToWorkflowStep("captions", "captions-section"); }} style={primaryButton}>Continue to Captions →</button></div>');

const captionsReady = '<div style={{ marginTop: 4, padding: 14, borderRadius: 12, background: "#0b1b2c", border: "1px solid #29476a" }}><div style={{ fontWeight: 800 }}>CAPTIONS READY</div><div style={{ color: "#8fa4bd", fontSize: 12, marginTop: 4 }}>Caption beats are prepared for the timeline. Next production stage: timeline assembly and final video rendering.</div></div>';
if (!text.includes(captionsReady)) throw new Error("Captions ready block was not found.");
text = text.replace(captionsReady, captionsReady + '<div style={{ marginTop: 12 }}><button type="button" onClick={() => { buildTimeline(); goToWorkflowStep("timeline", "timeline-section"); }} style={primaryButton}>Continue to Timeline →</button></div>');

const timelineReady = '<div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: "#0b1b2c", border: "1px solid #29476a" }}><div style={{ fontWeight: 800 }}>TIMELINE READY</div><div style={{ color: "#8fa4bd", fontSize: 12, marginTop: 4 }}>All scenes are ordered with footage, voiceover and caption metadata. Export a render manifest to create the MP4 locally with FFmpeg.</div></div>';
if (!text.includes(timelineReady)) throw new Error("Timeline ready block was not found.");
text = text.replace(timelineReady, timelineReady + '<div style={{ marginTop: 12 }}><button type="button" onClick={renderVideoInBrowser} disabled={renderingVideo} style={{ ...primaryButton, opacity: renderingVideo ? 0.55 : 1 }}>{renderingVideo ? "Rendering Video… Keep This Tab Open" : "Render & Download Video →"}</button></div>{renderError && <div style={{ ...errorBox, marginTop: 12 }}>{renderError}</div>}{renderedVideoUrl && <div style={{ marginTop: 12 }}><video controls playsInline src={renderedVideoUrl} style={{ width: "100%", borderRadius: 12, background: "#000" }} /><div style={{ color: "#8fa4bd", fontSize: 12, marginTop: 7 }}>Your video is ready as {renderedVideoType}. A download should have started automatically.</div></div>');

writeFileSync(path, text);
console.log("End-to-end production flow installed successfully.");
