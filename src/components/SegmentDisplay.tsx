'use client';

import React, { useState } from 'react';
import { VideoSegment } from './VideoComposer';

interface SegmentDisplayProps {
  segments: VideoSegment[];
}

export default function SegmentDisplay({ segments }: SegmentDisplayProps) {
  const [selectedSegmentIndex, setSelectedSegmentIndex] = useState<number | null>(null);

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

  const selectedSegment = selectedSegmentIndex !== null ? segments[selectedSegmentIndex] : null;

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-white mb-4">Video Segments ({segments.length})</h3>
      
      {/* Centered Scrollable Segment List */}
      <div className="flex justify-center">
        <div className="bg-gray-900 rounded-lg border border-purple-700 max-w-4xl w-full">
          <div className="p-4">
            <h4 className="text-lg font-medium text-white mb-3">Select a Segment</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-48 overflow-y-auto">
              {segments.map((segment, index) => (
                <div
                  key={segment.id}
                  onClick={() => setSelectedSegmentIndex(index)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-gray-800 ${
                    selectedSegmentIndex === index 
                      ? 'bg-purple-600 border-purple-500' 
                      : 'border-gray-600 bg-gray-800'
                  }`}
                >
                  <div className="text-center">
                    <h5 className="text-white font-medium text-sm">Segment {index + 1}</h5>
                    <p className="text-gray-300 text-xs mt-1 truncate">
                      {segment.text.length > 30 ? `${segment.text.substring(0, 30)}...` : segment.text}
                    </p>
                    <div className="flex justify-center items-center gap-2 mt-2 text-xs text-gray-400">
                      <span>{segment.duration.toFixed(1)}s</span>
                      {segment.videoBlob && (
                        <>
                          <span>•</span>
                          <span>{(segment.videoBlob.size / 1024 / 1024).toFixed(1)} MB</span>
                          <span className="text-green-400">✓</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Detailed View Below */}
      {selectedSegment && (
        <div className="bg-gray-900 rounded-lg p-6 border border-purple-700">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-medium text-white">
              Segment {selectedSegmentIndex! + 1} Details
            </h4>
            {selectedSegment.videoBlob && (
              <button
                onClick={() => handleDownload(selectedSegment, selectedSegmentIndex!)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                📥 Download Segment
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Video Player - Left Side */}
            <div>
              <h5 className="text-md font-medium text-white mb-2">Video</h5>
              {selectedSegment.videoUrl ? (
                <video
                  controls
                  className="w-full rounded-lg"
                  src={selectedSegment.videoUrl}
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="bg-gray-800 p-4 rounded-lg text-center">
                  <p className="text-gray-300">Video not available</p>
                </div>
              )}
            </div>

            {/* Segment Details - Right Side */}
            <div className="space-y-4">
              <div>
                <h5 className="text-md font-medium text-white mb-2">Text Content</h5>
                <div className="bg-gray-800 p-3 rounded border border-gray-600">
                  <p className="text-white text-sm">{selectedSegment.text}</p>
                </div>
              </div>
              
              <div>
                <h5 className="text-md font-medium text-white mb-2">Segment Information</h5>
                <div className="bg-gray-800 p-3 rounded border border-gray-600 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-300 text-sm">Duration:</span>
                    <span className="text-white text-sm">{selectedSegment.duration.toFixed(2)}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300 text-sm">Audio Size:</span>
                    <span className="text-white text-sm">{(selectedSegment.audioBlob.size / 1024).toFixed(1)} KB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300 text-sm">Start Time:</span>
                    <span className="text-white text-sm">{selectedSegment.startTime.toFixed(2)}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300 text-sm">End Time:</span>
                    <span className="text-white text-sm">{selectedSegment.endTime.toFixed(2)}s</span>
                  </div>
                  {selectedSegment.videoBlob && (
                    <div className="flex justify-between">
                      <span className="text-gray-300 text-sm">Video Size:</span>
                      <span className="text-white text-sm">{(selectedSegment.videoBlob.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Status */}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-300 text-sm">Status:</span>
                  {selectedSegment.videoBlob ? (
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
          </div>
        </div>
      )}
    </div>
  );
} 