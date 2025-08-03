import axios from 'axios';

// API configuration
const API_CONFIG = {
  GOOGLE_TTS: {
    baseURL: 'https://texttospeech.googleapis.com/v1',
    // API key will be set via environment variable
  },
  FREEPIK: {
    baseURL: 'https://api.freepik.com/v1',
    // API key will be set via environment variable
  }
};

// Create axios instances
export const googleTTSClient = axios.create({
  baseURL: API_CONFIG.GOOGLE_TTS.baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const freepikClient = axios.create({
  baseURL: API_CONFIG.FREEPIK.baseURL,
  headers: {
    'Content-Type': 'application/json',
    'x-freepik-api-key': process.env.NEXT_PUBLIC_FREEPIK_API_KEY || '',
  },
});

// Helper function to get API keys from environment
export function getAPIKeys() {
  return {
    googleTTS: process.env.NEXT_PUBLIC_GOOGLE_TTS_API_KEY,
    freepik: process.env.NEXT_PUBLIC_FREEPIK_API_KEY,
  };
}

// Error handling utility
export class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// Generic API request wrapper
export async function apiRequest<T>(
  requestFn: () => Promise<T>,
  errorMessage: string = 'API request failed'
): Promise<T> {
  try {
    return await requestFn();
  } catch (error: any) {
    console.error('🔍 API Request Error Details:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers
      }
    });

    if (error.response) {
      // Google TTS API error structure
      const errorData = error.response.data;
      let errorMsg = errorMessage;
      
      if (errorData?.error?.message) {
        errorMsg += `: ${errorData.error.message}`;
      } else if (errorData?.message) {
        errorMsg += `: ${errorData.message}`;
      } else if (errorData?.error) {
        errorMsg += `: ${JSON.stringify(errorData.error)}`;
      } else if (error.response.statusText) {
        errorMsg += `: ${error.response.statusText}`;
      } else {
        errorMsg += `: HTTP ${error.response.status}`;
      }
      
      throw new APIError(errorMsg, error.response.status, error.response.data);
    } else if (error.request) {
      throw new APIError(`${errorMessage}: Network error - No response received`, undefined, error.request);
    } else {
      throw new APIError(`${errorMessage}: ${error.message || 'Unknown error'}`, undefined, error);
    }
  }
}

// Fetch available voices from Google Cloud TTS API
export interface GoogleVoice {
  name: string;
  languageCodes: string[];
  ssmlGender: 'MALE' | 'FEMALE' | 'NEUTRAL';
  naturalSampleRateHertz: number;
}

export async function fetchAvailableVoices(): Promise<GoogleVoice[]> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_TTS_API_KEY;
  
  if (!apiKey) {
    throw new APIError('Google TTS API key not configured', 401);
  }

  try {
    const response = await apiRequest(
      () => googleTTSClient.get(`/voices?key=${apiKey}`),
      'Failed to fetch voices'
    );

    return response.data.voices || [];
  } catch (error: any) {
    console.error('Error fetching voices:', error);
    throw error;
  }
}

// Filter voices by language and type
export function filterVoices(voices: GoogleVoice[], languageCode: string = 'en-US', includeTypes: string[] = ['Standard', 'Chirp3-HD']): GoogleVoice[] {
  return voices.filter(voice => {
    // Check if voice supports the specified language
    const supportsLanguage = voice.languageCodes.includes(languageCode);
    
    // Check if voice type is in the allowed types
    const isAllowedType = includeTypes.some(type => {
      if (type === 'Standard') {
        return voice.name.includes('Standard');
      } else if (type === 'Chirp3-HD') {
        return voice.name.includes('Chirp3-HD');
      }
      return false;
    });
    
    return supportsLanguage && isAllowedType;
  });
} 

/**
 * Convert base64 string to Blob
 */
export function base64ToBlob(base64: string, contentType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: contentType });
} 