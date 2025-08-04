import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  let purpose = 'unknown';
  
  try {
    const { imageUrl, purpose: requestPurpose = 'unknown' } = await request.json();
    purpose = requestPurpose;

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    }

    // Validate URL format - accept both HTTP URLs and data URLs
    if (typeof imageUrl !== 'string') {
      return NextResponse.json({ 
        error: `Invalid image URL format for ${purpose}: ${imageUrl}` 
      }, { status: 400 });
    }

    // Handle data URLs (base64 encoded images)
    if (imageUrl.startsWith('data:')) {
      try {
        // Extract the base64 data from the data URL
        const matches = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (!matches) {
          return NextResponse.json({ 
            error: `Invalid data URL format for ${purpose}: ${imageUrl}` 
          }, { status: 400 });
        }

        const [, contentType, base64Data] = matches;
        
        // Decode base64 to get the binary data
        const binaryData = Buffer.from(base64Data, 'base64');
        
        console.log(`✅ Data URL processed successfully for ${purpose}:`, contentType, binaryData.length, 'bytes');

        return NextResponse.json({
          success: true,
          imageData: base64Data, // Return the base64 data as-is
          contentType,
          size: binaryData.length
        });
      } catch (error: any) {
        console.error(`❌ Error processing data URL for ${purpose}:`, error);
        return NextResponse.json(
          { error: `Failed to process data URL for ${purpose}: ${error.message}` },
          { status: 400 }
        );
      }
    }

    // Handle HTTP URLs
    if (!imageUrl.startsWith('http')) {
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