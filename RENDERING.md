# Local MP4 Rendering

AI Content Studio now prepares a render manifest in the browser and includes a local FFmpeg renderer prototype.

## Requirements

- Node.js 20+
- FFmpeg available on PATH
- A completed project with selected footage, generated voiceovers, captions, and an assembled timeline

FFmpeg is used because it can combine video/audio streams, scale/crop footage, encode MP4, and burn subtitle files.

## Workflow

1. Run the app locally.
2. Create a project.
3. Generate the script.
4. Generate scenes.
5. Match stock footage.
6. Select footage for every scene.
7. Generate all voiceovers.
8. Generate captions.
9. Assemble the timeline.
10. Click **Export Render Manifest**.
11. Save the downloaded `ai-content-studio-render-manifest.json` in the project folder.
12. Run:

```bash
node scripts/render-video.mjs ai-content-studio-render-manifest.json output.mp4
```

The renderer downloads the selected Pexels clips, decodes the generated voiceovers, normalizes each scene to the requested aspect ratio, joins the scenes, burns the caption timing into the video, and writes an MP4.

## Production direction

This is intentionally a local prototype. Final rendering should move to a dedicated worker/container rather than a Vercel serverless function. The web app can remain on Vercel while a render worker handles FFmpeg jobs and uploads finished MP4 files to object storage.
