'use client';

import { useState } from 'react';
import { ImageGenerationResult } from './ImageGenerator';

interface ImagePreviewProps {
  imageResults: ImageGenerationResult[];
  chunks: Array<{ id: string; text: string }>;
}

export default function ImagePreview({ imageResults, chunks }: ImagePreviewProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const handleImageError = (imageUrl: string, index: number) => {
    console.error(`❌ Failed to load image ${index + 1}:`, imageUrl);
  };

  const handleImageLoad = (index: number) => {
    console.log(`✅ Image ${index + 1} loaded successfully`);
  };

  const handleDownload = (imageResult: ImageGenerationResult, index: number) => {
    try {
      const link = document.createElement('a');
      link.href = imageResult.imageUrl;
      link.download = `image-chunk-${index + 1}-${imageResult.style.toLowerCase()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      console.log(`📥 Downloaded image ${index + 1}`);
    } catch (error) {
      console.error('❌ Download failed:', error);
      alert('Failed to download image. Please try again.');
    }
  };

  if (imageResults.length === 0) {
    return (
      <div className="space-y-6">
        <h3 className="text-xl font-semibold text-white mb-4">Image Preview</h3>
        <div className="bg-gray-700 rounded-lg p-6 border border-gray-600 text-center">
          <p className="text-gray-300">No images generated yet. Start generation to see images here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-white mb-4">Image Preview</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentImageIndex(Math.max(0, currentImageIndex - 1))}
            disabled={currentImageIndex === 0}
            className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          <span className="px-3 py-1 bg-gray-700 text-white rounded text-sm">
            {currentImageIndex + 1} / {imageResults.length}
          </span>
          <button
            onClick={() => setCurrentImageIndex(Math.min(imageResults.length - 1, currentImageIndex + 1))}
            disabled={currentImageIndex === imageResults.length - 1}
            className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      </div>

      {imageResults.map((imageResult, index) => {
        const chunk = chunks[index];
        const isCurrentImage = index === currentImageIndex;
        
        return (
          <div
            key={imageResult.id}
            className={`bg-gray-700 rounded-lg p-4 border border-gray-600 ${
              isCurrentImage ? 'border-blue-500' : 'hidden'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-lg font-medium text-white">Image {index + 1}</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDownload(imageResult, index)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  title="Download image"
                >
                  📥 Download
                </button>
              </div>
            </div>

            {/* Image Display */}
            <div className="mb-4">
              <div className="relative bg-gray-800 rounded-lg overflow-hidden">
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75">
                    <div className="text-white">Loading image...</div>
                  </div>
                )}
                <img
                  src={imageResult.imageUrl}
                  alt={`Generated image for chunk ${index + 1}`}
                  className="w-full h-auto max-h-96 object-contain"
                  onLoad={() => {
                    handleImageLoad(index);
                    setIsLoading(false);
                  }}
                  onError={() => {
                    handleImageError(imageResult.imageUrl, index);
                    setIsLoading(false);
                  }}
                  onLoadStart={() => setIsLoading(true)}
                />
              </div>
            </div>

            {/* Image Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-300 text-sm mb-2">Original Text:</p>
                <p className="text-white bg-gray-800 p-3 rounded border border-gray-600">
                  {chunk.text}
                </p>
              </div>
              
              <div>
                <p className="text-gray-300 text-sm mb-2">Generated Prompt:</p>
                <p className="text-white bg-gray-800 p-3 rounded border border-gray-600">
                  {imageResult.prompt}
                </p>
              </div>
            </div>

            {/* Style Information */}
            <div className="mt-3">
              <p className="text-gray-300 text-sm mb-2">Style: <span className="text-white font-medium">{imageResult.style}</span></p>
            </div>
          </div>
        );
      })}
    </div>
  );
} 