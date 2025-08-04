'use client';

import React, { useState, useEffect, useRef } from 'react';
import { VideoSegment, VideoComposerResult } from '@/components/VideoComposer';
import { fetchImageWithCache } from '@/utils/imageCache';

interface VideoPreviewProps {
  segments: VideoSegment[];
  onDownload?: () => void;
}

interface ImagePreviewData {
  [key: string]: string; // segmentId -> blobUrl
}

export default function VideoPreview({ segments, onDownload }: VideoPreviewProps) {
  const [selectedSegment, setSelectedSegment] = useState<VideoSegment | null>(null);
  const [imagePreviews, setImagePreviews] = useState<ImagePreviewData>({});
  const [processedSegments] = useState(useRef<Set<string>>(new Set()));

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleImageLoad = (segmentId: string, event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    const { naturalWidth, naturalHeight } = img;
    
    // Set aspect ratio based on natural dimensions
    const aspectRatio = naturalWidth / naturalHeight;
    const isPortrait = aspectRatio < 1;
    
    // Apply appropriate CSS class
    img.parentElement?.classList.toggle('portrait', isPortrait);
    img.parentElement?.classList.toggle('landscape', !isPortrait);
  };

  const fetchImagePreview = async (segment: VideoSegment) => {
    if (processedSegments.current.has(segment.id)) {
      return;
    }

    try {
      console.log(`🖼️ Fetching image preview for segment: ${segment.id}`);
      const imageBlob = await fetchImageWithCache(segment.imageUrl, 'preview display');
      const blobUrl = URL.createObjectURL(imageBlob);
      
      setImagePreviews(prev => ({
        ...prev,
        [segment.id]: blobUrl
      }));
      
      processedSegments.current.add(segment.id);
      console.log(`✅ Image preview fetched for segment: ${segment.id}`);
    } catch (error) {
      console.error(`❌ Failed to fetch image preview for segment ${segment.id}:`, error);
    }
  };

  // Fetch image previews for all segments
  useEffect(() => {
    segments.forEach(segment => {
      fetchImagePreview(segment);
    });
  }, [segments]);

  // Reset processed segments when segments change
  useEffect(() => {
    processedSegments.current.clear();
    setImagePreviews({});
  }, [segments]);

  const downloadVideo = (segment: VideoSegment) => {
    if (!segment.videoBlob) {
      console.error('No video blob available for download');
      return;
    }

    const url = URL.createObjectURL(segment.videoBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `video-segment-${segment.id}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getVideoFormat = (segment: VideoSegment) => {
    // Determine format based on image URL or default to landscape
    const isPortrait = segment.imageUrl.includes('social_story_9_16');
    const dimensions = isPortrait ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 };
    return `${dimensions.width}x${dimensions.height} (${isPortrait ? 'Portrait' : 'Landscape'})`;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-4">Generated Video Segments</h2>
      
      {/* Segments List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {segments.map((segment, index) => (
          <div
            key={segment.id}
            className={`bg-gray-700 rounded-lg p-4 cursor-pointer transition-all hover:bg-gray-600 ${
              selectedSegment?.id === segment.id ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => setSelectedSegment(segment)}
          >
            {/* Image Preview */}
            <div className="relative mb-3 overflow-hidden rounded-lg">
              {imagePreviews[segment.id] ? (
                <img
                  src={imagePreviews[segment.id]}
                  alt={`Segment ${index + 1}`}
                  className="w-full h-32 object-cover"
                  style={{
                    aspectRatio: segment.imageUrl.includes('social_story_9_16') ? '9/16' : '16/9'
                  }}
                  onLoad={(e) => handleImageLoad(segment.id, e)}
                />
              ) : (
                <div className="w-full h-32 bg-gray-600 flex items-center justify-center">
                  <span className="text-gray-400">Loading...</span>
                </div>
              )}
              <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                {formatDuration(segment.duration)}
              </div>
            </div>

            {/* Segment Info */}
            <div className="space-y-2">
              <h3 className="font-semibold text-white">Segment {index + 1}</h3>
              <p className="text-sm text-gray-300 line-clamp-2">
                {segment.text}
              </p>
              
              {/* Video Format Info */}
              <p className="text-xs text-gray-400">
                Format: {getVideoFormat(segment)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Selected Segment Details */}
      {selectedSegment && (
        <div className="bg-gray-700 rounded-lg p-6">
          <h3 className="text-xl font-bold text-white mb-4">
            Segment Details: {selectedSegment.text.substring(0, 50)}...
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Video Player */}
            <div>
              <h4 className="font-semibold text-white mb-2">Video Preview</h4>
              {selectedSegment.videoUrl ? (
                <video
                  key={selectedSegment.id} // Force re-render when segment changes
                  controls
                  className="w-full rounded-lg"
                  style={{
                    aspectRatio: selectedSegment.imageUrl.includes('social_story_9_16') ? '9/16' : '16/9',
                    objectFit: 'cover'
                  }}
                >
                  <source src={selectedSegment.videoUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="w-full h-64 bg-gray-600 rounded-lg flex items-center justify-center">
                  <span className="text-gray-400">Video not available</span>
                </div>
              )}
            </div>

            {/* Segment Information */}
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-white mb-2">Segment Information</h4>
                <div className="bg-gray-800 p-3 rounded space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Duration:</span>
                    <span className="text-white">{formatDuration(selectedSegment.duration)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Audio Size:</span>
                    <span className="text-white">{(selectedSegment.audioBlob.size / 1024).toFixed(1)} KB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Start Time:</span>
                    <span className="text-white">{selectedSegment.startTime.toFixed(2)}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">End Time:</span>
                    <span className="text-white">{selectedSegment.endTime.toFixed(2)}s</span>
                  </div>
                  {selectedSegment.videoBlob && (
                    <div className="flex justify-between">
                      <span className="text-gray-300">Video Size:</span>
                      <span className="text-white">{(selectedSegment.videoBlob.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-300">Format:</span>
                    <span className="text-white">{getVideoFormat(selectedSegment)}</span>
                  </div>
                </div>
              </div>

              {/* Download Button */}
              {selectedSegment.videoBlob && (
                <div>
                  <button
                    onClick={() => downloadVideo(selectedSegment)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Download Segment Video
                  </button>
                  <p className="text-xs text-gray-400 mt-1">
                    Size: {(selectedSegment.videoBlob.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="bg-gray-700 rounded-lg p-4">
        <h4 className="font-semibold text-white mb-2">Generation Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-300">
          <div>
            <p><strong>Total Segments:</strong></p>
            <p>{segments.length}</p>
          </div>
          <div>
            <p><strong>Total Duration:</strong></p>
            <p>{formatDuration(segments.reduce((sum, seg) => sum + seg.duration, 0))}</p>
          </div>
          <div>
            <p><strong>Average Duration:</strong></p>
            <p>{formatDuration(segments.reduce((sum, seg) => sum + seg.duration, 0) / segments.length)}</p>
          </div>
          <div>
            <p><strong>Videos Generated:</strong></p>
            <p>{segments.filter(seg => seg.videoBlob).length}/{segments.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}