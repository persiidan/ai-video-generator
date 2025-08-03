import { createLogger, Logger } from './logger';

// Shared cache for fetched images to prevent URL corruption
const fetchedImageCache = new Map<string, Blob>();
const logger: Logger = createLogger('ImageCache');

/**
 * Fetch image with caching to prevent duplicate requests and URL corruption
 */
export async function fetchImageWithCache(imageUrl: string, purpose: string = 'unknown'): Promise<Blob> {
  logger.debug('Fetching image with cache', 'ImageCache', {
    imageUrl,
    purpose,
    cacheSize: fetchedImageCache.size
  });

  // Validate URL format
  if (!imageUrl || typeof imageUrl !== 'string') {
    logger.error('Invalid image URL', 'ImageCache', { imageUrl, purpose });
    throw new Error(`Invalid image URL for ${purpose}: ${imageUrl}`);
  }

  // Check cache first
  if (fetchedImageCache.has(imageUrl)) {
    logger.info('✅ Using cached image', 'ImageCache', { imageUrl, purpose });
    return fetchedImageCache.get(imageUrl)!;
  }

  logger.info('❌ Cache miss - fetching image', 'ImageCache', { imageUrl, purpose });
  
  try {
    logger.debug('Making API request to fetch image', 'ImageCache', { imageUrl, purpose });
    
    const imageResponse = await fetch('/api/fetch-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageUrl, purpose }),
    });

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text();
      logger.error('Image fetch API request failed', 'ImageCache', {
        status: imageResponse.status,
        statusText: imageResponse.statusText,
        errorText,
        imageUrl,
        purpose
      });
      throw new Error(`Failed to fetch image for ${purpose}: ${imageResponse.status} - ${errorText}`);
    }

    const imageResult = await imageResponse.json();
    
    if (!imageResult.success) {
      logger.error('Image fetch API returned error', 'ImageCache', {
        error: imageResult.error,
        imageUrl,
        purpose
      });
      throw new Error(`Image fetch failed for ${purpose}: ${imageResult.error}`);
    }

    // Validate the response data
    if (!imageResult.imageData || !imageResult.contentType) {
      logger.error('Invalid image response data', 'ImageCache', {
        hasImageData: !!imageResult.imageData,
        hasContentType: !!imageResult.contentType,
        imageUrl,
        purpose
      });
      throw new Error(`Invalid image response for ${purpose}: missing imageData or contentType`);
    }

    // Convert base64 back to blob
    logger.debug('Converting base64 to blob', 'ImageCache', {
      imageDataLength: imageResult.imageData.length,
      contentType: imageResult.contentType
    });
    
    const imageBytes = Uint8Array.from(atob(imageResult.imageData), c => c.charCodeAt(0));
    const imageBlob = new Blob([imageBytes], { type: imageResult.contentType });
    
    // Validate blob
    if (imageBlob.size === 0) {
      logger.error('Empty image blob received', 'ImageCache', {
        imageUrl,
        purpose,
        contentType: imageResult.contentType
      });
      throw new Error(`Empty image blob received for ${purpose}`);
    }
    
    // Cache the result
    fetchedImageCache.set(imageUrl, imageBlob);
    logger.info('✅ Image fetched and cached successfully', 'ImageCache', {
      contentType: imageResult.contentType,
      size: imageResult.size,
      cacheSize: fetchedImageCache.size,
      imageUrl,
      purpose
    });
    
    return imageBlob;
  } catch (error) {
    logger.error('❌ Error fetching image', 'ImageCache', {
      imageUrl,
      purpose,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error)
    }, error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Clear the fetched image cache
 */
export function clearImageCache(): void {
  fetchedImageCache.clear();
  console.log('🖼️ Fetched image cache cleared');
}

/**
 * Get cache statistics
 */
export function getImageCacheStats(): { size: number; keys: string[] } {
  return {
    size: fetchedImageCache.size,
    keys: Array.from(fetchedImageCache.keys())
  };
} 