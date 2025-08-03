'use client';

import { useEffect, useRef } from 'react';

interface CaptionOverlayProps {
  text: string;
  isPortrait: boolean;
  width: number;
  height: number;
  onLoad?: (canvas: HTMLCanvasElement) => void;
}

export default function CaptionOverlay({ 
  text, 
  isPortrait, 
  width, 
  height, 
  onLoad 
}: CaptionOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate font size based on video dimensions
    const baseFontSize = Math.min(width, height) * 0.04; // 4% of smaller dimension
    const fontSize = Math.max(baseFontSize, 24); // Minimum 24px

    // Set font properties
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Calculate text position (center of screen)
    const x = width / 2;
    const y = height / 2;

    // Split text into lines if too long
    const maxCharsPerLine = Math.floor(width / (fontSize * 0.6)); // Approximate character width
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + ' ' + word).length <= maxCharsPerLine) {
        currentLine = currentLine ? currentLine + ' ' + word : word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);

    // Draw text with black outline
    ctx.strokeStyle = 'black';
    ctx.lineWidth = fontSize * 0.1; // 10% of font size for outline thickness
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // Draw outline for each line
    lines.forEach((line, index) => {
      const lineY = y + (index - (lines.length - 1) / 2) * fontSize * 1.2;
      ctx.strokeText(line, x, lineY);
    });

    // Draw white text
    ctx.fillStyle = 'white';
    lines.forEach((line, index) => {
      const lineY = y + (index - (lines.length - 1) / 2) * fontSize * 1.2;
      ctx.fillText(line, x, lineY);
    });

    // Notify parent component that canvas is ready
    if (onLoad) {
      onLoad(canvas);
    }
  }, [text, width, height, isPortrait, onLoad]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'contain'
      }}
    />
  );
} 