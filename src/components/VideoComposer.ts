import { ChunkData, TTSResult } from '@/types';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { fetchImageWithCache } from '@/utils/imageCache';

export interface VideoSegment {
  id: string;
  imageUrl: string;
  audioBlob: Blob;
  duration: number;
  text: string;
  startTime: number;
  endTime: number;
  videoBlob?: Blob;
  videoUrl?: string;
}

export interface WordTimestamp {
  word: string;
  startTime: number;
  endTime: number;
}

export interface ThreeWordChunk {
  text: string;
  startTime: number;
  endTime: number;
}

export interface VideoComposerResult {
  videoBlob: Blob;
  videoUrl: string;
  segments: VideoSegment[];
  totalDuration: number;
  dimensions: { width: number; height: number };
  isPortrait: boolean;
}

export interface ProgressCallback {
  (phase: string, progress: number, currentSegment?: number, totalSegments?: number): void;
}

export class VideoComposer {
  private segments: VideoSegment[] = [];
  private ffmpeg: FFmpeg | null = null;
  private isInitialized = false;
  private onProgress?: ProgressCallback;

  constructor(onProgress?: ProgressCallback) {
    this.onProgress = onProgress;
    // Initialize FFmpeg asynchronously
    this.initializeFFmpeg().catch(error => {
      console.error('❌ FFmpeg initialization failed:', error);
    });
  }

  private async initializeFFmpeg() {
    try {
      this.ffmpeg = new FFmpeg();
      
      // Add progress logging for FFmpeg operations
      this.ffmpeg.on('log', ({ message }) => {
        console.log('FFmpeg:', message);
      });

      this.ffmpeg.on('progress', ({ progress, time }) => {
        // FFmpeg progress is between 0 and 1
        this.onProgress?.('processing', progress * 100);
      });
      
      this.onProgress?.('initializing', 0);
      
      // Load ffmpeg.wasm with simple initialization
      console.log('🔄 Loading FFmpeg.wasm...');
      await this.ffmpeg.load();
      
      this.isInitialized = true;
      this.onProgress?.('ready', 100);
      console.log('✅ FFmpeg.wasm loaded successfully');
    } catch (error) {
      console.error('❌ Failed to initialize FFmpeg:', error);
      throw new Error('Video composition requires FFmpeg.wasm');
    }
  }

  /**
   * Get optimal video dimensions based on orientation
   */
  private getVideoDimensions(isPortrait: boolean): { width: number; height: number } {
    return isPortrait 
      ? { width: 1080, height: 1920 } // 9:16 aspect ratio
      : { width: 1920, height: 1080 }; // 16:9 aspect ratio
  }

  /**
   * Add a video segment with image and audio
   */
  async addSegment(
    chunkData: ChunkData,
    imageUrl: string,
    audioBlob: Blob
  ): Promise<VideoSegment> {
    const duration = await this.calculateAudioDuration(audioBlob);
    
    const segment: VideoSegment = {
      id: `segment-${Date.now()}-${Math.random()}`,
      imageUrl,
      audioBlob,
      duration,
      text: chunkData.text,
      startTime: this.segments.reduce((sum, seg) => sum + seg.duration, 0),
      endTime: this.segments.reduce((sum, seg) => sum + seg.duration, 0) + duration
    };

    this.segments.push(segment);
    console.log(`🎬 Added video segment: ${segment.text.substring(0, 50)}... (${duration.toFixed(2)}s)`);
    
    return segment;
  }

  /**
   * Calculate audio duration from blob with better error handling
   */
  private calculateAudioDuration(audioBlob: Blob): Promise<number> {
    return new Promise((resolve) => {
      const audio = new Audio();
      const blobUrl = URL.createObjectURL(audioBlob);
      audio.src = blobUrl;
      
      const cleanup = () => {
        URL.revokeObjectURL(blobUrl);
      };
      
      audio.addEventListener('loadedmetadata', () => {
        resolve(audio.duration);
        cleanup();
      });
      
      audio.addEventListener('error', () => {
        // Better fallback: estimate based on blob size and typical speech rate
        const estimatedDuration = Math.max(audioBlob.size / 16000, 1); // Minimum 1 second
        console.warn(`Could not determine audio duration, estimating ${estimatedDuration.toFixed(2)}s`);
        resolve(estimatedDuration);
        cleanup();
      });
      
      // Timeout fallback
      setTimeout(() => {
        const fallbackDuration = Math.max(audioBlob.size / 16000, 1);
        console.warn(`Audio duration detection timeout, using fallback: ${fallbackDuration.toFixed(2)}s`);
        resolve(fallbackDuration);
        cleanup();
      }, 5000);
    });
  }

