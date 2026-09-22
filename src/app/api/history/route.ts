import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('tugas_records')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.warn('History fetch error from Supabase:', error.message);
      return NextResponse.json(
        { success: true, history: [] },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
        }
      );
    }

    return NextResponse.json(
      { success: true, history: data || [] },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (error: any) {
    console.warn('History API catch error:', error);
    return NextResponse.json(
      { success: true, history: [] },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { id, all } = body;

    if (all) {
      // 1. Delete all image files from Supabase Storage bucket
      try {
        const { data: fileList } = await supabaseAdmin.storage
          .from('tugas-files')
          .list('', { limit: 1000 });

        if (fileList && fileList.length > 0) {
          const fileNames = fileList.map((f) => f.name);
          await supabaseAdmin.storage.from('tugas-files').remove(fileNames);
        }
      } catch (storageErr) {
        console.warn('Storage cleanup warning:', storageErr);
      }

      // 2. Delete all records from database table
      const { error } = await supabaseAdmin
        .from('tugas_records')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) {
        throw new Error(error.message);
      }

      return NextResponse.json({
        success: true,
        message: 'Semua riwayat tugas dan file gambar di Storage berhasil dibersihkan.',
      });
    }

    if (!id) {
      return NextResponse.json(
        { error: 'ID riwayat diperlukan untuk menghapus.' },
        { status: 400 }
      );
    }

    // 1. Remove associated image files from Supabase Storage bucket
    try {
      const { data: record } = await supabaseAdmin
        .from('tugas_records')
        .select('image_urls')
        .eq('id', id)
        .single();

      if (record && Array.isArray(record.image_urls) && record.image_urls.length > 0) {
        const fileNames = record.image_urls
          .map((url: string) => {
            const parts = url.split('/tugas-files/');
            return parts.length > 1 ? decodeURIComponent(parts[1]) : null;
          })
          .filter(Boolean) as string[];

        if (fileNames.length > 0) {
          await supabaseAdmin.storage.from('tugas-files').remove(fileNames);
        }
      }
    } catch (storageErr) {
      console.warn('Storage single file removal warning:', storageErr);
    }

    // 2. Remove database row
    const { error } = await supabaseAdmin
      .from('tugas_records')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Riwayat tugas dan file gambar di Storage berhasil dihapus.',
    });
  } catch (error: any) {
    console.error('Delete history error:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal menghapus riwayat.' },
      { status: 500 }
    );
  }
}
