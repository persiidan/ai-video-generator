import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  let purpose = 'unknown';
  
  try {
    const { imageUrl, purpose: requestPurpose = 'unknown' } = await request.json();
    purpose = requestPurpose;

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    }

    // Validate URL format
    if (typeof imageUrl !== 'string' || !imageUrl.startsWith('http')) {
      return NextResponse.json({ 
        error: `Invalid image URL format for ${purpose}: ${imageUrl}` 
      }, { status: 400 });
    }

    console.log(`🖼️ Fetching image for ${purpose}:`, imageUrl);

    // Fetch the image from the external URL
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image for ${purpose}: ${response.status} ${response.statusText}`);
    }

    // Get the image as a blob
    const imageBlob = await response.blob();
    
    // Validate blob
    if (imageBlob.size === 0) {
      throw new Error(`Empty image blob received for ${purpose}`);
    }
    
    // Convert blob to base64 for transmission
    const arrayBuffer = await imageBlob.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    
    // Get the content type
    const contentType = imageBlob.type || 'image/jpeg';

    console.log(`✅ Image fetched successfully for ${purpose}:`, contentType, imageBlob.size, 'bytes');

    return NextResponse.json({
      success: true,
      imageData: base64,
      contentType,
      size: imageBlob.size
    });

  } catch (error: any) {
    console.error(`❌ Error fetching image for ${purpose}:`, error);
    return NextResponse.json(
      { error: `Failed to fetch image for ${purpose}: ${error.message}` },
      { status: 500 }
    );
  }
} 