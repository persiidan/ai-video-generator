export interface FontConfig {
  id: string;
  name: string;
  file: string;
  weight: string;
  category: 'sans-serif' | 'serif' | 'display';
}

export const availableFonts: FontConfig[] = [
  {
    id: 'poppins-regular',
    name: 'Poppins Regular',
    file: 'Poppins-Regular.ttf',
    weight: '400',
    category: 'sans-serif'
  },
  {
    id: 'poppins-medium',
    name: 'Poppins Medium',
    file: 'Poppins-Medium.ttf',
    weight: '500',
    category: 'sans-serif'
  },
  {
    id: 'poppins-semibold',
    name: 'Poppins SemiBold',
    file: 'Poppins-SemiBold.ttf',
    weight: '600',
    category: 'sans-serif'
  },
  {
    id: 'poppins-bold',
    name: 'Poppins Bold',
    file: 'Poppins-Bold.ttf',
    weight: '700',
    category: 'sans-serif'
  }
];

export function getFontById(id: string): FontConfig | undefined {
  return availableFonts.find(font => font.id === id);
}

export function getDefaultFont(): FontConfig {
  return availableFonts[0]; // Poppins Regular
} 