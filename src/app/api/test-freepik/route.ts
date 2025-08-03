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

    // Try different authentication methods based on the documentation
    const testRequests = [
      // Method 1: Using x-freepik-api-key header (official method from docs)
      () => freepikClient.post('/ai/text-to-image/flux-dev', {
        prompt: 'A simple test image',
        aspect_ratio: 'widescreen_16_9'
      }),
      // Method 2: Using x-freepik-api-key header with axios
      () => axios.post('https://api.freepik.com/v1/ai/text-to-image/flux-dev', {
        prompt: 'A simple test image',
        aspect_ratio: 'social_story_9_16'
      }, {
        headers: {
          'x-freepik-api-key': apiKey,
          'Content-Type': 'application/json'
        }
      }),
      // Method 3: Using Authorization header (fallback)
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
    
    for (let i = 0; i < testRequests.length; i++) {
      try {
        console.log(`🔄 Testing method ${i + 1}...`);
        const response = await testRequests[i]();
        
        // Enhanced response analysis
        const responseAnalysis = {
          hasData: !!response.data,
          dataKeys: response.data ? Object.keys(response.data) : [],
          dataType: typeof response.data,
          fullResponse: response.data,
          status: response.status,
          headers: response.headers
        };
        
        console.log('📊 Response analysis:', responseAnalysis);
        
        return NextResponse.json({
          success: true,
          message: `Freepik API connection successful with method ${i + 1}`,
          apiKeyConfigured: true,
          apiKey: apiKey.substring(0, 10) + '...',
          method: i + 1,
          response: response.data,
          analysis: responseAnalysis
        });
      } catch (error: any) {
        console.log(`❌ Method ${i + 1} failed:`, error.message, `(${error.response?.status})`);
        console.log('❌ Error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message
        });
        lastError = error;
      }
    }

    // If all methods failed, return the last error
    throw lastError;

  } catch (error: any) {
    console.error('Freepik API test error:', error);
    
    // Check if it's a 404 error (endpoint not found)
    if (error.response?.status === 404) {
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
    if (error.response?.status === 401 || error.response?.status === 403) {
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
      status: error.response?.status || 'unknown',
      apiKey: process.env.NEXT_PUBLIC_FREEPIK_API_KEY ? process.env.NEXT_PUBLIC_FREEPIK_API_KEY.substring(0, 10) + '...' : 'Not configured',
      errorDetails: {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      }
    }, { status: 500 });
  }
} 