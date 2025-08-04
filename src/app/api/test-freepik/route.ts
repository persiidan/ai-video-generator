import { NextResponse } from 'next/server';
import { freepikClient, apiRequest } from '@/utils/api';
import axios from 'axios';

export async function GET() {
  try {
    const apiKey = process.env.NEXT_PUBLIC_FREEPIK_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'Freepik API key not configured',
        message: 'Please add NEXT_PUBLIC_FREEPIK_API_KEY to your .env.local file'
      }, { status: 401 });
    }

    console.log('🔑 Testing Freepik API with key:', apiKey.substring(0, 10) + '...');

    // Try different APIs and authentication methods
    const testRequests = [
      // Method 1: Flux-dev API (original test)
      () => freepikClient.post('/ai/text-to-image/flux-dev', {
        prompt: 'A simple test image',
        aspect_ratio: 'widescreen_16_9'
      }),
      // Method 2: Google Imagen 3 API test
      () => freepikClient.post('/ai/text-to-image/imagen3', {
        prompt: 'A simple test image',
        num_images: 1,
        aspect_ratio: 'square_1_1',
        styling: {
          style: 'realistic',
          effects: {
            color: 'natural',
            lightning: 'natural',
            framing: 'portrait'
          }
        },
        person_generation: 'allow_adult',
        safety_settings: 'block_low_and_above'
      }),
      // Method 3: Using axios with Imagen 3
      () => axios.post('https://api.freepik.com/v1/ai/text-to-image/imagen3', {
        prompt: 'A simple test image',
        num_images: 1,
        aspect_ratio: 'square_1_1',
        styling: {
          style: 'anime',
          effects: {
            color: 'vibrant',
            lightning: 'warm',
            framing: 'portrait'
          }
        },
        person_generation: 'allow_adult',
        safety_settings: 'block_low_and_above'
      }, {
        headers: {
          'x-freepik-api-key': apiKey,
          'Content-Type': 'application/json'
        }
      }),
      // Method 4: Using Authorization header (fallback)
      () => axios.post('https://api.freepik.com/v1/ai/text-to-image/flux-dev', {
        prompt: 'A simple test image',
        aspect_ratio: 'widescreen_16_9'
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      })
    ];

    let lastError = null;
    const results = [];
    
    for (let i = 0; i < testRequests.length; i++) {
      try {
        console.log(`🔄 Testing method ${i + 1}...`);
        const response = await testRequests[i]();
        
        const methodName = i === 0 ? 'Flux-dev API' : 
                          i === 1 ? 'Google Imagen 3 API' :
                          i === 2 ? 'Google Imagen 3 API (axios)' :
                          'Flux-dev API (Bearer)';
        
        results.push({
          method: i + 1,
          name: methodName,
          success: true,
          response: response.data
        });
        
        console.log(`✅ ${methodName} successful`);
      } catch (error: any) {
        console.log(`❌ Method ${i + 1} failed:`, error.message, `(${error.response?.status})`);
        lastError = error;
        
        const methodName = i === 0 ? 'Flux-dev API' : 
                          i === 1 ? 'Google Imagen 3 API' :
                          i === 2 ? 'Google Imagen 3 API (axios)' :
                          'Flux-dev API (Bearer)';
        
        results.push({
          method: i + 1,
          name: methodName,
          success: false,
          error: error.message,
          status: error.response?.status
        });
      }
    }

    // Return results for all methods
    const successfulMethods = results.filter(r => r.success);
    
    if (successfulMethods.length > 0) {
      return NextResponse.json({
        success: true,
        message: `${successfulMethods.length} API method(s) working`,
        apiKeyConfigured: true,
        apiKey: apiKey.substring(0, 10) + '...',
        workingMethods: successfulMethods,
        allResults: results
      });
    }

    // If all methods failed, return the last error
    throw lastError;

  } catch (error: any) {
    console.error('Freepik API test error:', error);
    
    // Check if it's a 404 error (endpoint not found)
    if (error.status === 404) {
      return NextResponse.json({
        success: false,
        error: 'API endpoint not found',
        apiKeyConfigured: !!process.env.NEXT_PUBLIC_FREEPIK_API_KEY,
        message: 'The Freepik API endpoint is not accessible. This might be because:',
        suggestions: [
          'The API is in beta and not publicly available yet',
          'The endpoint structure has changed',
          'The API requires different authentication',
          'The API key format is incorrect'
        ],
        apiKey: process.env.NEXT_PUBLIC_FREEPIK_API_KEY ? process.env.NEXT_PUBLIC_FREEPIK_API_KEY.substring(0, 10) + '...' : 'Not configured',
        nextSteps: [
          'Check the latest Freepik API documentation',
          'Verify your API key format',
          'Contact Freepik support for access'
        ]
      }, { status: 404 });
    }
    
    // Check if it's an authentication error
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json({
        success: false,
        error: 'Authentication failed',
        apiKeyConfigured: !!process.env.NEXT_PUBLIC_FREEPIK_API_KEY,
        message: 'Invalid API key or authentication failed. This could be because:',
        suggestions: [
          'The API key format is incorrect',
          'The API key has expired',
          'The API key doesn\'t have the required permissions',
          'The authentication method is wrong'
        ],
        apiKey: process.env.NEXT_PUBLIC_FREEPIK_API_KEY ? process.env.NEXT_PUBLIC_FREEPIK_API_KEY.substring(0, 10) + '...' : 'Not configured',
        nextSteps: [
          'Check your API key format (should start with FPSX...)',
          'Verify the API key is active in your Freepik dashboard',
          'Ensure the API key has image generation permissions',
          'Contact Freepik support for API access'
        ]
      }, { status: 401 });
    }
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      apiKeyConfigured: !!process.env.NEXT_PUBLIC_FREEPIK_API_KEY,
      message: 'Failed to connect to Freepik API',
      status: error.status || 'unknown',
      apiKey: process.env.NEXT_PUBLIC_FREEPIK_API_KEY ? process.env.NEXT_PUBLIC_FREEPIK_API_KEY.substring(0, 10) + '...' : 'Not configured'
    }, { status: 500 });
  }
} 