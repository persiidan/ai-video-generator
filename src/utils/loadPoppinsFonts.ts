// 🎯 GOAL: Use custom Poppins fonts (Regular, Medium, SemiBold, Bold) with ffmpeg.wasm to render styled text in the browser.

export async function loadPoppinsFonts(ffmpeg: any) {
  const fontFiles = [
    { source: 'Poppins-Regular.ttf', target: 'poppins-regular.ttf' },
    { source: 'Poppins-Medium.ttf', target: 'poppins-medium.ttf' },
    { source: 'Poppins-SemiBold.ttf', target: 'poppins-semibold.ttf' },
    { source: 'Poppins-Bold.ttf', target: 'poppins-bold.ttf' },
  ];

  console.log('🎨 Loading Poppins fonts into FFmpeg.wasm...');

  for (const fontFile of fontFiles) {
    try {
      const res = await fetch(`/fonts/${fontFile.source}`);
      if (!res.ok) throw new Error(`Font not found: ${fontFile.source}`);
      const buffer = await res.arrayBuffer();
      const data = new Uint8Array(buffer);
      
      // Use the correct FFmpeg.wasm v0.12.x API with lowercase filename
      ffmpeg.writeFile(fontFile.target, data);
      console.log(`✅ Loaded font: ${fontFile.source} -> ${fontFile.target} (${(buffer.byteLength / 1024).toFixed(1)} KB)`);
    } catch (error) {
      console.error(`❌ Failed to load font ${fontFile.source}:`, error);
      throw error;
    }
  }

  // Debug: List files in MEMFS to confirm fonts are loaded
  try {
    const files = ffmpeg.listDir('/');
    console.log('📁 Files in FFmpeg MEMFS:', files);
  } catch (error) {
    console.error('❌ Could not list MEMFS files:', error);
  }

  console.log('✅ All Poppins fonts loaded successfully');
} 