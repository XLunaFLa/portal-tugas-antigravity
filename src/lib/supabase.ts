import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rhkjcroiowurnzxdgfvp.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

// Client for public / browser usage
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }),
  },
});

// Admin client for backend API routes (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }),
  },
});

export interface TugasRecord {
  id?: string;
  created_at?: string;
  type: 'kuis' | 'diskusi';
  title?: string;
  prompt_text?: string;
  image_urls?: string[];
  answer_text: string;
  course_category?: string;
}

export async function uploadImageBuffer(buffer: Buffer, mimeType: string): Promise<string | null> {
  try {
    const ext = mimeType.split('/')[1] || 'png';
    const fileName = `tugas-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
    
    const { data, error } = await supabaseAdmin.storage
      .from('tugas-files')
      .upload(fileName, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      console.warn('Storage upload warning:', error.message);
      return null;
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from('tugas-files')
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  } catch (err) {
    console.warn('Failed to upload image to Supabase:', err);
    return null;
  }
}

export async function saveRecord(record: TugasRecord) {
  try {
    const { data, error } = await supabaseAdmin
      .from('tugas_records')
      .insert([
        {
          type: record.type,
          title: record.title || 'Tugas Kuliah',
          prompt_text: record.prompt_text || '',
          image_urls: record.image_urls || [],
          answer_text: record.answer_text,
          course_category: record.course_category || 'Umum',
        },
      ])
      .select()
      .single();

    if (error) {
      console.warn('Supabase DB notice:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn('DB save fallback:', err);
    return null;
  }
}
