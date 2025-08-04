import { Chunk, TTSResult, WordTimestamp, VoiceType } from '@/types';
import { googleTTSClient, apiRequest, APIError } from '@/utils/api';

interface TTSRequest {
  text: string;
  voice: VoiceType;
}

interface GoogleTTSResponse {
  audioContent: string;
}

export async function generateTTS(
  chunk: Chunk,
  voice: VoiceType,
  selectedVoiceName?: string
): Promise<TTSResult> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_TTS_API_KEY;
  
  if (!apiKey) {
    throw new APIError('Google TTS API key not configured', 401);
  }

  // Use selected voice or fallback to default
  const voiceConfig = selectedVoiceName 
    ? { name: selectedVoiceName, languageCode: 'en-US' }
    : { name: 'en-US-Standard-F', languageCode: 'en-US' }; // Default to Standard F

  console.log('🎤 TTS: Using voice config:', voiceConfig);
  console.log('📝 TTS: Text to synthesize:', chunk.text);

  const requestBody = {
    input: {
      text: chunk.text
    },
    voice: voiceConfig,
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: 1.0,
      pitch: 0.0
    }
  };

  console.log('📤 TTS: Request body:', JSON.stringify(requestBody, null, 2));

  try {
    const response = await apiRequest(
      () => googleTTSClient.post(`/text:synthesize?key=${apiKey}`, requestBody),
      'TTS generation failed'
    );

    const data = response.data as GoogleTTSResponse;
    
    // Convert base64 audio to blob
    const audioBlob = await base64ToBlob(data.audioContent, 'audio/mp3');
    
    // Calculate actual audio duration first
    const duration = await calculateAudioDuration(audioBlob);
    
    // Parse word timestamps with actual duration for better synchronization
    const wordTimestamps = parseWordTimestamps([], chunk.text, duration);

    return {
      id: `tts-${Date.now()}-${Math.random()}`,
      audioBlob,
      audioUrl: URL.createObjectURL(audioBlob),
      wordTimestamps,
      duration,
      chunkText: chunk.text
    };
  } catch (error: any) {
    console.error('TTS generation error:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      config: error.config
    });
    
    // Provide more specific error messages based on the error type
    if (error instanceof APIError) {
      throw error; // Re-throw APIError as-is
    } else if (error.response?.status === 400) {
      const errorDetails = error.response.data?.error?.message || error.response.data?.message || 'Invalid request';
      throw new APIError(`Invalid request to Google TTS API: ${errorDetails}`, 400);
    } else if (error.response?.status === 401) {
      throw new APIError('Unauthorized. Please check your Google TTS API key.', 401);
    } else if (error.response?.status === 403) {
      throw new APIError('Forbidden. Please enable the Text-to-Speech API in Google Cloud Console.', 403);
    } else if (error.response?.status === 429) {
      throw new APIError('Rate limit exceeded. Please try again later.', 429);
    } else {
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          error.message || 
                          'Unknown error';
      throw new APIError(`TTS generation failed: ${errorMessage}`, error.response?.status || 500);
    }
  }
}

