'use client';

import { useState } from 'react';

export default function TestFreepik() {
  const [testResult, setTestResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const testFreepikAPI = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/test-freepik');
      const data = await response.json();
      setTestResult(data);
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Freepik API Test</h1>
        
        <div className="mb-6">
          <button
            onClick={testFreepikAPI}
            disabled={isLoading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600"
          >
            {isLoading ? 'Testing...' : 'Test Freepik API Connection'}
          </button>
        </div>

        {testResult && (
          <div className={`p-6 rounded-lg border ${
            testResult.success 
              ? 'bg-green-900 border-green-600' 
              : 'bg-red-900 border-red-600'
          }`}>
            <h2 className="text-xl font-semibold mb-4">
              {testResult.success ? '✅ Success' : '❌ Error'}
            </h2>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-8 p-4 bg-yellow-900 border border-yellow-700 rounded-lg">
          <h3 className="font-medium text-yellow-200 mb-2">Setup Instructions</h3>
          <p className="text-sm text-yellow-300 mb-2">
            To test the Freepik API integration:
          </p>
          <ol className="text-sm text-yellow-300 list-decimal list-inside space-y-1">
            <li>Sign up for a Freepik API account at <a href="https://www.freepik.com/developers" className="text-blue-300 hover:underline">https://www.freepik.com/developers</a></li>
            <li>Get your API key from the dashboard</li>
            <li>Add <code className="bg-gray-800 px-1 rounded">NEXT_PUBLIC_FREEPIK_API_KEY=your_api_key_here</code> to your <code className="bg-gray-800 px-1 rounded">.env.local</code> file</li>
            <li>Click the test button above</li>
          </ol>
        </div>

        <div className="mt-6 p-4 bg-blue-900 border border-blue-700 rounded-lg">
          <h3 className="font-medium text-blue-200 mb-2">Troubleshooting</h3>
          <p className="text-sm text-blue-300 mb-2">
            If you're getting 404 errors, it might be because:
          </p>
          <ul className="text-sm text-blue-300 list-disc list-inside space-y-1">
            <li>The Freepik API is still in beta and not publicly available</li>
            <li>The API endpoints have changed</li>
            <li>Your API key doesn't have the required permissions</li>
            <li>The API requires different authentication methods</li>
          </ul>
          <p className="text-sm text-blue-300 mt-2">
            <strong>Next Steps:</strong> Contact Freepik support or check their latest documentation for API access.
          </p>
        </div>

        <div className="mt-6 p-4 bg-gray-800 border border-gray-700 rounded-lg">
          <h3 className="font-medium text-gray-200 mb-2">Alternative Solutions</h3>
          <p className="text-sm text-gray-300 mb-2">
            If Freepik API is not available, consider these alternatives:
          </p>
          <ul className="text-sm text-gray-300 list-disc list-inside space-y-1">
            <li><strong>Hugging Face:</strong> Free tier with various image generation models</li>
            <li><strong>Stability AI:</strong> Professional image generation API</li>
            <li><strong>Replicate:</strong> Platform with multiple AI models</li>
            <li><strong>Local Models:</strong> Run image generation locally</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 