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
