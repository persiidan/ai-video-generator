'use client';

import { useState, useEffect } from 'react';

interface GoogleVoice {
  name: string;
  languageCodes: string[];
  ssmlGender: string;
  naturalSampleRateHertz: number;
}

interface VoiceSelectorProps {
  selectedVoice: string;
  onVoiceChange: (voice: string) => void;
  onValidationChange?: (isValid: boolean) => void;
}

export default function VoiceSelector({ selectedVoice, onVoiceChange, onValidationChange }: VoiceSelectorProps) {
  const [voices, setVoices] = useState<GoogleVoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVoices();
  }, []);

  // Notify parent component about validation state
  useEffect(() => {
    const isValid = selectedVoice !== '' && selectedVoice !== 'Select a voice...';
    onValidationChange?.(isValid);
  }, [selectedVoice, onValidationChange]);

  const fetchVoices = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/test-google-tts');
      if (!response.ok) {
        throw new Error('Failed to fetch voices');
      }
      
      const data = await response.json();
      
      if (data.success && data.groupedVoices) {
        // Combine all voices into a single array
        const allVoices: GoogleVoice[] = [
          ...data.groupedVoices.Standard.male,
          ...data.groupedVoices.Standard.female,
          ...data.groupedVoices.Chirp3_HD.male,
          ...data.groupedVoices.Chirp3_HD.female
        ];
        setVoices(allVoices);
      } else {
        throw new Error(data.error || 'Failed to fetch voices');
      }
    } catch (err: any) {
      console.error('Error fetching voices:', err);
      setError(err.message || 'Failed to fetch voices');
    } finally {
      setLoading(false);
    }
  };

  const formatVoiceName = (voice: GoogleVoice): string => {
    // Extract the actual voice name from the full name
    // Example: "en-US-Standard-A" -> "Standard A"
    const nameParts = voice.name.split('-');
    const voiceType = nameParts[nameParts.length - 2]; // "Standard" or "Chirp3-HD"
    const voiceLetter = nameParts[nameParts.length - 1]; // "A", "B", "C", etc.
    
    const gender = voice.ssmlGender === 'MALE' ? 'Male' : 'Female';
    return `${voiceType} ${voiceLetter} (${gender})`;
  };

  const getVoiceType = (voiceName: string): string => {
    if (voiceName.includes('Chirp3-HD')) return 'Chirp3-HD';
    if (voiceName.includes('Standard')) return 'Standard';
    return 'Unknown';
  };

  const getSampleRateSummary = () => {
    if (voices.length === 0) return '';
    
    // Count voices by type and gender
    const standardMale = voices.filter(v => v.name.includes('Standard') && v.ssmlGender === 'MALE').length;
    const standardFemale = voices.filter(v => v.name.includes('Standard') && v.ssmlGender === 'FEMALE').length;
    const chirp3Male = voices.filter(v => v.name.includes('Chirp3-HD') && v.ssmlGender === 'MALE').length;
    const chirp3Female = voices.filter(v => v.name.includes('Chirp3-HD') && v.ssmlGender === 'FEMALE').length;
    
    const parts = [];
    if (standardMale > 0) parts.push(`${standardMale} Standard Male`);
    if (standardFemale > 0) parts.push(`${standardFemale} Standard Female`);
    if (chirp3Male > 0) parts.push(`${chirp3Male} Chirp3-HD Male`);
    if (chirp3Female > 0) parts.push(`${chirp3Female} Chirp3-HD Female`);
    
    return `${voices.length} voices available (${parts.join(', ')})`;
  };

  if (loading) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">
          Voice Selection
        </label>
        <select 
          disabled 
          className="w-full p-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-700 text-gray-400"
        >
          <option>Loading voices...</option>
        </select>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">
          Voice Selection
        </label>
        <select 
          disabled 
          className="w-full p-3 border border-red-600 rounded-lg bg-gray-700 text-red-400"
        >
          <option>Error loading voices</option>
        </select>
        <p className="text-sm text-red-400 mt-1">{error}</p>
        <button 
          onClick={fetchVoices}
          className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-200 mb-2">
        Voice Selection
      </label>
      <select
        value={selectedVoice}
        onChange={(e) => onVoiceChange(e.target.value)}
        className="w-full p-3 border border-purple-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-800 text-white"
      >
        <option value="">Select a voice...</option>
        {voices.map((voice) => (
          <option key={voice.name} value={voice.name}>
            {formatVoiceName(voice)}
          </option>
        ))}
      </select>
      <p className="text-sm text-gray-400 mt-1">{getSampleRateSummary()}</p>
      {selectedVoice === '' && (
        <p className="text-sm text-yellow-400 mt-1">
          ⚠️ Please select a voice to enable video generation
        </p>
      )}
    </div>
  );
} 