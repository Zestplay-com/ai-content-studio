# AI Content Studio

AI-powered video creation platform.

## MVP workflow

1. Generate a script from an idea.
2. Generate the voiceover.
3. Break the script into scenes.
4. Match stock footage intelligently to each scene.
5. Generate timed captions.
6. Render and export an MP4.

## Architecture direction

The web application is built with Next.js and is designed so heavy video rendering can later run in a dedicated worker/VPS without rebuilding the product.

## Current status

Foundation initialized. Next steps are Vercel deployment, dashboard/project creation, authentication, AI generation, media providers, and the rendering pipeline.