  /**
   * Wait for FFmpeg to be ready
   */
  async waitForFFmpeg(): Promise<void> {
    let attempts = 0;
    const maxAttempts = 100; // 10 seconds max wait
    
    while (!this.isInitialized && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
      
      if (attempts % 10 === 0) {
        this.onProgress?.('initializing', (attempts / maxAttempts) * 50);
      }
    }
    
    if (!this.isInitialized || !this.ffmpeg) {
      throw new Error('FFmpeg failed to initialize within 10 seconds');
    }
  }

  /**
   * Clean up FFmpeg resources - improved cleanup with better error handling
   */
  private async cleanup(): Promise<void> {
    if (!this.ffmpeg) return;
    
    try {
      console.log('🧹 Cleaning up FFmpeg virtual filesystem...');
      
      // Try to get list of files, but don't fail if it doesn't work
      let files: any[] = [];
      try {
        files = await this.ffmpeg.listDir('/');
        console.log('📁 Files in FFmpeg filesystem:', files.map(f => f.name));
      } catch (listError) {
        console.warn('⚠️ Could not list FFmpeg files, proceeding with known cleanup');
      }
      
      // Clean up known temporary files
      const tempFiles = [
        'image.jpg', 
        'audio.mp3', 
        'captions.png',
        'concat.txt',
        'concat_alt.txt', 
        'final_video.mp4',
        'final_video_alt.mp4',
        'input.mp4',
        'output.mp4'
      ];
      
      // Add pattern-based cleanup for generated files
      if (files.length > 0) {
        const generatedFiles = files
          .filter(f => f.isFile)
          .map(f => f.name)
          .filter(name => 
            name.startsWith('image_') || 
            name.startsWith('audio_') || 
            name.startsWith('captions_') ||
            name.startsWith('segment_')
          );
        tempFiles.push(...generatedFiles);
      }
      
      for (const file of tempFiles) {
        try {
          await this.ffmpeg.deleteFile(file);
          console.log(`🗑️ Deleted temp file: ${file}`);
        } catch {
          // File might not exist, ignore silently
        }
      }
      
      console.log('✅ Cleanup completed');
    } catch (error) {
      console.warn('⚠️ Cleanup warning (non-critical):', error);
    }
  }

  /**
   * Convert word timestamps to 3-word chunks
   */
  private createThreeWordChunks(wordTimestamps: WordTimestamp[]): ThreeWordChunk[] {
    const chunks: ThreeWordChunk[] = [];
    
    // Calculate the total actual duration from the last word's end time
    const totalDuration = wordTimestamps.length > 0 
      ? wordTimestamps[wordTimestamps.length - 1].endTime 
      : 0;
    
    console.log(`📝 Total calculated duration from timestamps: ${totalDuration}s`);
    console.log(`📝 Number of words: ${wordTimestamps.length}`);
    
    for (let i = 0; i < wordTimestamps.length; i += 3) {
      const wordGroup = wordTimestamps.slice(i, i + 3);
      const text = wordGroup.map(w => w.word).join(' ');
      
      // Use the first word's start time and last word's end time
      const startTime = wordGroup[0].startTime;
      const endTime = wordGroup[wordGroup.length - 1].endTime;
      
      // Use exact timing without overlap buffers
      const adjustedStartTime = startTime;
      const adjustedEndTime = endTime;
      
      chunks.push({
        text,
        startTime: adjustedStartTime,
        endTime: adjustedEndTime
      });
      
      console.log(`📝 Chunk ${chunks.length}: "${text}" (${adjustedStartTime}s - ${adjustedEndTime}s)`);
    }
    
    console.log(`📝 Created ${chunks.length} three-word chunks from ${wordTimestamps.length} words`);
    return chunks;
  }

