# AI Video Generator

An AI-powered video generation system that creates videos from text using TTS (Text-to-Speech), image generation, and video composition with synchronized captions.

## Features

- **Text-to-Speech**: Converts text to audio using Google TTS
- **Image Generation**: Creates images from text using Freepik AI (Google Imagen 3)
- **Video Composition**: Combines images and audio into video segments
- **Portrait Video Support**: Generates proper 9:16 portrait videos
- **Synchronized Captions**: 3-word chunks timed with audio
- **Full Video Generation**: Concatenates segments into complete videos
- **Interactive Segment Browser**: Scrollable segment list with detailed views
- **Real-time Preview**: View generated segments with audio playback
- **Download Support**: Download individual segments or complete videos

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
- Image generation with Freepik AI (Google Imagen 3)
- Audio playback in segments
- Synchronized 3-word captions with timing
- Interactive segment browser with detailed views
- Full video concatenation from segments
- Download individual segments and complete videos
- Optimized FFmpeg processing with copy mode
- Dark theme UI with purple accents
- Responsive design for all screen sizes

✅ **Recent Improvements:**
- Switched to Google Imagen 3 for better image generation
- Optimized FFmpeg settings for faster processing
- Removed timeouts to prevent premature interruptions
- Added comprehensive error handling and fallbacks
- Improved UI with compact segment selection
- Added detailed video information display

## Technical Stack

- **Frontend**: Next.js 15 with TypeScript
- **Video Processing**: FFmpeg.wasm for client-side video generation
- **TTS**: Google Text-to-Speech API
- **Image Generation**: Freepik AI API (Google Imagen 3)
- **Styling**: Tailwind CSS
- **State Management**: React hooks

## Project Structure

```
src/
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   │   ├── fetch-image/   # Image proxy endpoint
│   │   ├── generate-image/ # Image generation (Google Imagen 3)
│   │   └── test-freepik/  # API testing
│   └── page.tsx           # Main application
├── components/            # React components
│   ├── VideoComposer.ts   # Video generation logic
│   ├── SegmentDisplay.tsx # Interactive segment browser
│   ├── VoiceSelector.tsx  # Voice selection component
│   ├── AspectRatioSelector.tsx # Aspect ratio selection
│   ├── FontSelector.tsx   # Font selection
│   └── ...               # Other components
├── types/                 # TypeScript type definitions
└── utils/                 # Utility functions
```

## Video Generation Process

1. **Text Chunking**: Splits input text into manageable chunks
2. **TTS Generation**: Converts each chunk to audio using Google TTS
3. **Image Generation**: Creates images for each chunk using Freepik AI
4. **Segment Creation**: Combines audio and images into video segments with captions
5. **Concatenation**: Stitches all segments into a complete video
6. **Download**: Provides download links for individual segments and complete video

## UI Features

- **Dark Theme**: Black to purple gradient background
- **Interactive Segments**: Click to view detailed segment information
- **Compact Selection**: Scrollable segment grid for easy browsing
- **Detailed Views**: Video player, text content, and metadata display
- **Download Options**: Individual segment and complete video downloads
- **Progress Tracking**: Real-time generation progress updates

## Learn More

To learn more about the technologies used:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [FFmpeg.wasm](https://ffmpegwasm.netlify.app/) - client-side video processing
- [Google TTS API](https://cloud.google.com/text-to-speech) - text-to-speech service
- [Freepik AI API](https://developers.freepik.com/) - image generation service

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
