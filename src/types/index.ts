export type VoiceType = 'male' | 'female';

export type ImageStyle = 'realistic' | 'cartoon';

// Simplified to only the two main options we need
export type AspectRatio = 'widescreen_16_9' | 'social_story_9_16';

export type FontType = 'poppins-regular' | 'poppins-medium' | 'poppins-semibold' | 'poppins-bold';

export type GenerationMode = 'full-video' | 'image-captions';

export interface GenerationConfig {
  script: string;
  voice: VoiceType;
  imageStyle: ImageStyle;
  aspectRatio: AspectRatio;
  mode: GenerationMode;
}

export interface Chunk {
  id: string;
  text: string;
  startIndex: number;
  endIndex: number;
  startTime?: number;
  endTime?: number;
}

export interface ChunkData {
  id: string;
  text: string;
  startTime?: number;
  endTime?: number;
}

export interface WordTimestamp {
  word: string;
  startTime: number;
  endTime: number;
}

export interface TTSResult {
  id: string;
  audioBlob: Blob;
  audioUrl: string;
  wordTimestamps: WordTimestamp[];
  duration: number;
  chunkText: string;
}

export interface GoogleTTSResponse {
  audioContent: string;
  timepoints?: WordTimestamp[];
}

export interface ImageGenerationResult {
  id: string;
  imageUrl: string;
  prompt: string;
  style: string;
  chunkText: string;
}

export interface ImageResult {
  imageUrl: string;
  prompt: string;
}

export interface CaptionOverlay {
  text: string;
  wordTimestamps?: WordTimestamp[];
}

export interface CaptionGroup {
  words: string[];
  startTime: number;
  endTime: number;
  text: string;
}

export interface CaptionFrame {
  text: string;
  startTime: number;
  endTime: number;
  duration: number;
}

export interface VideoChunk {
  chunk: Chunk;
  ttsResult?: TTSResult;
  imageResult?: ImageResult;
  captionOverlay?: CaptionOverlay;
}

export interface GenerationState {
  isGenerating: boolean;
  currentStep: string;
  progress: number;
  error?: string;
} 