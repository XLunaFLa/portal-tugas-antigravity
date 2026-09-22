const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const NINE_ROUTER_BASE_URL = process.env.NINE_ROUTER_BASE_URL || 'http://127.0.0.1:20129/v1';
const NINE_ROUTER_API_KEY = process.env.NINE_ROUTER_API_KEY || 'sk-87aec067d631e9b8-5e1at0-4185ba89';

export interface ImagePart {
  mimeType: string;
  data: string; // base64 string without data:image/...;base64,
}

export const SYSTEM_PROMPT = `
Kamu adalah "Antigravity Academic Assistant", asisten kecerdasan buatan cerdas yang khusus mendampingi mahasiswa (khususnya mahasiswa perguruan tinggi dan Universitas Terbuka/UT) dalam menyelesaikan tugas perkuliahan, kuis online, dan forum diskusi akademik.

Pedoman Menjawab Kuis Pilihan Ganda (Berdasarkan Gambar / Tangkapan Layar):
1. Berikan OPSI JAWABAN YANG TEPAT secara tegas dan jelas di baris paling awal dengan format tebal (Contoh: "Jawaban yang tepat adalah: **Segmentasi pasar**").
2. Jika ada beberapa gambar/soal sekaligus, buatkan pemisah yang rapi untuk tiap nomor soal (Contoh: "### Soal 1", "### Soal 2").
3. Berikan "Penjelasan Singkat" dengan poin-poin yang mudah dipahami, berbobot, dan mengulas mengapa opsi tersebut tepat serta bila perlu mengulas mengapa opsi pengecoh lainnya salah.
4. Akhiri selalu dengan "Referensi:" yang menyertakan sumber baku (misalnya Modul BMP Universitas Terbuka terkait seperti EKMA4216, EKMA4153, EKMA4312, atau buku teks standar seperti Kotler & Keller, Kieso, Robbins & Judge, dll.) tanpa deskripsi bertele-tele di bawah daftar referensi.

Pedoman Menjawab Soal Diskusi / Esai:
1. Jawab secara analitis, mendalam, namun terstruktur rapi menggunakan gaya mahasiswa teladan (bukan gaya robotik AI).
2. Gunakan sub-judul, penomoran, atau poin-poin agar dosen atau tutor mudah membaca dan memberi nilai maksimal.
3. Sertakan referensi teoretis atau modul di bagian bawah.
4. Jaga agar bahasa tetap baku, akademis, dan sopan dalam bahasa Indonesia yang baik dan benar.
`;

// 1. Solver via 9Router (Default: ag/claude-sonnet-4-6 or ag/gemini-3.8-flash-high)
export async function ask9Router(
  promptText: string, 
  images: ImagePart[] = [], 
  model = 'ag/claude-sonnet-4-6'
): Promise<string> {
  const contentParts: any[] = [];

  const fullText = promptText && promptText.trim().length > 0 
    ? `${SYSTEM_PROMPT}\n\nPertanyaan/Tugas Mahasiswa:\n${promptText}`
    : `${SYSTEM_PROMPT}\n\nSilakan baca soal pada gambar di bawah ini, lalu berikan jawaban yang tepat dan penjelasan singkat beserta referensinya:`;

  contentParts.push({ type: 'text', text: fullText });

  for (const img of images) {
    contentParts.push({
      type: 'image_url',
      image_url: {
        url: `data:${img.mimeType};base64,{img.data}`.replace('{img.data}', img.data),
      },
    });
  }

  // Model fallback order inside 9Router
  const modelsToTry = [
    model,
    'ag/claude-sonnet-4-6',
    'ag/gemini-3.8-flash-high',
    'ag/claude-opus-4-6-thinking',
    'ag/gemini-3.6-flash-high',
  ];
  const uniqueModels = Array.from(new Set(modelsToTry));

  let lastError: any = null;

  for (const targetModel of uniqueModels) {
    try {
      const payload = {
        model: targetModel,
        messages: [
          {
            role: 'user',
            content: contentParts,
          },
        ],
        stream: false,
        temperature: 0.2,
      };

      const response = await fetch(`${NINE_ROUTER_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${NINE_ROUTER_API_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`9Router [${targetModel}] error ${response.status}: ${errorBody}`);
      }

      const result = await response.json();
      const answer = result.choices?.[0]?.message?.content;

      if (!answer) {
        throw new Error(`9Router [${targetModel}] mengembalikan respons kosong.`);
      }

      return answer;
    } catch (err: any) {
      console.warn(`9Router model ${targetModel} attempt failed:`, err.message);
      lastError = err;
    }
  }

  throw new Error(`Semua model 9Router gagal. Error terakhir: ${lastError?.message || 'Unknown error'}`);
}

// 2. Solver via Google Gemini Cloud Direct (Official Google API)
export async function askGemini(
  promptText: string, 
  images: ImagePart[] = [], 
  preferredModel = 'gemini-3.8-flash'
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY belum dikonfigurasi.');
  }

  const modelsToTry = [
    'gemini-3.5-flash',
    preferredModel, 
    'gemini-3.6-flash', 
    'gemini-3.7-flash',
    'gemini-3.8-flash'
  ];
  const uniqueModels = Array.from(new Set(modelsToTry));

  let lastError: any = null;

  for (const model of uniqueModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const parts: any[] = [];

      const fullText = promptText && promptText.trim().length > 0 
        ? `${SYSTEM_PROMPT}\n\nPertanyaan/Tugas Mahasiswa:\n${promptText}`
        : `${SYSTEM_PROMPT}\n\nSilakan baca soal pada gambar di bawah ini, lalu berikan jawaban yang tepat dan penjelasan singkat beserta referensinya:`;

      parts.push({ text: fullText });

      for (const img of images) {
        parts.push({
          inlineData: {
            mimeType: img.mimeType,
            data: img.data,
          },
        });
      }

      const payload = {
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.2,
          topP: 0.95,
          maxOutputTokens: 3000,
        },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Model ${model} returned ${response.status}: ${errorBody}`);
      }

      const result = await response.json();
      const candidate = result.candidates?.[0];
      const answer = candidate?.content?.parts?.[0]?.text;

      if (!answer) {
        throw new Error(`Empty response from model ${model}`);
      }

      return answer;
    } catch (err: any) {
      lastError = err;
    }
  }

  throw new Error(`All Gemini models failed: ${lastError?.message || 'Unknown error'}`);
}

// 3. Smart Dual-Engine Orchestrator with Auto-Fallback
export async function solveWithDualEngine(
  promptText: string,
  images: ImagePart[] = [],
  engineChoice = 'auto', // 'auto' | '9router' | 'gemini'
  modelChoice = 'ag/claude-sonnet-4-6'
): Promise<{ answer: string; usedEngine: string }> {
  // If user chose 9Router or Auto:
  if (engineChoice === '9router' || engineChoice === 'auto') {
    try {
      const answer = await ask9Router(promptText, images, modelChoice);
      const cleanModelName = modelChoice.replace('ag/', '').toUpperCase();
      return { answer, usedEngine: `9Router [${cleanModelName}] (10 Akun Antigravity)` };
    } catch (err: any) {
      console.warn('9Router failed or unreachable, falling back to Google Cloud Direct...', err.message);
      if (engineChoice === '9router') {
        throw new Error(`9Router tidak dapat dihubungi (${err.message}). Pastikan 9Router atau Tunnel di PC aktif.`);
      }
    }
  }

  // Fallback to Google Gemini Cloud Direct
  const answer = await askGemini(promptText, images, 'gemini-3.5-flash');
  return { answer, usedEngine: 'Google Gemini 3.5 Flash (Cloud Direct)' };
}
