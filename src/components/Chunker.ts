import { Chunk } from '@/types';

export function splitIntoChunks(text: string, maxChunkLength: number = 200): Chunk[] {
  if (!text.trim()) return [];

  // Clean and normalize the text
  const cleanText = text.trim().replace(/\s+/g, ' ');
  
  // Split into sentences first
  const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  const chunks: Chunk[] = [];
  let currentChunk = '';
  let startIndex = 0;
  let chunkId = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].trim();
    const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + sentence;

    // If adding this sentence would exceed the limit, finalize current chunk
    if (potentialChunk.length > maxChunkLength && currentChunk.length > 0) {
      chunks.push({
        id: `chunk-${chunkId++}`,
        text: currentChunk.trim(),
        startIndex,
        endIndex: startIndex + currentChunk.length
      });
      
      startIndex += currentChunk.length + 1; // +1 for the space
      currentChunk = sentence;
    } else {
      currentChunk = potentialChunk;
    }
  }

  // Add the final chunk if there's remaining text
  if (currentChunk.trim().length > 0) {
    chunks.push({
      id: `chunk-${chunkId++}`,
      text: currentChunk.trim(),
      startIndex,
      endIndex: startIndex + currentChunk.length
    });
  }

  // If we have no chunks (text was too short), create a single chunk
  if (chunks.length === 0 && cleanText.length > 0) {
    chunks.push({
      id: 'chunk-0',
      text: cleanText,
      startIndex: 0,
      endIndex: cleanText.length
    });
  }

  return chunks;
}

export function validateScript(text: string): { isValid: boolean; error?: string } {
  if (!text.trim()) {
    return { isValid: false, error: 'Script cannot be empty' };
  }

  if (text.length > 1200) {
    return { isValid: false, error: 'Script must be 1200 characters or less' };
  }

  return { isValid: true };
} 