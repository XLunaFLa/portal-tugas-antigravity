import { NextRequest, NextResponse } from 'next/server';
import { solveWithDualEngine, cleanMathAndTypography, ImagePart } from '@/lib/gemini';
import { uploadImageBuffer, saveRecord } from '@/lib/supabase';

export const maxDuration = 60; // Allow sufficient time for multimodal reasoning

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      prompt_text = '', 
      images = [], 
      documents = [],
      type = 'kuis', 
      engine = 'auto', 
      model = 'ag/gemini-3.8-flash-high' 
    } = body;

    let combinedPrompt = prompt_text;
    if (Array.isArray(documents) && documents.length > 0) {
      for (const doc of documents) {
        if (doc && doc.text) {
          combinedPrompt += `\n\n=== LAMPIRAN DOKUMEN TUGAS: ${doc.fileName || 'File Tugas'} ===\n${doc.text}\n=== AKHIR DOKUMEN ===\n`;
        }
      }
    }

    if (!combinedPrompt.trim() && (!images || images.length === 0)) {
      return NextResponse.json(
        { error: 'Harap berikan soal teks, upload dokumen tugas, atau upload gambar screenshot kuis.' },
        { status: 400 }
      );
    }

    // Format images for inlineData
    const imageParts: ImagePart[] = [];
    const imageUploadPromises: Promise<string | null>[] = [];

    if (Array.isArray(images) && images.length > 0) {
      for (const img of images) {
        const rawBase64 = (img.base64 || img.data || '') as string;
        if (!rawBase64) continue;
        const cleanBase64 = rawBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
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
    const { answer: rawAnswer, usedEngine } = await solveWithDualEngine(
      combinedPrompt, 
      imageParts, 
      engine, 
      model
    );

    // Thoroughly clean formulas and eliminate monologue slop
    const answer = cleanMathAndTypography(rawAnswer);

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
      const firstDocName = Array.isArray(documents) && documents.length > 0 ? documents[0]?.fileName : null;
      const previewTitle = prompt_text 
        ? (prompt_text.slice(0, 45) + (prompt_text.length > 45 ? '...' : '')) 
        : firstDocName
          ? `File: ${firstDocName.slice(0, 40)}`
          : `Kuis Gambar (${imageParts.length} Soal)`;

      savedData = await saveRecord({
        type: type === 'diskusi' ? 'diskusi' : 'kuis',
        title: previewTitle,
        prompt_text: combinedPrompt,
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
