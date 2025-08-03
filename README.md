# AI Video Generator

An AI-powered video generation system that creates videos from text using TTS (Text-to-Speech), image generation, and video composition with synchronized captions.

## Features

- **Text-to-Speech**: Converts text to audio using Google TTS
- **Image Generation**: Creates images from text using Freepik AI
- **Video Composition**: Combines images and audio into video segments
- **Portrait Video Support**: Generates proper 9:16 portrait videos
- **Synchronized Captions**: 3-word chunks timed with audio
- **Real-time Preview**: View generated segments with audio playback

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Current Status

✅ **Working Features:**
- Portrait video generation (1080x1920)
- Image display with CORS proxy
- Audio playback in segments
- Synchronized 3-word captions
- Inline segment display with navigation

🔄 **In Development:**
- Segment concatenation (stitching segments together)

## Technical Stack

- **Frontend**: Next.js 15 with TypeScript
- **Video Processing**: FFmpeg.wasm for client-side video generation
- **TTS**: Google Text-to-Speech API
- **Image Generation**: Freepik AI API
- **Styling**: Tailwind CSS

## Project Structure

```
src/
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   │   ├── fetch-image/   # Image proxy endpoint
│   │   ├── generate-image/ # Image generation
│   │   └── test-google-tts/ # TTS testing
│   └── page.tsx           # Main application
├── components/            # React components
│   ├── VideoComposer.ts   # Video generation logic
│   ├── SegmentDisplay.tsx # Segment display component
│   └── ...
├── types/                 # TypeScript type definitions
└── utils/                 # Utility functions
```

## Learn More

To learn more about the technologies used:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [FFmpeg.wasm](https://ffmpegwasm.netlify.app/) - client-side video processing
- [Google TTS API](https://cloud.google.com/text-to-speech) - text-to-speech service

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
