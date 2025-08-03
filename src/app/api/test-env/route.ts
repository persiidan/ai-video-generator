import { NextResponse } from 'next/server';

export async function GET() {
  const googleTTSKey = process.env.NEXT_PUBLIC_GOOGLE_TTS_API_KEY;
  const freepikKey = process.env.NEXT_PUBLIC_FREEPIK_API_KEY;
  
  return NextResponse.json({
    googleTTSKey: googleTTSKey ? 'Configured' : 'Not configured',
    freepikKey: freepikKey ? 'Configured' : 'Not configured',
    hasGoogleKey: !!googleTTSKey,
    hasFreepikKey: !!freepikKey
  });
} 