  /**
   * Generate caption-less video from all segments
   */
  async generateVideo(): Promise<VideoComposerResult> {
    if (this.segments.length === 0) throw new Error('No segments to generate video from');

    try {
      // Wait for FFmpeg to be initialized
      await this.waitForFFmpeg();
      
      console.log(`🎬 Starting caption-less video generation for ${this.segments.length} segments...`);
      const totalStartTime = Date.now();

      // Clean up any existing files
      await this.cleanup();

      // Determine video dimensions based on first segment
      const firstSegment = this.segments[0];
      const isPortrait = firstSegment.imageUrl.includes('social_story_9_16');
      const dimensions = this.getVideoDimensions(isPortrait);

      console.log(`📐 Video dimensions: ${dimensions.width}x${dimensions.height} (${isPortrait ? 'Portrait' : 'Landscape'})`);

      // Create individual video segments (WITHOUT captions)
      const segmentFiles: string[] = [];
      let totalDuration = 0;

      for (let i = 0; i < this.segments.length; i++) {
        const segment = this.segments[i];
        const segmentFileName = `segment_${i}.mp4`;
        
        console.log(`🎬 Creating segment ${i + 1}/${this.segments.length}: ${segmentFileName}`);
        const segmentStartTime = Date.now();
        
        try {
          await this.createVideoSegment(segment, segmentFileName, isPortrait, dimensions);
          segmentFiles.push(segmentFileName);
          totalDuration += segment.duration;
          
          const segmentEndTime = Date.now();
          console.log(`✅ Segment ${i + 1} created in ${((segmentEndTime - segmentStartTime) / 1000).toFixed(1)}s`);
          
          // Report progress
          if (this.onProgress) {
            const progress = ((i + 1) / this.segments.length) * 70; // First 70% for segments
            this.onProgress('creating_segments', progress, i + 1, this.segments.length);
          }
        } catch (error) {
          console.error(`❌ Failed to create segment ${i + 1}:`, error);
          throw error;
        }
      }

      console.log(`✅ All ${segmentFiles.length} segments created successfully`);
      console.log(`🎬 Starting concatenation of ${segmentFiles.length} segments...`);

      // Report concatenation start
      if (this.onProgress) {
        this.onProgress('concatenating', 70);
      }

      // Concatenate all segments into final video
      const finalVideoBlob = await this.concatenateSegments(segmentFiles);
      const finalVideoUrl = URL.createObjectURL(finalVideoBlob);

      const totalEndTime = Date.now();
      const totalTime = (totalEndTime - totalStartTime) / 1000;
      console.log(`🎉 Caption-less video generation completed in ${totalTime.toFixed(1)} seconds!`);

      // Report completion
      if (this.onProgress) {
        this.onProgress('complete', 100, this.segments.length, this.segments.length);
      }

      const result: VideoComposerResult = {
        videoBlob: finalVideoBlob,
        videoUrl: finalVideoUrl,
        segments: this.segments,
        totalDuration,
        dimensions,
        isPortrait
      };

      console.log(`✅ Final video: ${(finalVideoBlob.size / 1024 / 1024).toFixed(2)} MB, ${totalDuration.toFixed(1)}s duration`);
      return result;

    } catch (error) {
      console.error('❌ Caption-less video generation failed:', error);
      await this.cleanup(); // Clean up on error
      throw error;
    }
  }

