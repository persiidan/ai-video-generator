import { NextResponse } from 'next/server';
import { freepikClient, apiRequest } from '@/utils/api';
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

// Helper function to poll Imagen3 task status
async function pollImagen3Task(taskId: string, maxAttempts: number = 30): Promise<any> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`🎨 Polling Imagen3 task ${taskId}, attempt ${attempt}/${maxAttempts}`);
      
      const response = await apiRequest(
        () => freepikClient.get(`/ai/text-to-image/imagen3/${taskId}`),
        'Failed to get task status'
      ) as any;
      
      console.log('🎨 Task status response:', JSON.stringify(response.data, null, 2));
      
      // The status is in response.data.data.status (nested structure)
      const taskData = response.data?.data;
      if (!taskData) {
        console.error('❌ No task data found in response');
        throw new Error('Invalid response structure - no task data');
      }
      
      // Check for different possible status field names in the nested data
      const status = taskData.status || taskData.task_status || taskData.state;
      console.log(`🎨 Detected status: ${status}`);
      
      if (status === 'COMPLETED' || status === 'completed') {
        console.log('✅ Task completed successfully!');
        return taskData; // Return the nested task data
      } else if (status === 'FAILED' || status === 'failed') {
        throw new Error(`Imagen3 task failed: ${taskData.error || 'Unknown error'}`);
      } else if (status === 'IN_PROGRESS' || status === 'in_progress' || status === 'processing') {
        console.log('🔄 Task in progress, waiting...');
        // Wait 2 seconds before next poll
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      } else if (status === 'CREATED' || status === 'created') {
        console.log('⏳ Task still in created status, waiting...');
        // Wait 2 seconds before next poll
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      } else {
        console.log(`❓ Unknown status: ${status}, treating as in progress...`);
        // Wait 2 seconds before next poll
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }
    } catch (error: any) {
      console.error(`❌ Error polling attempt ${attempt}:`, error.message);
      
      if (attempt === maxAttempts) {
        throw error;
      }
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  throw new Error('Task polling timeout - image generation took too long');
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

    // Use Google Imagen 3 API with minimal required parameters
    const requestBody = {
      prompt: prompt,
      num_images: 1,
      aspect_ratio: mapAspectRatio(body.aspectRatio)
    };

    console.log('🎨 Sending Imagen3 API request:', requestBody);

    // Step 1: Create the Imagen3 task
    const response = await apiRequest(
      () => freepikClient.post('/ai/text-to-image/imagen3', requestBody),
      'Image generation failed'
    ) as any;

    console.log('🎨 Freepik Imagen3 initial response:', response);

    // Handle Imagen3 API response structure
    let taskId: string;
    
    if (response.data && response.data.task_id) {
      // Direct task_id in response
      taskId = response.data.task_id;
      console.log('🎨 Imagen3 task created with ID:', taskId);
    } else if (response.data && response.data.data && response.data.data.task_id) {
      // Nested task_id in response (this is what we're getting)
      taskId = response.data.data.task_id;
      console.log('🎨 Imagen3 task created with ID (nested):', taskId);
    } else if (response.data && response.data.images && response.data.images.length > 0) {
      // Fallback to direct image response (if API returns images directly)
      const imageUrl = response.data.images[0].url;
      
      const result: GenerateImageResponse = {
        id: `img-${Date.now()}`,
        imageUrl: imageUrl,
        prompt: prompt,
        style: body.style,
        chunkText: body.text
      };
      return NextResponse.json(result);
    } else {
      console.error('❌ Unexpected response structure:', response.data);
      throw new Error('Invalid response structure from Freepik Imagen3 API');
    }

    // Step 2: Poll for the task completion
    const taskResult = await pollImagen3Task(taskId);
    console.log('🎨 Imagen3 task completed:', taskResult);
    
    // Extract the generated image URL with better debugging
    console.log('🔍 Extracting image URL from task result...');
    console.log('🔍 Task result structure:', JSON.stringify(taskResult, null, 2));
    
    let imageUrl: string;
    
    // Try different possible locations for the image URL
    // The generated array is directly in taskResult (not nested)
    if (taskResult.generated && Array.isArray(taskResult.generated) && taskResult.generated.length > 0) {
      const firstGenerated = taskResult.generated[0];
      imageUrl = typeof firstGenerated === 'string' ? firstGenerated : firstGenerated.url;
      console.log('✅ Found image URL in taskResult.generated:', imageUrl);
    } else if (taskResult.images && Array.isArray(taskResult.images) && taskResult.images.length > 0) {
      imageUrl = taskResult.images[0].url;
      console.log('✅ Found image URL in taskResult.images:', imageUrl);
    } else if (taskResult.data && taskResult.data.images && Array.isArray(taskResult.data.images) && taskResult.data.images.length > 0) {
      imageUrl = taskResult.data.images[0].url;
      console.log('✅ Found image URL in taskResult.data.images:', imageUrl);
    } else if (taskResult.data && taskResult.data.generated && Array.isArray(taskResult.data.generated) && taskResult.data.generated.length > 0) {
      const firstGenerated = taskResult.data.generated[0];
      imageUrl = typeof firstGenerated === 'string' ? firstGenerated : firstGenerated.url;
      console.log('✅ Found image URL in taskResult.data.generated:', imageUrl);
    } else if (taskResult.url) {
      imageUrl = taskResult.url;
      console.log('✅ Found image URL in taskResult.url:', imageUrl);
    } else if (taskResult.data && taskResult.data.url) {
      imageUrl = taskResult.data.url;
      console.log('✅ Found image URL in taskResult.data.url:', imageUrl);
    } else {
      console.error('❌ No image URL found in task result. Available keys:', Object.keys(taskResult));
      if (taskResult.data) {
        console.error('❌ taskResult.data keys:', Object.keys(taskResult.data));
      }
      throw new Error('No generated images found in task result');
    }

    if (!imageUrl) {
      throw new Error('Image URL is empty or undefined');
    }

    console.log('🎯 Final image URL:', imageUrl);

    const result: GenerateImageResponse = {
      id: taskId,
      imageUrl: imageUrl,
      prompt: prompt,
      style: body.style,
      chunkText: body.text
    };

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('❌ Server-side image generation failed:', error);
    
    // Log the detailed error information for debugging
    if (error.response?.data) {
      console.error('❌ Validation error details:', JSON.stringify(error.response.data, null, 2));
      
      // Log the specific invalid parameters if available
      if (error.response.data.invalid_params) {
        console.error('❌ Invalid parameters:', JSON.stringify(error.response.data.invalid_params, null, 2));
      }
    }
    
    return NextResponse.json(
      {
        error: 'Image generation failed',
        message: error.message || 'Unknown error',
        details: error.response?.data || error.request || error
      },
      { status: 500 }
    );
  }
}

/**
 * Map aspect ratios to Imagen3 API format
 */
function mapAspectRatio(aspectRatio: AspectRatio): string {
  switch (aspectRatio) {
    case 'widescreen_16_9':
      return 'widescreen_16_9';
    case 'social_story_9_16':
      return 'social_story_9_16';
    default:
      return 'square_1_1'; // Default to square for Imagen3
  }
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