function parseWordTimestamps(
  timepoints: Array<{ markName: string; timeSeconds: string }>,
  text: string,
  actualDuration?: number
): WordTimestamp[] {
  const words = text.split(/\s+/);
  const timestamps: WordTimestamp[] = [];
  
  // If no timepoints, create approximate timestamps
  if (timepoints.length === 0) {
    // More accurate timing based on actual speaking patterns
    const averageWordsPerSecond = 2.3; // More realistic rate
    const totalWords = words.length;
    const estimatedTotalDuration = totalWords / averageWordsPerSecond;
    
    let currentTime = 0;
    
    words.forEach((word, index) => {
      // More sophisticated word duration calculation
      const wordLength = word.length;
      const isShortWord = wordLength <= 3;
      const isLongWord = wordLength >= 8;
      
      let wordDuration;
      if (isShortWord) {
        wordDuration = 0.15; // Short words (the, and, of)
      } else if (isLongWord) {
        wordDuration = 0.35; // Long words (beautiful, wonderful)
      } else {
        wordDuration = 0.25; // Medium words
      }
      
      // Add natural pauses
      const pauseAfter = index < words.length - 1 ? 0.08 : 0;
      
      timestamps.push({
        word: word.trim(),
        startTime: currentTime,
        endTime: currentTime + wordDuration
      });
      
      currentTime += wordDuration + pauseAfter;
    });
    
    // If we have actual duration, scale the timestamps to match
    if (actualDuration && actualDuration > 0) {
      const calculatedDuration = timestamps.length > 0 ? timestamps[timestamps.length - 1].endTime : 0;
      if (calculatedDuration > 0) {
        const scaleFactor = actualDuration / calculatedDuration;
        timestamps.forEach(timestamp => {
          timestamp.startTime *= scaleFactor;
          timestamp.endTime *= scaleFactor;
        });
        console.log(`📝 Scaled timestamps by factor ${scaleFactor.toFixed(3)} to match actual duration ${actualDuration}s`);
      }
    }
    
    return timestamps;
  }

  // Parse actual timepoints if available
  let currentTime = 0;
  words.forEach((word, index) => {
    const timepoint = timepoints[index];
    if (timepoint) {
      const startTime = parseFloat(timepoint.timeSeconds);
      const endTime = index < timepoints.length - 1 
        ? parseFloat(timepoints[index + 1].timeSeconds)
        : startTime + 0.5; // Default duration for last word
      
      timestamps.push({
        word: word.trim(),
        startTime,
        endTime
      });
      currentTime = endTime;
    } else {
      // Fallback for words without timestamps
      timestamps.push({
        word: word.trim(),
        startTime: currentTime,
        endTime: currentTime + 0.3
      });
      currentTime += 0.3;
    }
  });

  return timestamps;
}

async function calculateAudioDuration(audioBlob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio();
    const url = URL.createObjectURL(audioBlob);
    
    audio.addEventListener('loadedmetadata', () => {
      const duration = audio.duration;
      URL.revokeObjectURL(url);
      console.log(`📝 Actual audio duration: ${duration}s`);
      resolve(duration);
    });
    
    audio.addEventListener('error', () => {
      console.warn('⚠️ Could not calculate audio duration, using fallback');
      URL.revokeObjectURL(url);
      resolve(0); // Will use calculated duration instead
    });
    
    audio.src = url;
  });
}

function calculateDuration(wordTimestamps: WordTimestamp[]): number {
  if (wordTimestamps.length === 0) return 0;
  
  const lastWord = wordTimestamps[wordTimestamps.length - 1];
  return lastWord.endTime;
}

async function base64ToBlob(base64: string, mimeType: string): Promise<Blob> {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

// Mock TTS for development/testing (when API key is not available)
export async function generateMockTTS(
  chunk: Chunk,
  voice: VoiceType
): Promise<TTSResult> {
  // Create a simple audio blob with silence
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  // Generate a simple tone
  oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
  
  const duration = chunk.text.length * 0.1; // 0.1 seconds per character
  
  // Create word timestamps
  const words = chunk.text.split(/\s+/);
  const wordTimestamps: WordTimestamp[] = [];
  let currentTime = 0;
  
  words.forEach((word) => {
    const wordDuration = word.length * 0.05;
    wordTimestamps.push({
      word: word.trim(),
      startTime: currentTime,
      endTime: currentTime + wordDuration
    });
    currentTime += wordDuration + 0.05;
  });
  
  // Create a simple audio blob (silence for now)
  const arrayBuffer = new ArrayBuffer(44 + duration * 44100 * 2); // WAV header + audio data
  const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
  
  return {
    id: `mock-tts-${Date.now()}-${Math.random()}`,
    audioBlob: blob,
    audioUrl: URL.createObjectURL(blob),
    wordTimestamps,
    duration,
    chunkText: chunk.text
  };
} 