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
      const { error } = await supabaseAdmin
        .from('tugas_records')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) {
        throw new Error(error.message);
      }

      return NextResponse.json({ success: true, message: 'Semua riwayat tugas berhasil dihapus.' });
    }

    if (!id) {
      return NextResponse.json(
        { error: 'ID riwayat diperlukan untuk menghapus.' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('tugas_records')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true, message: 'Riwayat tugas berhasil dihapus.' });
  } catch (error: any) {
    console.error('Delete history error:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal menghapus riwayat.' },
      { status: 500 }
    );
  }
}
