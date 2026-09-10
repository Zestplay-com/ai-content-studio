#!/usr/bin/env node

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const manifestPath = process.argv[2];
const outputPath = process.argv[3] || "output.mp4";

if (!manifestPath) {
  console.error("Usage: node scripts/render-video.mjs <render-manifest.json> [output.mp4]");
  process.exit(1);
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

function toTimestamp(seconds) {
  const totalMs = Math.max(0, Math.round(seconds * 1000));
  const ms = totalMs % 1000;
  const total = Math.floor(totalMs / 1000);
  const s = total % 60;
  const m = Math.floor(total / 60) % 60;
  const h = Math.floor(total / 3600);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

function dataUrlToBuffer(dataUrl) {
  const match = /^data:[^;]+;base64,(.+)$/s.exec(dataUrl || "");
  if (!match) throw new Error("Voiceover audio is not a valid base64 data URL.");
  return Buffer.from(match[1], "base64");
}

async function download(url, destination) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not download footage (${response.status}): ${url}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(destination, buffer);
}

async function main() {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const scenes = Array.isArray(manifest.scenes) ? manifest.scenes : [];
  if (!scenes.length) throw new Error("Manifest contains no scenes.");

  const width = manifest.width || (manifest.format === "YouTube" ? 1920 : 1080);
  const height = manifest.height || (manifest.format === "YouTube" ? 1080 : 1920);
  const work = await mkdtemp(join(tmpdir(), "ai-content-studio-"));
  const concatList = join(work, "concat.txt");
  const srtPath = join(work, "captions.srt");
  const sceneFiles = [];
  const subtitleLines = [];
  let timelineOffset = 0;

  try {
    for (let index = 0; index < scenes.length; index += 1) {
      const scene = scenes[index];
      const duration = Math.max(Number(scene.duration_seconds) || 5, 1);
      const rawVideo = join(work, `scene-${index + 1}-raw.mp4`);
      const normalizedVideo = join(work, `scene-${index + 1}-video.mp4`);
      const audioPath = join(work, `scene-${index + 1}.mp3`);
      const scenePath = join(work, `scene-${index + 1}.mp4`);

      if (!scene.video_url) throw new Error(`Scene ${scene.number} has no selected footage URL.`);
      if (!scene.audio_url) throw new Error(`Scene ${scene.number} has no generated voiceover.`);

      console.log(`\nRendering scene ${scene.number}/${scenes.length}: ${scene.title}`);
      await download(scene.video_url, rawVideo);
      await writeFile(audioPath, dataUrlToBuffer(scene.audio_url));

      await run("ffmpeg", [
        "-y", "-i", rawVideo,
        "-t", String(duration),
        "-vf", `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1,fps=30`,
        "-an", "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p",
        normalizedVideo,
      ]);

      await run("ffmpeg", [
        "-y", "-i", normalizedVideo, "-i", audioPath,
        "-t", String(duration), "-map", "0:v:0", "-map", "1:a:0",
        "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", scenePath,
      ]);

      sceneFiles.push(scenePath);

      for (const caption of Array.isArray(scene.captions) ? scene.captions : []) {
        const start = timelineOffset + Number(caption.start || 0);
        const end = Math.min(timelineOffset + duration, timelineOffset + Number(caption.end || duration));
        if (end <= start) continue;
        subtitleLines.push(`${subtitleLines.length + 1}\n${toTimestamp(start)} --> ${toTimestamp(end)}\n${caption.text}\n`);
      }

      timelineOffset += duration;
    }

    await writeFile(concatList, sceneFiles.map((file) => `file '${file.replaceAll("'", "'\\''")}'`).join("\n") + "\n");
    await writeFile(srtPath, subtitleLines.join("\n"));

    const noCaptionOutput = join(work, "joined.mp4");
    await run("ffmpeg", [
      "-y", "-f", "concat", "-safe", "0", "-i", concatList,
      "-c", "copy", noCaptionOutput,
    ]);

    const subtitleFilter = `subtitles=${srtPath}:force_style='FontName=Arial,FontSize=18,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=3,Shadow=0,Alignment=2,MarginV=55'`;
    await run("ffmpeg", [
      "-y", "-i", noCaptionOutput,
      "-vf", subtitleFilter,
      "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-c:a", "aac", "-b:a", "192k",
      outputPath,
    ]);

    console.log(`\nDONE: ${outputPath}`);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`\nRender failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
