'use client';

import { useState, useEffect } from 'react';

interface GoogleVoice {
  name: string;
  languageCodes: string[];
  ssmlGender: 'MALE' | 'FEMALE' | 'NEUTRAL';
  naturalSampleRateHertz: number;
}

interface GroupedVoices {
  Standard: {
    male: GoogleVoice[];
    female: GoogleVoice[];
  };
  Chirp3_HD: {
    male: GoogleVoice[];
    female: GoogleVoice[];
  };
}

export default function TestVoicesPage() {
  const [voiceData, setVoiceData] = useState<{
    totalVoices: number;
    englishVoices: number;
    groupedVoices: GroupedVoices;
    allVoices: GoogleVoice[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVoicesDirectly();
  }, []);

  const fetchVoicesDirectly = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Direct call to Google TTS API
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_TTS_API_KEY;
      
      if (!apiKey) {
        setError('Google TTS API key not configured. Please set NEXT_PUBLIC_GOOGLE_TTS_API_KEY in your .env.local file.');
        setLoading(false);
        return;
      }

      const response = await fetch(
        `https://texttospeech.googleapis.com/v1/voices?key=${apiKey}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const allVoices: GoogleVoice[] = data.voices || [];
      
      // Filter for English voices (Standard and Chirp3-HD)
      const englishVoices = allVoices.filter(voice => {
        const supportsEnglish = voice.languageCodes.includes('en-US');
        const isStandard = voice.name.includes('Standard');
        const isChirp3HD = voice.name.includes('Chirp3-HD');
        return supportsEnglish && (isStandard || isChirp3HD);
      });
      
      // Group voices by type and gender
      const groupedVoices: GroupedVoices = {
        Standard: {
          male: englishVoices.filter(v => v.name.includes('Standard') && v.ssmlGender === 'MALE'),
          female: englishVoices.filter(v => v.name.includes('Standard') && v.ssmlGender === 'FEMALE')
        },
        Chirp3_HD: {
          male: englishVoices.filter(v => v.name.includes('Chirp3-HD') && v.ssmlGender === 'MALE'),
          female: englishVoices.filter(v => v.name.includes('Chirp3-HD') && v.ssmlGender === 'FEMALE')
        }
      };

      setVoiceData({
        totalVoices: allVoices.length,
        englishVoices: englishVoices.length,
        groupedVoices,
        allVoices: englishVoices
      });
      
    } catch (err: any) {
      setError(err.message || 'Failed to fetch voices');
    } finally {
      setLoading(false);
    }
  };

  const renderVoiceList = (voices: GoogleVoice[], title: string) => (
    <div key={title} className="mb-6">
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      {voices.length === 0 ? (
        <p className="text-gray-400 text-sm">No voices available</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {voices.map((voice) => (
            <div key={voice.name} className="bg-gray-700 p-3 rounded-lg">
              <div className="text-white font-medium text-sm">{voice.name}</div>
              <div className="text-gray-300 text-xs mt-1">
                Gender: {voice.ssmlGender}
              </div>
              <div className="text-gray-300 text-xs">
                Sample Rate: {voice.naturalSampleRateHertz}Hz
              </div>
              <div className="text-gray-400 text-xs mt-1">
                Languages: {voice.languageCodes.join(', ')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gray-800 rounded-xl shadow-lg p-6">
            <h1 className="text-2xl font-bold text-white mb-4">Testing Google TTS Voices</h1>
            <div className="text-center">
              <div className="text-blue-400">Loading voices...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gray-800 rounded-xl shadow-lg p-6">
            <h1 className="text-2xl font-bold text-white mb-4">Testing Google TTS Voices</h1>
            <div className="bg-red-900 border border-red-600 rounded-lg p-4">
              <h3 className="text-red-200 font-semibold mb-2">Error</h3>
              <p className="text-red-300">{error}</p>
              <button 
                onClick={fetchVoicesDirectly}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-white">Available Google TTS Voices</h1>
            <button 
              onClick={fetchVoicesDirectly}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>

          {voiceData && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="bg-gray-700 p-4 rounded-lg">
                <h2 className="text-lg font-semibold text-white mb-2">Summary</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="text-gray-300">
                    <span className="font-medium">Total Voices:</span> {voiceData.totalVoices}
                  </div>
                  <div className="text-gray-300">
                    <span className="font-medium">English Voices:</span> {voiceData.englishVoices}
                  </div>
                  <div className="text-gray-300">
                    <span className="font-medium">Status:</span> 
                    <span className="text-green-400 ml-1">✓ API Connected</span>
                  </div>
                </div>
              </div>

              {/* Standard Voices */}
              <div>
                <h2 className="text-xl font-bold text-white mb-4">Standard Voices</h2>
                {renderVoiceList(voiceData.groupedVoices.Standard.male, 'Male Standard Voices')}
                {renderVoiceList(voiceData.groupedVoices.Standard.female, 'Female Standard Voices')}
              </div>

              {/* Chirp3-HD Voices */}
              <div>
                <h2 className="text-xl font-bold text-white mb-4">Chirp3-HD Voices</h2>
                {renderVoiceList(voiceData.groupedVoices.Chirp3_HD.male, 'Male Chirp3-HD Voices')}
                {renderVoiceList(voiceData.groupedVoices.Chirp3_HD.female, 'Female Chirp3-HD Voices')}
              </div>

              {/* All Voices List */}
              <div>
                <h2 className="text-xl font-bold text-white mb-4">All English Voices</h2>
                <div className="bg-gray-700 p-4 rounded-lg max-h-96 overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {voiceData.allVoices.map((voice) => (
                      <div key={voice.name} className="bg-gray-600 p-2 rounded text-xs">
                        <div className="text-white font-medium">{voice.name}</div>
                        <div className="text-gray-300">{voice.ssmlGender}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 