  /**
   * Generate video with captions from all segments
   */
  async generateVideoWithCaptions(ttsResults: TTSResult[]): Promise<VideoComposerResult> {
    if (this.segments.length === 0) throw new Error('No segments to generate video from');
    if (ttsResults.length !== this.segments.length) {
      throw new Error(`Mismatch: ${this.segments.length} segments but ${ttsResults.length} TTS results`);
    }

    try {
      // Wait for FFmpeg to be initialized
      await this.waitForFFmpeg();
      
      console.log(`🎬 Starting video generation WITH CAPTIONS for ${this.segments.length} segments...`);
      const totalStartTime = Date.now();

      // Clean up any existing files
      await this.cleanup();

      // Determine video dimensions based on first segment
      const firstSegment = this.segments[0];
      const isPortrait = firstSegment.imageUrl.includes('social_story_9_16');
      const dimensions = this.getVideoDimensions(isPortrait);

      console.log(`📐 Video dimensions: ${dimensions.width}x${dimensions.height} (${isPortrait ? 'portrait' : 'landscape'})`);

      // Create video segments WITH captions
      const segmentFiles: string[] = [];
      let totalDuration = 0;

      for (let i = 0; i < this.segments.length; i++) {
        const segment = this.segments[i];
        const ttsResult = ttsResults[i];
        const segmentFileName = `segment_${i}.mp4`;
        
        console.log(`🎬 Creating captioned segment ${i + 1}/${this.segments.length}: ${segmentFileName}`);
        const segmentStartTime = Date.now();
        
        try {
          await this.createVideoSegmentWithCaptions(segment, segmentFileName, isPortrait, dimensions, ttsResult);
          
          // Verify the segment file was created
          try {
            const segmentData = await this.ffmpeg!.readFile(segmentFileName);
            const size = typeof segmentData === 'string' ? segmentData.length : segmentData.byteLength;
            console.log(`✅ Verified segment file created: ${segmentFileName} (${(size / 1024).toFixed(1)} KB)`);
          } catch (verifyError) {
            console.error(`❌ Segment file verification failed: ${segmentFileName}`, verifyError);
            throw new Error(`Segment file was not created properly: ${segmentFileName}`);
          }
          
          segmentFiles.push(segmentFileName);
          totalDuration += segment.duration;
          
          const segmentEndTime = Date.now();
          console.log(`✅ Captioned segment ${i + 1} created in ${((segmentEndTime - segmentStartTime) / 1000).toFixed(1)}s`);
          
          // Report progress
          if (this.onProgress) {
            const progress = ((i + 1) / this.segments.length) * 70; // First 70% for segments
            this.onProgress('creating_segments', progress, i + 1, this.segments.length);
          }
        } catch (error) {
          console.error(`❌ Failed to create captioned segment ${i + 1}:`, error);
          throw error;
        }
      }

      console.log(`✅ All ${segmentFiles.length} captioned segments created successfully`);
      console.log(`🎬 Starting concatenation of ${segmentFiles.length} captioned segments...`);

      // Report concatenation start
      if (this.onProgress) {
        this.onProgress('concatenating', 70);
      }

      // Concatenate all segments into final video
      const finalVideoBlob = await this.concatenateSegments(segmentFiles);
      const finalVideoUrl = URL.createObjectURL(finalVideoBlob);

      const totalEndTime = Date.now();
      const totalTime = (totalEndTime - totalStartTime) / 1000;
      console.log(`🎉 Captioned video generation completed in ${totalTime.toFixed(1)} seconds!`);

      // Report completion
      if (this.onProgress) {
        this.onProgress('complete', 100, this.segments.length, this.segments.length);
      }

      const result: VideoComposerResult = {
        videoBlob: finalVideoBlob,
        videoUrl: finalVideoUrl,
        segments: this.segments,
        totalDuration,
        dimensions,
        isPortrait
      };

      console.log(`✅ Final captioned video: ${(finalVideoBlob.size / 1024 / 1024).toFixed(2)} MB, ${totalDuration.toFixed(1)}s duration`);
      return result;

    } catch (error) {
      console.error('❌ Captioned video generation failed:', error);
      await this.cleanup(); // Clean up on error
      throw error;
    }
  }

