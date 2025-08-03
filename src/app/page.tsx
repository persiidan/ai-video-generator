'use client';

import { useState } from 'react';
import { VoiceType, ImageStyle, AspectRatio, GenerationConfig, Chunk, TTSResult } from '@/types';
import VoiceSelector from '@/components/VoiceSelector';
import { validateScript, splitIntoChunks } from '@/components/Chunker';
import { generateTTS, generateMockTTS } from '@/components/TTS';
import { generateImagesForChunks, ImageGenerationResult } from '@/components/ImageGenerator';
import { VideoComposer, VideoSegment, VideoComposerResult } from '@/components/VideoComposer';
import VideoPreview from '@/components/VideoPreview';
import SegmentDisplay from '@/components/SegmentDisplay';
import { createLogger, Logger } from '@/utils/logger';

export default function Home() {
  const [script, setScript] = useState('');
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');
  const [imageStyle, setImageStyle] = useState<ImageStyle>('realistic');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('widescreen_16_9');
  const [validationError, setValidationError] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [ttsResults, setTtsResults] = useState<TTSResult[]>([]);
  const [imageResults, setImageResults] = useState<ImageGenerationResult[]>([]);
  const [videoSegments, setVideoSegments] = useState<VideoSegment[]>([]);
  const [generationError, setGenerationError] = useState<string>('');
  const [generationErrorDetails, setGenerationErrorDetails] = useState<any>(null);
  const [isVoiceValid, setIsVoiceValid] = useState(false);
  
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
            const segmentVideo = await videoComposer.generateIndividualSegment(segment, ttsResult);
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
      setGenerationStep('Generation complete!');
      
      const successfulSegments = segments.filter(seg => seg.videoBlob).length;
      const totalSize = segments.reduce((total, seg) => total + (seg.videoBlob?.size || 0), 0);
      
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
    <main className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800 rounded-xl shadow-lg p-6 md:p-8 border border-gray-700">
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
              className={`w-full h-32 p-4 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-700 text-white placeholder-gray-400 ${
                isOverLimit ? 'border-red-400 bg-red-900' : 'border-gray-600'
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

          {/* Voice, Style, and Aspect Ratio Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Image Style
              </label>
              <select
                value={imageStyle}
                onChange={(e) => setImageStyle(e.target.value as ImageStyle)}
                className="w-full p-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-700 text-white"
              >
                <option value="realistic">Realistic</option>
                <option value="cartoon">Cartoon</option>
              </select>
            </div>

            <div className="mb-4">
              <label htmlFor="aspectRatio" className="block text-sm font-medium text-gray-200 mb-2">
                Aspect Ratio
              </label>
              <select
                id="aspectRatio"
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                className="w-full p-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-700 text-white"
              >
                <option value="widescreen_16_9">Landscape 16:9</option>
                <option value="social_story_9_16">Portrait 9:16</option>
              </select>
              <p className="text-xs text-gray-400 mt-1">
                {aspectRatio === 'widescreen_16_9' ? 'Horizontal video format' : 'Vertical video format'}
              </p>
            </div>

            <div>
              <VoiceSelector
                selectedVoice={selectedVoiceName}
                onVoiceChange={setSelectedVoiceName}
                onValidationChange={handleVoiceValidationChange}
              />
            </div>
          </div>

          {/* Generate Button */}
          <div className="text-center">
            <button
              onClick={handleStartGeneration}
              disabled={!canGenerate}
              className="px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              {isGenerating ? 'Generating...' : 'Start Generation'}
            </button>
          </div>

          {/* Generation Status */}
          {isGenerating && (
            <div className="mt-4 p-4 bg-blue-900 border border-blue-600 rounded-lg">
              <p className="text-blue-200 text-center">{generationStep}</p>
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
                      <div className="space-y-2 text-red-200">
                        <div>
                          <strong>Error Type:</strong> {generationErrorDetails.type || 'general_failure'}
                        </div>
                        <div>
                          <strong>Timestamp:</strong> {generationErrorDetails.timestamp}
                        </div>
                        <div>
                          <strong>Script Length:</strong> {generationErrorDetails.scriptLength} characters
                        </div>
                        <div>
                          <strong>Selected Voice:</strong> {generationErrorDetails.selectedVoice || 'None'}
                        </div>
                        <div>
                          <strong>Image Style:</strong> {generationErrorDetails.imageStyle}
                        </div>
                        <div>
                          <strong>Aspect Ratio:</strong> {generationErrorDetails.aspectRatio}
                        </div>
                        
                        {generationErrorDetails.chunks !== undefined && (
                          <div>
                            <strong>Chunks Created:</strong> {generationErrorDetails.chunks}
                          </div>
                        )}
                        
                        {generationErrorDetails.ttsResults !== undefined && (
                          <div>
                            <strong>TTS Results:</strong> {generationErrorDetails.ttsResults}
                          </div>
                        )}
                        
                        {generationErrorDetails.imageResults !== undefined && (
                          <div>
                            <strong>Images Generated:</strong> {generationErrorDetails.imageResults}
                          </div>
                        )}
                        
                        {generationErrorDetails.videoSegments !== undefined && (
                          <div>
                            <strong>Video Segments:</strong> {generationErrorDetails.videoSegments}
                          </div>
                        )}
                        
                        {generationErrorDetails.failedSegment && (
                          <div className="mt-3 p-2 bg-red-700 rounded">
                            <strong>Failed Segment Details:</strong>
                            <div className="mt-1 space-y-1 text-xs">
                              <div>Segment: {generationErrorDetails.failedSegment.segmentIndex}/{generationErrorDetails.failedSegment.totalSegments}</div>
                              <div>Text: "{generationErrorDetails.failedSegment.textPreview}..."</div>
                              <div>Has TTS: {generationErrorDetails.failedSegment.hasTTS ? 'Yes' : 'No'}</div>
                              <div>Has Image: {generationErrorDetails.failedSegment.hasImage ? 'Yes' : 'No'}</div>
                              <div>TTS Size: {generationErrorDetails.failedSegment.ttsSize} bytes</div>
                              <div>Image URL: {generationErrorDetails.failedSegment.imageUrl}</div>
                              <div>Error: {generationErrorDetails.failedSegment.error}</div>
                            </div>
                          </div>
                        )}
                        
                        {generationErrorDetails.stack && (
                          <div className="mt-3">
                            <strong>Stack Trace:</strong>
                            <pre className="text-xs bg-red-700 p-2 rounded mt-1 overflow-x-auto">
                              {generationErrorDetails.stack}
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

          {/* API Keys Notice */}
          <div className="mt-8 p-4 bg-yellow-900 border border-yellow-700 rounded-lg">
            <h3 className="font-medium text-yellow-200 mb-2">Required API Keys</h3>
            <p className="text-sm text-yellow-300">
              To use this application, you'll need to configure API keys for:
            </p>
            <ul className="text-sm text-yellow-300 mt-2 list-disc list-inside">
              <li>Google Cloud Text-to-Speech API (Stage 2 - Working)</li>
              <li>Freepik Image Generation API (Stage 3 - Updated with new parameters)</li>
            </ul>
            <p className="text-sm text-yellow-300 mt-2">
              Add your Freepik API key to <code className="bg-gray-800 px-1 rounded">.env.local</code> as <code className="bg-gray-800 px-1 rounded">NEXT_PUBLIC_FREEPIK_API_KEY</code>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
