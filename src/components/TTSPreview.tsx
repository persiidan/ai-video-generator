'use client';

import { useState, useRef } from 'react';
import { TTSResult, WordTimestamp } from '@/types';

interface TTSPreviewProps {
  ttsResults: TTSResult[];
  chunks: Array<{ id: string; text: string }>;
}

export default function TTSPreview({ ttsResults, chunks }: TTSPreviewProps) {
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showAudioHelp, setShowAudioHelp] = useState(false);
  const audioRefs = useRef<(HTMLAudioElement | null)[]>([]);

  // Detect browser for specific instructions
  const getBrowserInfo = () => {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      return 'Safari';
    } else if (userAgent.includes('Firefox')) {
      return 'Firefox';
    } else if (userAgent.includes('Chrome')) {
      return 'Chrome';
    } else if (userAgent.includes('Edge')) {
      return 'Edge';
    }
    return 'Unknown';
  };

  const handlePlayPause = (chunkIndex: number) => {
    const audio = audioRefs.current[chunkIndex];
    if (!audio) {
      console.error('❌ Audio element not found for chunk:', chunkIndex);
      return;
    }

    console.log('🎵 Audio element:', audio);
    console.log('🎵 Audio src:', audio.src);
    console.log('🎵 Audio readyState:', audio.readyState);
    console.log('🎵 Audio duration:', audio.duration);

    if (isPlaying && currentChunkIndex === chunkIndex) {
      audio.pause();
      setIsPlaying(false);
    } else {
      // Stop any currently playing audio
      audioRefs.current.forEach((ref, index) => {
        if (ref && index !== chunkIndex) {
          ref.pause();
          ref.currentTime = 0;
        }
      });

      // Initialize audio context if needed (for Safari and some browsers)
      const initAudioContext = async () => {
        try {
          // Create a silent audio context to unlock audio
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          if (audioContext.state === 'suspended') {
            await audioContext.resume();
          }
          console.log('🎵 Audio context initialized');
        } catch (error) {
          console.warn('🎵 Audio context initialization failed:', error);
        }
      };

      // Try to play with multiple fallbacks
      const playAudio = async () => {
        try {
          // Method 1: Direct play
          await audio.play();
          console.log('✅ Audio playback started successfully');
        } catch (error) {
          console.warn('❌ Direct play failed, trying audio context method:', error);
          
          try {
            // Method 2: Initialize audio context first
            await initAudioContext();
            await audio.play();
            console.log('✅ Audio playback started with context');
          } catch (error2) {
            console.error('❌ Audio context method failed:', error2);
            
            try {
              // Method 3: Set volume and try again
              audio.volume = 0.5;
              await audio.play();
              console.log('✅ Audio playback started with volume adjustment');
            } catch (error3) {
              console.error('❌ All audio playback methods failed:', error3);
              setIsPlaying(false);
              
              // Show user-friendly error message
              alert('Audio playback failed. Please check your browser settings and try again. You can still download the audio file.');
            }
          }
        }
      };

      playAudio();
      setIsPlaying(true);
      setCurrentChunkIndex(chunkIndex);
    }
  };

  const handleTimeUpdate = (chunkIndex: number) => {
    const audio = audioRefs.current[chunkIndex];
    if (audio) {
      setCurrentTime(audio.currentTime);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCurrentWord = (timestamps: WordTimestamp[], currentTime: number): string => {
    const currentWord = timestamps.find(
      timestamp => currentTime >= timestamp.startTime && currentTime <= timestamp.endTime
    );
    return currentWord?.word || '';
  };

  const handleDownload = (ttsResult: TTSResult, chunkIndex: number) => {
    const url = URL.createObjectURL(ttsResult.audioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tts-chunk-${chunkIndex + 1}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-white mb-4">TTS Preview</h3>
        <button
          onClick={() => setShowAudioHelp(!showAudioHelp)}
          className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 transition-colors"
        >
          {showAudioHelp ? '❌ Hide Help' : '❓ Audio Help'}
        </button>
      </div>
      
      {showAudioHelp && (
        <div className="bg-yellow-900 border border-yellow-600 rounded p-4 mb-4">
          <h4 className="text-yellow-200 font-semibold mb-2">Audio Playback Help</h4>
          <p className="text-yellow-100 text-sm mb-2">
            If you can't hear audio when clicking Play, try these solutions:
          </p>
          <div className="text-yellow-100 text-sm space-y-1">
            {getBrowserInfo() === 'Safari' && (
              <div>
                <strong>Safari:</strong> Go to Safari → Settings → Websites → Auto-Play → Set to "Allow All Auto-Play"
              </div>
            )}
            {getBrowserInfo() === 'Firefox' && (
              <div>
                <strong>Firefox:</strong> Check if Firefox has audio permissions. Right-click the page → View Page Info → Permissions → Audio
              </div>
            )}
            <div>
              <strong>All browsers:</strong> Make sure your system volume is not muted and the browser tab has audio permissions
            </div>
            <div>
              <strong>Alternative:</strong> Use the Download button to save and play the audio file in your media player
            </div>
          </div>
        </div>
      )}

      {ttsResults.map((ttsResult, index) => {
        const chunk = chunks[index];
        const audioUrl = URL.createObjectURL(ttsResult.audioBlob);
        
        console.log(`🎵 Chunk ${index + 1} audio details:`, {
          blobSize: ttsResult.audioBlob.size,
          blobType: ttsResult.audioBlob.type,
          duration: ttsResult.duration,
          wordCount: ttsResult.wordTimestamps.length,
          audioUrl: audioUrl
        });
        
        // Test if the blob is valid
        if (ttsResult.audioBlob.size === 0) {
          console.error('❌ Audio blob is empty!');
        } else {
          console.log('✅ Audio blob is valid');
        }
        
        return (
          <div key={chunk.id} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-lg font-medium text-white">Chunk {index + 1}</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePlayPause(index)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {isPlaying && currentChunkIndex === index ? '⏸️ Pause' : '▶️ Play'}
                </button>
                <button
                  onClick={() => handleDownload(ttsResult, index)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  title="Download audio file"
                >
                  📥 Download
                </button>
              </div>
            </div>

            <div className="mb-3">
              <p className="text-gray-300 text-sm mb-2">Text:</p>
              <p className="text-white bg-gray-800 p-3 rounded border border-gray-600">
                {chunk.text}
              </p>
            </div>

            <div className="mb-3">
              <p className="text-gray-300 text-sm mb-2">Duration: {formatTime(ttsResult.duration)}</p>
              <audio
                ref={(el) => {
                  audioRefs.current[index] = el;
                }}
                src={audioUrl}
                onTimeUpdate={() => handleTimeUpdate(index)}
                onEnded={handleAudioEnded}
                onError={(e) => {
                  console.error('❌ Audio error:', e);
                  console.error('❌ Audio error details:', {
                    error: e,
                    target: e.target,
                    currentSrc: (e.target as HTMLAudioElement)?.currentSrc
                  });
                }}
                onLoadStart={() => console.log('🎵 Audio load started')}
                onCanPlay={() => console.log('🎵 Audio can play')}
                onCanPlayThrough={() => console.log('🎵 Audio can play through')}
                preload="metadata"
                controlsList="nodownload"
                crossOrigin="anonymous"
              />
            </div>

            {/* Word Timeline */}
            <div className="mb-3">
              <p className="text-gray-300 text-sm mb-2">Word Timeline:</p>
              <div className="bg-gray-800 p-3 rounded border border-gray-600 max-h-32 overflow-y-auto">
                <div className="flex flex-wrap gap-1">
                  {ttsResult.wordTimestamps.map((timestamp, wordIndex) => {
                    const isCurrentWord = 
                      isPlaying && 
                      currentChunkIndex === index && 
                      currentTime >= timestamp.startTime && 
                      currentTime <= timestamp.endTime;
                    
                    return (
                      <span
                        key={wordIndex}
                        className={`px-2 py-1 rounded text-xs transition-colors ${
                          isCurrentWord
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-600 text-gray-300'
                        }`}
                        title={`${timestamp.word}: ${formatTime(timestamp.startTime)} - ${formatTime(timestamp.endTime)}`}
                      >
                        {timestamp.word}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Current Word Highlight */}
            {isPlaying && currentChunkIndex === index && (
              <div className="bg-blue-900 border border-blue-600 rounded p-3">
                <p className="text-blue-200 text-sm font-medium">Currently Speaking:</p>
                <p className="text-white text-lg">
                  "{getCurrentWord(ttsResult.wordTimestamps, currentTime)}"
                </p>
                <p className="text-blue-300 text-sm">
                  Time: {formatTime(currentTime)} / {formatTime(ttsResult.duration)}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
} 