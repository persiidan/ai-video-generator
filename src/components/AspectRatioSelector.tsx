'use client';

import { AspectRatio } from '@/types';

interface AspectRatioSelectorProps {
  selectedAspectRatio: AspectRatio;
  onAspectRatioChange: (aspectRatio: AspectRatio) => void;
}

export default function AspectRatioSelector({ selectedAspectRatio, onAspectRatioChange }: AspectRatioSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-200 mb-2">
        Aspect Ratio
      </label>
      <div className="grid grid-cols-2 gap-3">
        {/* Landscape Option */}
        <button
          onClick={() => onAspectRatioChange('widescreen_16_9')}
          className={`p-4 rounded-lg border-2 transition-all duration-200 ${
            selectedAspectRatio === 'widescreen_16_9'
              ? 'border-purple-500 bg-purple-900/20'
              : 'border-gray-600 bg-gray-700 hover:border-gray-500'
          }`}
        >
          <div className="flex flex-col items-center space-y-2">
            {/* Visual representation of landscape */}
                         <div className="w-16 h-10 bg-gradient-to-r from-purple-400 to-purple-600 rounded border border-gray-300 flex items-center justify-center">
              <div className="w-12 h-6 bg-white/20 rounded-sm"></div>
            </div>
            <div className="text-center">
              <div className="text-white font-medium text-sm">Landscape</div>
              <div className="text-gray-400 text-xs">16:9</div>
            </div>
          </div>
        </button>

        {/* Portrait Option */}
        <button
          onClick={() => onAspectRatioChange('social_story_9_16')}
          className={`p-4 rounded-lg border-2 transition-all duration-200 ${
            selectedAspectRatio === 'social_story_9_16'
              ? 'border-purple-500 bg-purple-900/20'
              : 'border-gray-600 bg-gray-700 hover:border-gray-500'
          }`}
        >
          <div className="flex flex-col items-center space-y-2">
            {/* Visual representation of portrait */}
                         <div className="w-10 h-16 bg-gradient-to-b from-purple-400 to-purple-600 rounded border border-gray-300 flex items-center justify-center">
              <div className="w-6 h-12 bg-white/20 rounded-sm"></div>
            </div>
            <div className="text-center">
              <div className="text-white font-medium text-sm">Portrait</div>
              <div className="text-gray-400 text-xs">9:16</div>
            </div>
          </div>
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-2">
        {selectedAspectRatio === 'widescreen_16_9' 
          ? 'Horizontal video format for YouTube, TV, and desktop viewing' 
          : 'Vertical video format for social media, mobile, and stories'
        }
      </p>
    </div>
  );
} 