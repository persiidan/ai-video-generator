'use client';

import { useState } from 'react';
import { VoiceType, ImageStyle, AspectRatio, FontType, Chunk, TTSResult } from '@/types';
import VoiceSelector from '@/components/VoiceSelector';
import FontSelector from '@/components/FontSelector';
import AspectRatioSelector from '@/components/AspectRatioSelector';
import { validateScript, splitIntoChunks } from '@/components/Chunker';
import { generateTTS, generateMockTTS } from '@/components/TTS';
import { generateImagesForChunks, ImageGenerationResult } from '@/components/ImageGenerator';
import { VideoComposer, VideoSegment } from '@/components/VideoComposer';
import SegmentDisplay from '@/components/SegmentDisplay';
import { createLogger, Logger } from '@/utils/logger';

export default function Home() {
  const [script, setScript] = useState('');
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');
  const [imageStyle, setImageStyle] = useState<ImageStyle>('realistic');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('widescreen_16_9');
  const [selectedFont, setSelectedFont] = useState<FontType>('poppins-regular');
  const [validationError, setValidationError] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [ttsResults, setTtsResults] = useState<TTSResult[]>([]);
  const [imageResults, setImageResults] = useState<ImageGenerationResult[]>([]);
  const [videoSegments, setVideoSegments] = useState<VideoSegment[]>([]);
  const [generationError, setGenerationError] = useState<string>('');
  const [generationErrorDetails, setGenerationErrorDetails] = useState<Record<string, unknown> | null>(null);
  const [isVoiceValid, setIsVoiceValid] = useState(false);
  const [finalVideo, setFinalVideo] = useState<{ blob: Blob; url: string; size: number; duration: number } | null>(null);
  
  // Create logger for this component
  const logger: Logger = createLogger('HomePage');

  const handleScriptChange = (value: string) => {
    setScript(value);
    const validation = validateScript(value);
    setValidationError(validation.error || '');
  };

  const handleVoiceValidationChange = (isValid: boolean) => {
    setIsVoiceValid(isValid);
  };

  const handleStartGeneration = async () => {
    logger.time('VideoGeneration');
    logger.info('🎬 Starting video generation process', 'Generation', {
      scriptLength: script.length,
      selectedVoice: selectedVoiceName,
      imageStyle,
      aspectRatio,
      isVoiceValid
    });

    const validation = validateScript(script);
    if (!validation.isValid) {
      logger.error('Script validation failed', 'Generation', {
        error: validation.error,
        scriptLength: script.length
      });
      setValidationError(validation.error || '');
      return;
    }

    if (!isVoiceValid) {
      logger.error('Voice validation failed', 'Generation', { selectedVoice: selectedVoiceName });
      setGenerationError('Please select a voice before starting generation');
      return;
    }

    setIsGenerating(true);
    setGenerationError('');
    setTtsResults([]);
    setImageResults([]);
    setVideoSegments([]);
    setFinalVideo(null); // Reset final video state

    try {
      // Step 1: Split script into chunks
      logger.info('Step 1: Splitting script into chunks', 'Generation');
      setGenerationStep('Splitting script into chunks...');
      const scriptChunks = splitIntoChunks(script);
      setChunks(scriptChunks);
      logger.info('✅ Script split into chunks', 'Generation', {
        totalChunks: scriptChunks.length,
        chunks: scriptChunks.map(chunk => ({
          id: chunk.id,
          textLength: chunk.text.length,
          textPreview: chunk.text.substring(0, 50)
        }))
      });

      // Step 2: Generate TTS for each chunk
      logger.info('Step 2: Generating text-to-speech', 'Generation', {
        totalChunks: scriptChunks.length,
        selectedVoice: selectedVoiceName
      });
      setGenerationStep('Generating text-to-speech...');
      
      const ttsPromises = scriptChunks.map(async (chunk, index) => {
        logger.debug(`Generating TTS for chunk ${index + 1}`, 'Generation', {
          chunkId: chunk.id,
          textLength: chunk.text.length,
          textPreview: chunk.text.substring(0, 50),
          selectedVoice: selectedVoiceName
        });
        
        try {
          // Try real TTS first, fallback to mock if API key not available
          const ttsResult = await generateTTS(chunk, 'female', selectedVoiceName);
          logger.debug(`✅ TTS generated for chunk ${index + 1}`, 'Generation', {
            chunkId: chunk.id,
            audioSize: ttsResult.audioBlob.size,
            duration: ttsResult.duration
          });
          return ttsResult;
        } catch (error) {
          const ttsError = {
            chunkId: chunk.id,
            chunkText: chunk.text.substring(0, 50),
            selectedVoice: selectedVoiceName,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
          };
          
          logger.warn('TTS API not available, using mock', 'Generation', ttsError);
          
          // If this is the first TTS failure, add to error details
          if (!generationErrorDetails) {
            setGenerationErrorDetails({
              type: 'tts_api_failure',
              ttsError,
              fallbackUsed: true
            });
          }
          
          const mockResult = await generateMockTTS(chunk, 'female');
          return mockResult;
        }
      });

      const ttsResults = await Promise.all(ttsPromises);
      setTtsResults(ttsResults);
      logger.info('✅ TTS generation completed', 'Generation', {
        totalResults: ttsResults.length,
        results: ttsResults.map(result => ({
          audioSize: result.audioBlob.size,
          duration: result.duration
        }))
      });

      // Step 3: Generate images for each chunk
      logger.info('Step 3: Generating images', 'Generation', {
        totalChunks: scriptChunks.length,
        imageStyle,
        aspectRatio
      });
      setGenerationStep('Generating images...');
      const imageStyleForAPI = imageStyle === 'realistic' ? 'Realistic' : 'Cartoon';
      let generatedImageResults: ImageGenerationResult[] = [];
      try {
      generatedImageResults = await generateImagesForChunks(scriptChunks, imageStyleForAPI, aspectRatio);
      setImageResults(generatedImageResults);
        logger.info('✅ Image generation completed', 'Generation', {
          totalResults: generatedImageResults.length,
          results: generatedImageResults.map(result => ({
            id: result.id,
            imageUrl: result.imageUrl,
            style: result.style
          }))
        });
      } catch (error) {
        const imageError = {
          totalChunks: scriptChunks.length,
          imageStyle: imageStyleForAPI,
          aspectRatio,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        };
        
        logger.error('❌ Image generation failed', 'Generation', imageError, error instanceof Error ? error : new Error(String(error)));
        
        // Set error details for image generation failure
        setGenerationErrorDetails({
          type: 'image_generation_failure',
          imageError
        });
        
        throw error; // Re-throw to be caught by the main error handler
      }

      // Step 4: Generate individual video segments (NO concatenation)
      logger.info('Step 4: Creating individual video segments', 'Generation', {
        totalChunks: scriptChunks.length,
        imageResultsLength: generatedImageResults.length,
        ttsResultsLength: ttsResults.length,
        imageResults: generatedImageResults.map((result, index) => ({
          index,
          hasImageUrl: !!result?.imageUrl,
          imageUrl: result?.imageUrl?.substring(0, 50) + '...'
        }))
      });
      setGenerationStep('Creating individual video segments...');
      const videoComposer = new VideoComposer();
      const segments: VideoSegment[] = [];

      for (let i = 0; i < scriptChunks.length; i++) {
        const chunk = scriptChunks[i];
        const ttsResult = ttsResults[i];
        const imageResult = generatedImageResults[i];

        logger.debug(`Processing chunk ${i + 1}`, 'Generation', {
          chunkId: chunk.id,
          hasTTS: !!ttsResult,
          hasImage: !!imageResult,
          ttsResult: ttsResult ? 'present' : 'missing',
          imageResult: imageResult ? 'present' : 'missing',
          imageResultsLength: generatedImageResults.length,
          ttsResultsLength: ttsResults.length
        });

        if (ttsResult && imageResult) {
          try {
            logger.info(`Creating video segment ${i + 1}/${scriptChunks.length}`, 'Generation', {
              chunkId: chunk.id,
              textPreview: chunk.text.substring(0, 50),
              audioSize: ttsResult.audioBlob.size,
              imageUrl: imageResult.imageUrl
            });
            
            setGenerationStep(`Creating video segment ${i + 1}/${scriptChunks.length}...`);
            
            // Create individual video segment with captions
            const segment = await videoComposer.addSegment(
              chunk,
              imageResult.imageUrl,
              ttsResult.audioBlob
            );
            
            // Generate the individual video segment with captions
            const segmentVideo = await videoComposer.generateIndividualSegment(segment, ttsResult, selectedFont);
            segments.push(segmentVideo);
            
            logger.info(`✅ Created video segment ${i + 1}`, 'Generation', {
              segmentId: segmentVideo.id,
              videoSize: segmentVideo.videoBlob ? `${(segmentVideo.videoBlob.size / 1024 / 1024).toFixed(2)} MB` : 'N/A',
              textPreview: segmentVideo.text.substring(0, 50)
            });
          } catch (error) {
            const segmentError = {
              segmentIndex: i + 1,
              totalSegments: scriptChunks.length,
              chunkId: chunk.id,
              textPreview: chunk.text.substring(0, 50),
              hasTTS: !!ttsResult,
              hasImage: !!imageResult,
              ttsSize: ttsResult?.audioBlob?.size || 0,
              imageUrl: imageResult?.imageUrl || 'N/A',
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined
            };
            
            logger.error(`❌ Failed to create video segment ${i + 1}`, 'Generation', segmentError, error instanceof Error ? error : new Error(String(error)));
            
            // Add to error details if this is the first failure
            if (!generationErrorDetails) {
              setGenerationErrorDetails({
                type: 'segment_creation_failed',
                failedSegment: segmentError,
                totalSegments: scriptChunks.length,
                successfulSegments: segments.length
              });
            }
          }
        } else {
          logger.warn(`Missing TTS or image result for chunk ${i + 1}`, 'Generation', {
            chunkId: chunk.id,
            hasTTS: !!ttsResult,
            hasImage: !!imageResult
          });
        }
      }

      setVideoSegments(segments);
      
      const successfulSegments = segments.filter(seg => seg.videoBlob).length;
      const totalSize = segments.reduce((total, seg) => total + (seg.videoBlob?.size || 0), 0);
      
      // Create full video from segments if we have multiple segments
      if (segments.length > 1) {
        setGenerationStep('Concatenating segments into final video...');
        
        try {
          logger.info('Starting video concatenation', 'Generation', {
            totalSegments: segments.length,
            totalSizeMB: `${(totalSize / 1024 / 1024).toFixed(2)} MB`
          });
          
          // Create a new VideoComposer instance for concatenation
          const finalVideoComposer = new VideoComposer();
          
          // Initialize FFmpeg for concatenation
          await finalVideoComposer.waitForFFmpeg();
          
          // Get the individual segment file names that were created
          const segmentFileNames = segments.map((_, index) => `segment_${index}.mp4`);
          
          // Write the existing segment blobs to FFmpeg filesystem
          for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            const fileName = segmentFileNames[i];
            
            if (segment.videoBlob) {
              await finalVideoComposer.writeSegmentToFFmpeg(segment.videoBlob, fileName);
            }
          }
          
          // Concatenate the existing segment files
          const finalVideoBlob = await finalVideoComposer.concatenateSegments(segmentFileNames);
          const finalVideoUrl = URL.createObjectURL(finalVideoBlob);
          
          // Calculate total duration
          const totalDuration = segments.reduce((total, seg) => total + seg.duration, 0);
          
          // Set the final video
          setFinalVideo({
            blob: finalVideoBlob,
            url: finalVideoUrl,
            size: finalVideoBlob.size,
            duration: totalDuration
          });
          
          logger.info('✅ Full video created successfully', 'Generation', {
            finalVideoSize: `${(finalVideoBlob.size / 1024 / 1024).toFixed(2)} MB`,
            totalDuration: totalDuration,
            segmentCount: segments.length
          });
          
        } catch (concatenationError) {
          logger.error('❌ Video concatenation failed', 'Generation', {
            error: concatenationError instanceof Error ? concatenationError.message : String(concatenationError),
            totalSegments: segments.length
          }, concatenationError instanceof Error ? concatenationError : new Error(String(concatenationError)));
          
          // Don't fail the entire process, just log the error
          console.error('Video concatenation failed:', concatenationError);
        }
      }
      
      setGenerationStep('Generation complete!');
      
      logger.info('✅ All video segments created successfully', 'Generation', {
        totalSegments: segments.length,
        successfulSegments,
        totalSizeMB: `${(totalSize / 1024 / 1024).toFixed(2)} MB`
      });
      
      // Show success message if there were any issues
      if (successfulSegments < segments.length) {
        setGenerationErrorDetails({
          type: 'partial_success',
          totalSegments: segments.length,
          successfulSegments,
          failedSegments: segments.length - successfulSegments,
          totalSizeMB: `${(totalSize / 1024 / 1024).toFixed(2)} MB`
        });
      }
      
      logger.timeEnd('VideoGeneration');

    } catch (error) {
      const errorDetails = {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        scriptLength: script.length,
        selectedVoice: selectedVoiceName,
        imageStyle,
        aspectRatio,
        timestamp: new Date().toISOString(),
        chunks: chunks.length,
        ttsResults: ttsResults.length,
        imageResults: imageResults.length,
        videoSegments: videoSegments.length
      };

      logger.error('❌ Generation process failed', 'Generation', errorDetails, error instanceof Error ? error : new Error(String(error)));
      
      setGenerationError(`Generation failed: ${errorDetails.message}`);
      setGenerationErrorDetails(errorDetails);
      logger.timeEnd('VideoGeneration');
    } finally {
      setIsGenerating(false);
    }
  };

  const characterCount = script.length;
  const isOverLimit = characterCount > 1200;
  const canGenerate = script.trim() && !isOverLimit && !validationError && isVoiceValid && !isGenerating;

  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-black to-purple-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-900 rounded-xl shadow-lg p-6 md:p-8 border border-purple-700">
          <h1 className="text-3xl font-bold text-white mb-2 text-center">
            AI Video Generator
          </h1>
          <p className="text-gray-300 text-center mb-8">
            Transform your script into engaging short videos with AI-generated audio, images, and synchronized captions
          </p>

          {/* Script Input */}
          <div className="mb-6">
            <label htmlFor="script" className="block text-sm font-medium text-gray-200 mb-2">
              Script (max 1200 characters)
            </label>
            <textarea
              id="script"
              value={script}
              onChange={(e) => handleScriptChange(e.target.value)}
              placeholder="Enter your script here... (e.g., 'Welcome to our amazing product! This revolutionary tool will transform how you work. Join thousands of satisfied customers who have already discovered the power of innovation.')"
              className={`w-full h-32 p-4 border rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-800 text-white placeholder-gray-400 ${
                isOverLimit ? 'border-red-400 bg-red-900' : 'border-purple-600'
              }`}
              maxLength={1200}
            />
            <div className="flex justify-between items-center mt-2">
              <span className={`text-sm ${isOverLimit ? 'text-red-400' : 'text-gray-400'}`}>
                {characterCount}/1200 characters
              </span>
              {validationError && (
                <span className="text-sm text-red-400">{validationError}</span>
              )}
            </div>
          </div>

          {/* Voice, Style, Aspect Ratio, and Font Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Image Style
              </label>
              <select
                value={imageStyle}
                onChange={(e) => setImageStyle(e.target.value as ImageStyle)}
                className="w-full p-3 border border-purple-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-800 text-white"
              >
                <option value="realistic">Realistic</option>
                <option value="cartoon">Cartoon</option>
              </select>
            </div>

            <div>
              <VoiceSelector
                selectedVoice={selectedVoiceName}
                onVoiceChange={setSelectedVoiceName}
                onValidationChange={handleVoiceValidationChange}
              />
            </div>

            <div>
              <FontSelector
                selectedFont={selectedFont}
                onFontChange={setSelectedFont}
              />
            </div>
          </div>

          {/* Aspect Ratio Selector - Below the other controls */}
          <div className="mb-6">
            <AspectRatioSelector
              selectedAspectRatio={aspectRatio}
              onAspectRatioChange={setAspectRatio}
            />
          </div>

          </div>

          {/* Generate Button */}
          <div className="text-center">
            <button
              onClick={handleStartGeneration}
              disabled={!canGenerate}
              className="px-8 py-4 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              {isGenerating ? 'Generating...' : 'Start Generation'}
            </button>
          </div>

          {/* Generation Status */}
          {isGenerating && (
            <div className="mt-4 p-4 bg-purple-900 border border-purple-600 rounded-lg">
              <p className="text-purple-200 text-center">{generationStep}</p>
            </div>
          )}

          {/* Generation Error */}
          {generationError && (
            <div className="mt-4 p-4 bg-red-900 border border-red-600 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-red-200 font-semibold">❌ Generation Failed</h3>
                <button
                  onClick={() => {
                    setGenerationError('');
                    setGenerationErrorDetails(null);
                  }}
                  className="text-red-300 hover:text-red-100 text-sm"
                >
                  ✕ Clear
                </button>
              </div>
              
              <p className="text-red-200 mb-3">{generationError}</p>
              
              {generationErrorDetails && (
                <div className="mt-3">
                  <details className="text-sm">
                    <summary className="text-red-300 cursor-pointer hover:text-red-100 mb-2">
                      📋 Show Detailed Error Information
                    </summary>
                    <div className="bg-red-800 p-3 rounded border border-red-700">
                      <div className="space-y-2 text-sm">
                        <div>
                          <strong>Error Type:</strong> General Error
                        </div>
                        <div>
                          <strong>Message:</strong> {generationError}
                        </div>
                        <div>
                          <strong>Timestamp:</strong> {new Date().toLocaleString()}
                        </div>
                        {generationErrorDetails && (
                          <div className="mt-3">
                            <strong>Additional Details:</strong>
                            <pre className="text-xs bg-red-700 p-2 rounded mt-1 overflow-x-auto">
                              {JSON.stringify(generationErrorDetails, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </details>
                </div>
              )}
              
              <div className="mt-3 text-sm text-red-300">
                <p>💡 <strong>Debugging Tips:</strong></p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Check the browser console for detailed logs</li>
                  <li>Verify your API keys are configured correctly</li>
                  <li>Try a shorter script if the current one is too long</li>
                  <li>Check your internet connection for API calls</li>
                </ul>
              </div>
            </div>
          )}

          {/* Video Segments Display */}
          {videoSegments.length > 0 && (
            <div className="mt-8">
              <SegmentDisplay segments={videoSegments} />
            </div>
          )}

          {/* Final Video Display */}
          {finalVideo && (
            <div className="mt-8 p-4 bg-gray-900 border border-purple-700 rounded-lg">
              <h3 className="font-medium text-white mb-2">Final Generated Video</h3>
              <p className="text-sm text-gray-300">
                Your final video has been generated. You can download it below.
              </p>
              <div className="mt-4 flex flex-col items-center">
                <video controls className="w-full max-w-md rounded-lg shadow-lg">
                  <source src={finalVideo.url} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                <p className="text-sm text-gray-300 mt-2">
                  Size: {(finalVideo.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <p className="text-sm text-gray-300">
                  Duration: {finalVideo.duration} seconds
                </p>
                <a
                  href={finalVideo.url}
                  download={`ai_video_${new Date().toISOString().slice(0, 10)}.mp4`}
                  className="mt-4 px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Download Video
                </a>
              </div>
            </div>
          )}
        </div>
    </main>
  );
}
