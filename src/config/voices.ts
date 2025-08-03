// Voice configuration for Google TTS API
// This file is now mainly for utility functions since voices are fetched dynamically

export interface VoiceConfig {
  name: string;
  displayName: string;
  gender: 'male' | 'female';
  type: 'Standard' | 'Chirp3-HD';
  languageCode: string;
}

// Note: Voices are now fetched dynamically from Google TTS API
// This array is kept for fallback purposes only
export const FALLBACK_VOICES: VoiceConfig[] = [
  // Standard Male Voices
  {
    name: 'en-US-Standard-B',
    displayName: 'Standard B (US English)',
    gender: 'male',
    type: 'Standard',
    languageCode: 'en-US'
  },
  {
    name: 'en-US-Standard-D',
    displayName: 'Standard D (US English)',
    gender: 'male',
    type: 'Standard',
    languageCode: 'en-US'
  },
  
  // Standard Female Voices
  {
    name: 'en-US-Standard-F',
    displayName: 'Standard F (US English)',
    gender: 'female',
    type: 'Standard',
    languageCode: 'en-US'
  },
  {
    name: 'en-US-Standard-H',
    displayName: 'Standard H (US English)',
    gender: 'female',
    type: 'Standard',
    languageCode: 'en-US'
  }
];

export function getVoicesByGender(gender: 'male' | 'female'): VoiceConfig[] {
  return FALLBACK_VOICES.filter(voice => voice.gender === gender);
}

export function getVoicesByType(type: 'Standard' | 'Chirp3-HD'): VoiceConfig[] {
  return FALLBACK_VOICES.filter(voice => voice.type === type);
}

export function isVoiceAllowed(voiceName: string): boolean {
  // Allow any voice that matches our naming patterns
  const isStandard = voiceName.includes('Standard');
  const isChirp3HD = voiceName.includes('Chirp3-HD');
  const isEnglish = voiceName.startsWith('en-US');
  
  return (isStandard || isChirp3HD) && isEnglish;
}

// Helper function to format voice names for display
export function formatVoiceName(voiceName: string, gender?: string): string {
  const parts = voiceName.split('-');
  if (parts.length >= 3) {
    const type = parts[1]; // Standard or Chirp3-HD
    const variant = parts[2]; // B, D, F, H, etc.
    const language = parts[0] === 'en-US' ? 'US English' : parts[0];
    const genderText = gender || 'Unknown';
    
    return `${type} ${variant} (${language}) - ${genderText}`;
  }
  return voiceName;
} 