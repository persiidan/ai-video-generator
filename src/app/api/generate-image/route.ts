import { NextResponse } from 'next/server';
import { freepikClient } from '@/utils/api';
import { AspectRatio } from '@/types';

export interface GenerateImageRequest {
  text: string;
  style: 'Realistic' | 'Cartoon';
  aspectRatio: AspectRatio;
}

export interface GenerateImageResponse {
  id: string;
  imageUrl: string;
  prompt: string;
  style: string;
  chunkText: string;
}

export async function POST(request: Request) {
  try {
    const body: GenerateImageRequest = await request.json();
    
    console.log('🎨 Server-side image generation request:', {
      text: body.text,
      style: body.style,
      aspectRatio: body.aspectRatio
    });

    // Create a prompt based on the text and style
    const prompt = createImagePrompt(body.text, body.style, body.aspectRatio);
    console.log('🎨 Generated prompt:', prompt);

    // Step 1: Submit the generation request
    const response = await freepikClient.post('/ai/text-to-image/flux-dev', {
      prompt: prompt,
      aspect_ratio: body.aspectRatio
    });

    console.log('🎨 Freepik initial response:', JSON.stringify(response.data, null, 2));

    // Check if we got a task_id (asynchronous workflow)
    const apiResponse = response.data;
    if (apiResponse && apiResponse.data && apiResponse.data.task_id) {
      const taskId = apiResponse.data.task_id;
      console.log('🎨 Task created with ID:', taskId);
      
      // Step 2: Poll the task status until completion
      let imageUrl = await pollTaskStatus(taskId);
      
      if (!imageUrl) {
        throw new Error('Image generation failed: Task completed but no image URL found');
      }

      console.log('✅ Successfully generated image URL:', imageUrl);

      const result: GenerateImageResponse = {
        id: `img-${Date.now()}`,
        imageUrl: imageUrl,
        prompt: prompt,
        style: body.style,
        chunkText: body.text
      };

      return NextResponse.json(result);
    } else {
      // Handle synchronous response (if any)
      throw new Error('Invalid response structure from Freepik API: No task_id received');
    }

  } catch (error: any) {
    console.error('❌ Server-side image generation failed:', error);
    
    // Enhanced error logging
    if (error.response?.data) {
      console.error('❌ API Error details:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers
      });
    }
    
    // Check for specific error types
    let errorMessage = error.message || 'Unknown error';
    let statusCode = 500;
    
    if (error.response?.status === 401 || error.response?.status === 403) {
      errorMessage = 'Authentication failed. Please check your Freepik API key.';
      statusCode = 401;
    } else if (error.response?.status === 404) {
      errorMessage = 'Freepik API endpoint not found. The API might be in beta or the endpoint has changed.';
      statusCode = 404;
    } else if (error.response?.status === 429) {
      errorMessage = 'Rate limit exceeded. Please try again later.';
      statusCode = 429;
    }
    
    return NextResponse.json(
      {
        error: 'Image generation failed',
        message: errorMessage,
        details: error.response?.data || error.request || error,
        status: error.response?.status
      },
      { status: statusCode }
    );
  }
}

/**
 * Poll the task status until completion
 */
async function pollTaskStatus(taskId: string): Promise<string | null> {
  const maxAttempts = 30; // 30 seconds max
  const pollInterval = 1000; // 1 second
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      console.log(`🔄 Polling task status (attempt ${attempt + 1}/${maxAttempts})...`);
      
      const statusResponse = await freepikClient.get(`/ai/text-to-image/flux-dev/${taskId}`);
      const statusData = statusResponse.data;
      
      console.log('📊 Task status response:', JSON.stringify(statusData, null, 2));
      
      if (statusData && statusData.data) {
        const taskData = statusData.data;
        
        if (taskData.status === 'COMPLETED') {
          // Task completed, extract image URL
          if (taskData.generated && Array.isArray(taskData.generated) && taskData.generated.length > 0) {
            const imageData = taskData.generated[0];
            // Handle both string URLs and object URLs
            if (typeof imageData === 'string') {
              // URL is directly a string in the array
              return imageData;
            } else if (imageData && typeof imageData === 'object' && imageData.url) {
              // URL is in an object with url property
              return imageData.url;
            }
          }
          // If no URL found in generated array, try other possible locations
          if (taskData.url) {
            return taskData.url;
          }
          if (taskData.data && taskData.data.url) {
            return taskData.data.url;
          }
          console.error('❌ Task completed but no image URL found in response');
          return null;
        } else if (taskData.status === 'FAILED') {
          throw new Error(`Image generation failed: ${taskData.error || 'Unknown error'}`);
        } else if (taskData.status === 'CREATED' || taskData.status === 'IN_PROGRESS') {
          // Task is still processing, wait and try again
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          continue;
        } else {
          console.log(`⏳ Task status: ${taskData.status}, waiting...`);
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          continue;
        }
      } else {
        console.error('❌ Invalid task status response structure');
        return null;
      }
    } catch (error: any) {
      console.error(`❌ Error polling task status (attempt ${attempt + 1}):`, error.message);
      if (attempt === maxAttempts - 1) {
        throw new Error(`Failed to poll task status after ${maxAttempts} attempts: ${error.message}`);
      }
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }
  
  throw new Error(`Task did not complete within ${maxAttempts} seconds`);
}

/**
 * Create an image prompt based on the text and selected style
 */
function createImagePrompt(text: string, style: 'Realistic' | 'Cartoon', aspectRatio: AspectRatio): string {
  // Clean and prepare the text
  const cleanText = text.trim().replace(/[^\w\s.,!?-]/g, '');
  
  // Create a descriptive prompt based on the style and aspect ratio
  const formatText = aspectRatio === 'widescreen_16_9' 
    ? 'widescreen horizontal composition' 
    : 'vertical portrait composition';
  
  if (style === 'Realistic') {
    return `A realistic, high-quality photograph depicting: ${cleanText}. Professional photography style, detailed, natural lighting, sharp focus, photorealistic, ${formatText}.`;
  } else {
    return `A colorful cartoon illustration showing: ${cleanText}. Animated style, vibrant colors, clean lines, friendly and engaging, cartoon aesthetic, ${formatText}.`;
  }
} 