  /**
   * Generate individual video segment with captions
   */
  async generateIndividualSegment(segment: VideoSegment, ttsResult: TTSResult, selectedFont?: string): Promise<VideoSegment> {
    try {
      // Wait for FFmpeg to be initialized
      await this.waitForFFmpeg();
      
      console.log(`🎬 Generating individual segment: ${segment.id}`);
      
      // Clean up any existing files
      await this.cleanup();

      // Determine video dimensions
      const isPortrait = segment.imageUrl.includes('social_story_9_16');
      const dimensions = this.getVideoDimensions(isPortrait);
      const segmentFileName = `individual_${segment.id}.mp4`;

      console.log(`📐 Segment dimensions: ${dimensions.width}x${dimensions.height} (${isPortrait ? 'portrait' : 'landscape'})`);

      // Create video segment with captions
      await this.createVideoSegmentWithCaptions(segment, segmentFileName, isPortrait, dimensions, ttsResult, selectedFont);

      // Read the generated video
      const videoData = await this.ffmpeg!.readFile(segmentFileName);
      const videoBlob = new Blob([videoData], { type: 'video/mp4' });
      const videoUrl = URL.createObjectURL(videoBlob);

      console.log(`✅ Individual segment generated: ${(videoBlob.size / 1024 / 1024).toFixed(2)} MB`);

      // Return segment with video data
      return {
        ...segment,
        videoBlob,
        videoUrl
      };

    } catch (error) {
      console.error('❌ Individual segment generation failed:', error);
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Create a video segment from image and audio (NO captions) - FIXED PORTRAIT SCALING
   */
  private async createVideoSegment(
    segment: VideoSegment, 
    outputFileName: string, 
    isPortrait: boolean,
    dimensions: { width: number; height: number }
  ): Promise<void> {
    await this.waitForFFmpeg();

    // Define file names outside try block for cleanup
    const imageFileName = `image_${outputFileName.replace('.mp4', '.jpg')}`;
    const audioFileName = `audio_${outputFileName.replace('.mp4', '.mp3')}`;

    try {
      console.log(`🎬 Creating segment: ${outputFileName} (${dimensions.width}x${dimensions.height})`);
      console.log(`🖼️ Image URL: ${segment.imageUrl} (isPortrait: ${isPortrait})`);
      
      // Fetch image using shared cache
      const imageBlob = await fetchImageWithCache(segment.imageUrl, 'video creation');
      
      // Write files to FFmpeg - use unique names to avoid conflicts
      await this.ffmpeg!.writeFile(imageFileName, await fetchFile(imageBlob));
      await this.ffmpeg!.writeFile(audioFileName, await fetchFile(segment.audioBlob));

      // FIXED: Proper portrait video scaling - scale to exact dimensions
      let videoFilter: string;
      
      if (isPortrait) {
        // For portrait (1080x1920): scale to exactly 1080x1920
        videoFilter = `scale=1080:1920`;
      } else {
        // For landscape (1920x1080): scale to exactly 1920x1080
        videoFilter = `scale=1920:1080`;
      }

      const ffmpegArgs = [
        '-loop', '1',
        '-i', imageFileName,
        '-i', audioFileName,
        '-c:v', 'libx264',
        '-preset', 'veryfast', // Changed from 'fast' to 'veryfast' for speed
        '-crf', '30', // Changed from 25 to 30 for faster encoding
        '-c:a', 'aac',
        '-b:a', '96k', // Reduced from 128k to 96k for faster encoding
        '-pix_fmt', 'yuv420p',
        '-r', '30',
        '-ar', '44100',
        '-ac', '2',
        '-vf', videoFilter,
        '-s', `${dimensions.width}x${dimensions.height}`,
        '-shortest',
        '-t', segment.duration.toString(),
        '-y', outputFileName
      ];

      // Create video from image with audio
      const execPromise = this.ffmpeg!.exec(ffmpegArgs);
      
      console.log('🔄 FFmpeg processing started... (this may take a while)');
      await execPromise;
      console.log('✅ FFmpeg processing completed successfully');

      // Verify the segment was created
      const segmentData = await this.ffmpeg!.readFile(outputFileName);
      const size = typeof segmentData === 'string' ? segmentData.length : segmentData.byteLength;
      console.log(`✅ Created segment: ${outputFileName} (${(size / 1024).toFixed(1)} KB)`);
      
      // Clean up input files for this segment
      await this.ffmpeg!.deleteFile(imageFileName);
      await this.ffmpeg!.deleteFile(audioFileName);
      
    } catch (error) {
      console.error(`❌ Failed to create segment ${outputFileName}:`, error);
      
      // Clean up any files that might have been created
      try {
        await this.ffmpeg!.deleteFile(imageFileName);
        await this.ffmpeg!.deleteFile(audioFileName);
      } catch (cleanupError) {
        console.warn('⚠️ Cleanup failed:', cleanupError);
      }
      
      throw error;
    }
  }

  /**
   * Create a video segment from image and audio WITH captions using FFmpeg drawtext (FIXED)
   */
  private async createVideoSegmentWithCaptions(
    segment: VideoSegment, 
    outputFileName: string, 
    isPortrait: boolean,
    dimensions: { width: number; height: number },
    ttsResult: TTSResult,
    selectedFont?: string
  ): Promise<void> {
    await this.waitForFFmpeg();

    try {
      console.log(`🎬 Creating captioned segment: ${outputFileName} (${dimensions.width}x${dimensions.height})`);
      console.log(`🖼️ Image URL: ${segment.imageUrl} (isPortrait: ${isPortrait})`);
      
      // Fetch image using shared cache
      const imageBlob = await fetchImageWithCache(segment.imageUrl, 'video creation');
      
      // Use unique file names to avoid conflicts
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const imageFileName = `image_${timestamp}_${randomId}.jpg`;
      const audioFileName = `audio_${timestamp}_${randomId}.mp3`;
      
      // Write image and audio files to FFmpeg
      await this.ffmpeg!.writeFile(imageFileName, await fetchFile(imageBlob));
      await this.ffmpeg!.writeFile(audioFileName, await fetchFile(segment.audioBlob));

      // FIXED: Build proper video filter with scaling AND captions
      let baseVideoFilter: string;
      if (isPortrait) {
        // For portrait videos: scale to exactly 1080x1920
        baseVideoFilter = `scale=1080:1920`;
      } else {
        // For landscape videos: scale to exactly 1920x1080
        baseVideoFilter = `scale=1920:1080`;
      }

      // Create 3-word chunks from word timestamps
      console.log(`🔍 TTS Result word timestamps:`, ttsResult.wordTimestamps);
      console.log(`🔍 TTS Result word timestamps length:`, ttsResult.wordTimestamps.length);
      
      if (ttsResult.wordTimestamps.length === 0) {
        console.warn('⚠️ No word timestamps available, creating fallback captions');
        // Create fallback captions without timing
        const fallbackChunks = [{
          text: segment.text,
          startTime: 0,
          endTime: segment.duration
        }];
        const textFilter = await this.buildTimedTextFilter(fallbackChunks, dimensions);
        const combinedFilter = `${baseVideoFilter},${textFilter}`;
        
        const ffmpegArgs = [
          '-loop', '1',
          '-i', imageFileName,
          '-i', audioFileName,
          '-vf', combinedFilter,
          '-c:v', 'libx264',
          '-preset', 'fast',
          '-crf', '25',
          '-c:a', 'aac',
          '-b:a', '128k',
          '-pix_fmt', 'yuv420p',
          '-r', '30',
          '-ar', '44100',
          '-ac', '2',
          '-s', `${dimensions.width}x${dimensions.height}`,
          '-shortest',
          '-t', segment.duration.toString(),
          '-y', outputFileName
        ];

        console.log(`🎬 Creating video with fallback captions`);
        console.log(`🎬 FFmpeg command: ${ffmpegArgs.join(' ')}`);
        
        await this.ffmpeg!.exec(ffmpegArgs);
        return;
      }
      
      const threeWordChunks = this.createThreeWordChunks(ttsResult.wordTimestamps);
      console.log(`📝 Processing ${threeWordChunks.length} three-word chunks for timing`);
      console.log(`📝 Three-word chunks:`, threeWordChunks);
      
      // Build timed text filter using simplified approach
      const textFilter = await this.buildTimedTextFilter(threeWordChunks, dimensions, selectedFont);
      
      // Use simple filter chain for FFmpeg.wasm compatibility
      const combinedFilter = `${baseVideoFilter},${textFilter}`;
      
      const ffmpegArgs = [
        '-loop', '1',
        '-i', imageFileName,
        '-i', audioFileName,
        '-vf', combinedFilter,
        '-c:v', 'libx264',
        '-preset', 'veryfast', // Changed from 'fast' to 'veryfast' for speed
        '-crf', '30', // Changed from 25 to 30 for faster encoding (slightly lower quality but much faster)
        '-c:a', 'aac',
        '-b:a', '96k', // Reduced from 128k to 96k for faster encoding
        '-pix_fmt', 'yuv420p',
        '-r', '30',
        '-ar', '44100',
        '-ac', '2',
        '-s', `${dimensions.width}x${dimensions.height}`,
        '-shortest',
        '-t', segment.duration.toString(),
        '-y', outputFileName
      ];

      console.log(`🎬 Creating video with FFmpeg drawtext captions`);
      console.log(`🎬 FFmpeg command: ${ffmpegArgs.join(' ')}`);
      
      // Create video from image with audio and captions
      const execPromise = this.ffmpeg!.exec(ffmpegArgs);
      
      console.log('🔄 FFmpeg processing started... (this may take a while)');
      await execPromise;
      console.log('✅ FFmpeg processing completed successfully');

      // Verify the segment was created
      const segmentData = await this.ffmpeg!.readFile(outputFileName);
      const size = typeof segmentData === 'string' ? segmentData.length : segmentData.byteLength;
      console.log(`✅ Created captioned segment: ${outputFileName} (${(size / 1024).toFixed(1)} KB)`);
      
      // Check if the video file is actually valid
      if (size === 0) {
        throw new Error('Generated video file is empty');
      }
      
      // List files to debug
      try {
        const files = await this.ffmpeg!.listDir('/');
        console.log('📁 Files in FFmpeg filesystem after video creation:', files.map(f => f.name));
      } catch (error) {
        console.log('⚠️ Could not list files for debugging');
      }
      
      // Clean up input files for this segment
      await this.ffmpeg!.deleteFile(imageFileName);
      await this.ffmpeg!.deleteFile(audioFileName);
      
    } catch (error) {
      console.error(`❌ Failed to create captioned segment ${outputFileName}:`, error);
      console.error('❌ Error details:', error);
      console.error('❌ FFmpeg error - trying fallback without captions...');
      
      // Try FALLBACK: Just create the video without any text at all
      try {
        console.log('🔄 Attempting fallback without captions...');
        await this.createVideoSegment(segment, outputFileName, isPortrait, dimensions);
        console.log('✅ Fallback successful - created segment without captions');
      } catch (fallbackError) {
        console.error('❌ Even fallback failed:', fallbackError);
        throw new Error(`All methods failed for segment ${outputFileName}. Original error: ${error}`);
      }
    }
  }

    /**
   * Build simple text overlay (FFmpeg.wasm compatible without fonts)
   */
  private async buildTimedTextFilter(chunks: ThreeWordChunk[], dimensions: { width: number; height: number }, selectedFont?: string): Promise<string> {
    console.log('🎬 Building timed text filter with synchronization');
    
    console.log(`📝 Processing ${chunks.length} chunks for timing synchronization`);
    chunks.forEach((chunk, index) => {
      console.log(`📝 Chunk ${index + 1}: "${chunk.text}" (${chunk.startTime}s - ${chunk.endTime}s)`);
    });
    
    // Use a simple approach without custom fonts to avoid FFmpeg crashes
    console.log('🎬 Using basic drawtext filter without custom fonts');
    
    // Create multiple drawtext filters with timing constraints
    const drawtextFilters = await Promise.all(chunks.map(async (chunk, index) => {
      // Write text to a file to avoid escaping issues
      const textFileName = `text_${Date.now()}_${index}.txt`;
      await this.ffmpeg!.writeFile(textFileName, chunk.text);
      
      // Adjust font size and positioning based on video orientation
      let fontSize, yPosition;
      if (dimensions.height > dimensions.width) {
        // Portrait: smaller font, positioned higher for better spacing
        fontSize = 72;
        yPosition = (dimensions.height * 0.25) - 36; // 25% from top, centered
      } else {
        // Landscape: larger font, centered
        fontSize = 110;
        yPosition = (dimensions.height - 110) / 2;
      }
      
      // Use basic drawtext filter without fontfile parameter
      return `drawtext=textfile=${textFileName}:fontcolor=white:fontsize=${fontSize}:borderw=3:bordercolor=black:x=(w-text_w)/2:y=${yPosition}:enable='between(t,${chunk.startTime},${chunk.endTime})'`;
    }));
    
    // Join all filters with commas
    const combinedFilter = drawtextFilters.join(',');
    
    console.log(`🎬 Created ${drawtextFilters.length} timed drawtext filters`);
    console.log(`🎬 Combined filter: ${combinedFilter}`);
    
    return combinedFilter;
  }

  /**
   * Create ASS subtitle content for the captions
   */
  private createASSSubtitles(chunks: ThreeWordChunk[], dimensions: { width: number; height: number }): string {
    const fontSize = Math.max(Math.min(dimensions.width, dimensions.height) * 0.04, 32);
    
    let assContent = `[Script Info]
Title: AI Video Generator Captions
ScriptType: v4.00+
WrapStyle: 1
ScaledBorderAndShadow: yes
YCbCr Matrix: None
PlayResX: ${dimensions.width}
PlayResY: ${dimensions.height}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,sans-serif,${fontSize},&H00FFFFFF,&H000000FF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,3,1,2,10,10,80,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    chunks.forEach((chunk, index) => {
      const startTime = this.formatTime(chunk.startTime);
      const endTime = this.formatTime(chunk.endTime);
      const text = chunk.text.replace(/'/g, "\\'").replace(/:/g, "\\:");
      
      assContent += `Dialogue: 0,${startTime},${endTime},Default,,0,0,0,,${text}\n`;
    });

    console.log(`📝 Created ${chunks.length} subtitle entries`);
    console.log(`📝 Sample subtitle: ${chunks[0]?.text || 'No text'}`);
    console.log(`📝 Video dimensions: ${dimensions.width}x${dimensions.height}`);

    return assContent;
  }

  /**
   * Format time in ASS format (H:MM:SS.cc)
   */
  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const centiseconds = Math.floor((seconds % 1) * 100);
    
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  }

  /**
   * Write a video segment blob to FFmpeg filesystem
   */
  async writeSegmentToFFmpeg(segmentBlob: Blob, fileName: string): Promise<void> {
    await this.waitForFFmpeg();
    
    // Convert blob to array buffer
    const arrayBuffer = await segmentBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Write to FFmpeg filesystem
    await this.ffmpeg!.writeFile(fileName, uint8Array);
    console.log(`✅ Wrote segment to FFmpeg: ${fileName} (${(segmentBlob.size / 1024).toFixed(1)} KB)`);
  }

  /**
   * Concatenate all video segments into final video - ROBUST VERSION
   */
  async concatenateSegments(segmentFiles: string[]): Promise<Blob> {
    await this.waitForFFmpeg();

    try {
      console.log('🎬 Concatenating segments...');
      console.log('📁 Segment files to concatenate:', segmentFiles);
      
      // List all files in FFmpeg filesystem before concatenation
      try {
        const allFiles = await this.ffmpeg!.listDir('/');
        console.log('📁 All files in FFmpeg filesystem before concatenation:', allFiles.map(f => f.name));
      } catch (listError) {
        console.warn('⚠️ Could not list files for debugging:', listError);
      }
      
      // Verify all segment files exist before concatenating
      for (const segmentFile of segmentFiles) {
        try {
          const segmentData = await this.ffmpeg!.readFile(segmentFile);
          const size = typeof segmentData === 'string' ? segmentData.length : segmentData.byteLength;
          console.log(`✅ Segment file exists: ${segmentFile} (${(size / 1024).toFixed(1)} KB)`);
        } catch (error) {
          console.error(`❌ Missing segment file: ${segmentFile}`);
          throw new Error(`Missing segment file: ${segmentFile}`);
        }
      }
      
      // Create concat file
      const concatContent = segmentFiles.map(file => `file '${file}'`).join('\n');
      console.log('📝 Concat file content:', concatContent);
      await this.ffmpeg!.writeFile('concat.txt', concatContent);

      // Use robust concatenation approach with copy mode for speed
      const ffmpegArgs = [
        '-f', 'concat',
        '-safe', '0',
        '-i', 'concat.txt',
        '-c', 'copy', // Use copy mode instead of re-encoding
        '-y', 'final_video.mp4'
      ];

      console.log('🎬 FFmpeg concat command:', ffmpegArgs.join(' '));
      
      const execPromise = this.ffmpeg!.exec(ffmpegArgs);
      
      console.log('🔄 FFmpeg concatenation started... (this may take a while)');
      await execPromise;
      console.log('✅ FFmpeg concatenation completed successfully');

      // List files after concatenation to see what was created
      try {
        const filesAfter = await this.ffmpeg!.listDir('/');
        console.log('📁 Files in FFmpeg filesystem after concatenation:', filesAfter.map(f => f.name));
      } catch (listError) {
        console.warn('⚠️ Could not list files after concatenation:', listError);
      }

      // Read the final video
      const videoData = await this.ffmpeg!.readFile('final_video.mp4');
      const videoBlob = new Blob([videoData], { type: 'video/mp4' });
      
      console.log(`✅ Final video created: ${(videoBlob.size / 1024 / 1024).toFixed(2)} MB`);
      
      return videoBlob;
      
    } catch (error) {
      console.error('❌ Failed to concatenate segments:', error);
      
      // Try alternative concatenation method if first fails
      try {
        console.log('🔄 Trying alternative concatenation method...');
        return await this.concatenateSegmentsAlternative(segmentFiles);
      } catch (altError) {
        console.error('❌ Alternative concatenation also failed:', altError);
        throw error;
      }
    }
  }

  /**
   * Alternative concatenation method - ROBUST VERSION
   */
  private async concatenateSegmentsAlternative(segmentFiles: string[]): Promise<Blob> {
    try {
      console.log('🎬 Using alternative concatenation method...');
      
      // Verify segment files still exist
      for (const segmentFile of segmentFiles) {
        try {
          await this.ffmpeg!.readFile(segmentFile);
          console.log(`✅ Alt method - segment exists: ${segmentFile}`);
        } catch (error) {
          console.error(`❌ Alt method - missing segment: ${segmentFile}`);
          throw new Error(`Missing segment file for alternative method: ${segmentFile}`);
        }
      }
      
      // Create alternative concat file
      const concatContent = segmentFiles.map(file => `file '${file}'`).join('\n');
      await this.ffmpeg!.writeFile('concat_alt.txt', concatContent);

      // Use different FFmpeg settings
      const ffmpegArgs = [
        '-f', 'concat',
        '-safe', '0',
        '-i', 'concat_alt.txt',
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '30',
        '-c:a', 'aac',
        '-b:a', '96k',
        '-r', '30',
        '-pix_fmt', 'yuv420p',
        '-avoid_negative_ts', 'make_zero',
        '-fflags', '+genpts',
        '-y', 'final_video_alt.mp4'
      ];

      console.log('🎬 Alt FFmpeg command:', ffmpegArgs.join(' '));
      
      const execPromise = this.ffmpeg!.exec(ffmpegArgs);
      
      console.log('🔄 FFmpeg alternative concatenation started... (this may take a while)');
      await execPromise;
      console.log('✅ FFmpeg alternative concatenation completed successfully');

      const videoData = await this.ffmpeg!.readFile('final_video_alt.mp4');
      const videoBlob = new Blob([videoData], { type: 'video/mp4' });
      
      console.log(`✅ Alternative concatenation successful: ${(videoBlob.size / 1024 / 1024).toFixed(2)} MB`);
      
      return videoBlob;
      
    } catch (error) {
      console.error('❌ Alternative concatenation failed:', error);
      throw error;
    }
  }
}