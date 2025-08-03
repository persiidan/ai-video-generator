'use client';

import React, { useState } from 'react';
import { VideoSegment } from './VideoComposer';

interface SegmentDisplayProps {
  segments: VideoSegment[];
}

export default function SegmentDisplay({ segments }: SegmentDisplayProps) {
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const handleImageError = (imageUrl: string, index: number) => {
    console.error(`❌ Failed to load image ${index + 1}:`, imageUrl);
  };

  const handleImageLoad = (index: number) => {
    console.log(`✅ Image ${index + 1} loaded successfully`);
  };

  const handleDownload = (segment: VideoSegment, index: number) => {
    try {
      if (segment.videoBlob) {
        const link = document.createElement('a');
        link.href = segment.videoUrl!;
        link.download = `segment-${index + 1}-${segment.id}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log(`📥 Downloaded video segment ${index + 1}`);
      }
    } catch (error) {
      console.error('❌ Download failed:', error);
      alert('Failed to download video. Please try again.');
    }
  };

  if (segments.length === 0) {
    return (
      <div className="space-y-6">
        <h3 className="text-xl font-semibold text-white mb-4">Video Segments</h3>
        <div className="bg-gray-700 rounded-lg p-6 border border-gray-600 text-center">
          <p className="text-gray-300">No segments generated yet. Start generation to see segments here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-white mb-4">Video Segments ({segments.length})</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentSegmentIndex(Math.max(0, currentSegmentIndex - 1))}
            disabled={currentSegmentIndex === 0}
            className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          <span className="px-3 py-1 bg-gray-700 text-white rounded text-sm">
            {currentSegmentIndex + 1} / {segments.length}
          </span>
          <button
            onClick={() => setCurrentSegmentIndex(Math.min(segments.length - 1, currentSegmentIndex + 1))}
            disabled={currentSegmentIndex === segments.length - 1}
            className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      </div>

      {segments.map((segment, index) => {
        const isCurrentSegment = index === currentSegmentIndex;
        
        return (
          <div
            key={segment.id}
            className={`bg-gray-700 rounded-lg p-4 border border-gray-600 ${
              isCurrentSegment ? 'border-blue-500' : 'hidden'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-lg font-medium text-white">Segment {index + 1}</h4>
              <div className="flex gap-2">
                {segment.videoBlob && (
                  <button
                    onClick={() => handleDownload(segment, index)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    title="Download video"
                  >
                    📥 Download Video
                  </button>
                )}
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
                  src={`/api/proxy-image?url=${encodeURIComponent(segment.imageUrl)}&purpose=segment_display`}
                  alt={`Generated image for segment ${index + 1}`}
                  className="w-full h-auto max-h-96 object-contain"
                  onLoad={() => {
                    handleImageLoad(index);
                    setIsLoading(false);
                  }}
                  onError={() => {
                    handleImageError(segment.imageUrl, index);
                    setIsLoading(false);
                  }}
                  onLoadStart={() => setIsLoading(true)}
                />
              </div>
            </div>

            {/* Audio Player */}
            <div className="mb-4">
              <h5 className="text-md font-medium text-white mb-2">Audio Preview</h5>
              <audio
                controls
                className="w-full"
                src={URL.createObjectURL(segment.audioBlob)}
              >
                Your browser does not support the audio element.
              </audio>
            </div>

            {/* Video Player (if available) */}
            {segment.videoUrl && (
              <div className="mb-4">
                <h5 className="text-md font-medium text-white mb-2">Video Preview</h5>
                <video
                  controls
                  className="w-full rounded-lg"
                  src={segment.videoUrl}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            )}

            {/* Segment Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-300 text-sm mb-2">Text Content:</p>
                <p className="text-white bg-gray-800 p-3 rounded border border-gray-600">
                  {segment.text}
                </p>
              </div>
              
              <div>
                <p className="text-gray-300 text-sm mb-2">Segment Information:</p>
                <div className="bg-gray-800 p-3 rounded border border-gray-600 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Duration:</span>
                    <span className="text-white">{segment.duration.toFixed(2)}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Audio Size:</span>
                    <span className="text-white">{(segment.audioBlob.size / 1024).toFixed(1)} KB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Start Time:</span>
                    <span className="text-white">{segment.startTime.toFixed(2)}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">End Time:</span>
                    <span className="text-white">{segment.endTime.toFixed(2)}s</span>
                  </div>
                  {segment.videoBlob && (
                    <div className="flex justify-between">
                      <span className="text-gray-300">Video Size:</span>
                      <span className="text-white">{(segment.videoBlob.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Status Information */}
            <div className="mt-3">
              <div className="flex items-center gap-2">
                <span className="text-gray-300 text-sm">Status:</span>
                {segment.videoBlob ? (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    ✓ Video Generated
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    ⏳ Processing
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
} 