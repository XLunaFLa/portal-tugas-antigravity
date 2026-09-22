import { NextRequest, NextResponse } from 'next/server';
import { parseDocumentBuffer } from '@/lib/fileParser';

export const maxDuration = 45;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fileName = 'dokumen', mimeType = '', base64 = '' } = body;

    if (!base64) {
      return NextResponse.json({ error: 'Tidak ada data file yang dikirim.' }, { status: 400 });
    }

    const cleanBase64 = base64.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    const result = await parseDocumentBuffer(buffer, fileName, mimeType);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    console.error('Error in /api/parse-file:', err);
    return NextResponse.json(
      { error: err.message || 'Gagal membaca isi dokumen.' },
      { status: 500 }
    );
  }
}
