import { NextRequest, NextResponse } from 'next/server';
import { fetchAvailableVoices, filterVoices } from '@/utils/api';

export async function GET(request: NextRequest) {
  try {
    // Fetch all available voices
    const allVoices = await fetchAvailableVoices();
    
    // Filter for English voices (Standard and Chirp3-HD)
    const englishVoices = filterVoices(allVoices, 'en-US', ['Standard', 'Chirp3-HD']);
    
    // Group voices by type and gender
    const groupedVoices = {
      Standard: {
        male: englishVoices.filter(v => v.name.includes('Standard') && v.ssmlGender === 'MALE'),
        female: englishVoices.filter(v => v.name.includes('Standard') && v.ssmlGender === 'FEMALE')
      },
      Chirp3_HD: {
        male: englishVoices.filter(v => v.name.includes('Chirp3-HD') && v.ssmlGender === 'MALE'),
        female: englishVoices.filter(v => v.name.includes('Chirp3-HD') && v.ssmlGender === 'FEMALE')
      }
    };

    return NextResponse.json({
      success: true,
      totalVoices: allVoices.length,
      englishVoices: englishVoices.length,
      groupedVoices,
      allVoices: englishVoices
    });
    
  } catch (error: any) {
    console.error('Error in test-google-tts route:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch voices',
      details: error.response?.data || error.status || 'Unknown error'
    }, { status: error.status || 500 });
  }
} 