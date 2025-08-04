'use client';

import { FontType } from '@/types';
import { availableFonts, FontConfig } from '@/config/fonts';

interface FontSelectorProps {
  selectedFont: FontType;
  onFontChange: (font: FontType) => void;
}

export default function FontSelector({ selectedFont, onFontChange }: FontSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-200 mb-2">
        Caption Font
      </label>
      <select
        value={selectedFont}
        onChange={(e) => onFontChange(e.target.value as FontType)}
        className="w-full p-3 border border-purple-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-800 text-white"
      >
        {availableFonts.map((font) => (
          <option key={font.id} value={font.id}>
            {font.name}
          </option>
        ))}
      </select>
      <p className="text-sm text-gray-400 mt-1">
        Font used for video captions
      </p>
    </div>
  );
} 