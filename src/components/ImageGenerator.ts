import { AspectRatio } from '@/types';

export interface ImageGenerationResult {
  id: string;
  imageUrl: string;
  prompt: string;
  style: string;
  chunkText: string;
}

export interface ImageGenerationRequest {
  text: string;
  style: 'Realistic' | 'Cartoon';
  chunkIndex: number;
  aspectRatio: AspectRatio;
}

// Cache for generated images to avoid duplicate API calls
const imageCache = new Map<string, ImageGenerationResult>();

/**
 * Generate a cache key for an image request
 */
function generateCacheKey(request: ImageGenerationRequest): string {
  return `${request.text}-${request.style}-${request.aspectRatio}`;
}

/**
 * Generate an image from text using our server-side API route
 */
export async function generateImage(
  request: ImageGenerationRequest
): Promise<ImageGenerationResult> {
  try {
    // Check cache first
    const cacheKey = generateCacheKey(request);
    if (imageCache.has(cacheKey)) {
      console.log('🎨 ✅ Using cached image for:', request.chunkIndex + 1, 'Cache key:', cacheKey);
      const cachedResult = imageCache.get(cacheKey)!;
      return {
        ...cachedResult,
        id: `cached-${Date.now()}-${Math.random()}`, // Generate new ID for this usage
        chunkText: request.text // Update chunk text for this specific usage
      };
    }

    console.log('🎨 ❌ Cache miss - generating new image for:', request.chunkIndex + 1, 'Cache key:', cacheKey);
    console.log('📝 Text:', request.text);
    console.log('🎨 Style:', request.style);
    console.log('🎨 Aspect Ratio:', request.aspectRatio);

    // Call our server-side API route
    const response = await fetch('/api/generate-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: request.text,
        style: request.style,
        aspectRatio: request.aspectRatio
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Image generation failed: ${errorData.message || response.statusText}`);
    }

    const result = await response.json();
    console.log('🎨 Server response:', result);

    const imageResult = {
      id: result.id,
      imageUrl: result.imageUrl,
      prompt: result.prompt,
      style: result.style,
      chunkText: result.chunkText
    };

    // Cache the result
    imageCache.set(cacheKey, imageResult);
    console.log('🎨 Cached image result for future use');
    console.log('📊 ImageGenerator cache size now:', imageCache.size);

    return imageResult;
  } catch (error) {
    console.error('❌ Image generation failed:', error);
    throw new Error(`Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate images for multiple chunks
 */
export async function generateImagesForChunks(
  chunks: Array<{ id: string; text: string }>,
  style: 'Realistic' | 'Cartoon',
  aspectRatio: AspectRatio
): Promise<ImageGenerationResult[]> {
  console.log('🎨 Starting image generation for', chunks.length, 'chunks');
  console.log('🎨 Style:', style);
  console.log('🎨 Aspect Ratio:', aspectRatio);

  const results: ImageGenerationResult[] = [];

  for (let i = 0; i < chunks.length; i++) {
    try {
      console.log(`🎨 Generating image ${i + 1}/${chunks.length}`);
      
      const result = await generateImage({
        text: chunks[i].text,
        style: style,
        chunkIndex: i,
        aspectRatio: aspectRatio
      });

      results.push(result);
      console.log(`✅ Image ${i + 1} generated successfully`);
      
      // Add a small delay between requests to be respectful to the API
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`❌ Failed to generate image for chunk ${i + 1}:`, error);
      
      // Create a placeholder result for failed generations
      results.push({
        id: `img-${i}-error-${Date.now()}`,
        imageUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzc0MTUxIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iI2YzZjRmNiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIEdlbmVyYXRpb24gRmFpbGVkPC90ZXh0Pjwvc3ZnPg==',
        prompt: `Failed to generate image for: ${chunks[i].text}`,
        style: style,
        chunkText: chunks[i].text
      });
    }
  }

  console.log('🎨 Image generation completed:', results.length, 'results');
  return results;
}

/**
 * Clear the image cache
 */
export function clearImageCache(): void {
  imageCache.clear();
  console.log('🎨 Image cache cleared');
}

/**
 * Get cache statistics
 */
export function getImageCacheStats(): { size: number; keys: string[] } {
  return {
    size: imageCache.size,
    keys: Array.from(imageCache.keys())
  };
} 