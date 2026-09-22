import { NextRequest, NextResponse } from 'next/server';
import { solveWithDualEngine, ImagePart } from '@/lib/gemini';
import { uploadImageBuffer, saveRecord } from '@/lib/supabase';

export const maxDuration = 60; // Allow sufficient time for multimodal reasoning

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      prompt_text = '', 
      images = [], 
      type = 'kuis', 
      engine = 'auto', 
      model = 'ag/gemini-3.8-flash-high' 
    } = body;

    if (!prompt_text && (!images || images.length === 0)) {
      return NextResponse.json(
        { error: 'Harap berikan soal teks atau upload gambar screenshot kuis.' },
        { status: 400 }
      );
    }

    // Format images for inlineData
    const imageParts: ImagePart[] = [];
    const imageUploadPromises: Promise<string | null>[] = [];

    if (Array.isArray(images) && images.length > 0) {
      for (const img of images) {
        const cleanBase64 = img.base64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
        const mimeType = img.mimeType || 'image/png';

        imageParts.push({
          mimeType,
          data: cleanBase64,
        });

        // Concurrently upload to Supabase storage
        try {
          const buffer = Buffer.from(cleanBase64, 'base64');
          imageUploadPromises.push(uploadImageBuffer(buffer, mimeType));
        } catch {
          // ignore upload failure, proceed with AI answer
        }
      }
    }

    // Call Dual-Engine (9Router Antigravity OAuth with Google Cloud Fallback)
    const { answer, usedEngine } = await solveWithDualEngine(
      prompt_text, 
      imageParts, 
      engine, 
      model
    );

    // Collect uploaded image URLs
    const uploadedUrls: string[] = [];
    try {
      const results = await Promise.allSettled(imageUploadPromises);
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value) {
          uploadedUrls.push(r.value);
        }
      }
    } catch {
      // ignore
    }

    // Save task record to Supabase
    let savedData = null;
    try {
      const previewTitle = prompt_text 
        ? (prompt_text.slice(0, 45) + (prompt_text.length > 45 ? '...' : '')) 
        : `Kuis Gambar (${imageParts.length} Soal)`;

      savedData = await saveRecord({
        type: type === 'diskusi' ? 'diskusi' : 'kuis',
        title: previewTitle,
        prompt_text,
        image_urls: uploadedUrls,
        answer_text: answer,
        course_category: usedEngine,
      });
    } catch (e) {
      console.warn('Error saving to DB:', e);
    }

    return NextResponse.json({
      success: true,
      answer,
      usedEngine,
      image_urls: uploadedUrls,
      record: savedData,
    });
  } catch (error: any) {
    console.error('API /api/solve error:', error);
    return NextResponse.json(
      { error: error.message || 'Terjadi kendala saat memproses jawaban.' },
      { status: 500 }
    );
  }
}
