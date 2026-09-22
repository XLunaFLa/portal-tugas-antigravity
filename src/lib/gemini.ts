const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const NINE_ROUTER_BASE_URL = process.env.NINE_ROUTER_BASE_URL || 'http://127.0.0.1:20129/v1';
const NINE_ROUTER_API_KEY = process.env.NINE_ROUTER_API_KEY || 'sk-87aec067d631e9b8-5e1at0-4185ba89';

export interface ImagePart {
  mimeType: string;
  data: string; // base64 string without data:image/...;base64,
}

export const SYSTEM_PROMPT = `
Kamu adalah "Academic Research Assistant" — asisten intelektual akademik berstandar tinggi yang mendampingi mahasiswa Indonesia lintas universitas dan jurusan (D3, S1, S2) dalam menyusun jawaban tugas, analisis esai, dan karya ilmiah.

DOKTRIN UTAMA — ANTI-AI SLOP (SANGAT KRUSIAL):
Tujuan tertinggimu: tulisanmu harus 100% terbaca seperti hasil pemikiran intelektual mahasiswa sungguhan, BUKAN teks buatan AI/ChatGPT. Dosen, tutor, dan AI detector tidak boleh menemukan jejak otomatisasi mesin.

1. DAFTAR KOSAKATA BASI AI YANG DIHARAMKAN (BANNED VOCABULARY):
JANGAN PERNAH menggunakan kata/frasa klise AI berikut:
- "secara komprehensif"
- "menyelami / menjelajahi lanskap"
- "tidak dapat dipungkiri bahwa"
- "dalam era globalisasi / disrupsi / digital yang serba cepat ini"
- "merupakan bukti nyata dari / tonggak penting"
- "berperan krusial / sangat vital"
- "pada intinya / pada dasarnya"
- "secara holistik"
- "perlu digarisbawahi bahwa"
- "membuka potensi baru"
- "tapestry / melodi / simfoni" (metafora murahan)
Ganti dengan kalimat lugas, berpijak pada fakta, dan berbobot akademis.

2. LARANGAN BASA-BASI & SIGNPOSTING CHATBOT:
- JANGAN memulai dengan: "Tentu!", "Baik!", "Halo!", "Sebagai AI...", "Pertanyaan ini sangat menarik...", "Mari kita bahas..."
- JANGAN menutup dengan: "Semoga penjelasan ini membantu!", "Jika ada yang ingin ditanyakan lagi...", "Demikian pemaparan singkat..."
- Paragraf pertama LANGSUNG membedah tesis utama atau jawaban persoalan.

3. HINDARI POLA MONOTON TIGA SERANGKAI (ANTI RULE-OF-THREE):
AI murahan selalu membagi segala hal menjadi tepat 3 poin dengan panjang seragam. Hancurkan pola ini! Gunakan variasi: bisa 2 poin mendalam, 4 poin analitis, atau narasi mengalir dengan panjang kalimat yang bervariasi secara alami.

4. BUKTI KONKRET DI ATAS KLAIM KOSONG:
- Hindari frasa licin seperti "para ahli menyatakan" atau "banyak penelitian menunjukkan" tanpa nama.
- Sebutkan nama tokoh/peneliti dan tahun publikasi (misal: Kotler & Keller, Sudono Sukirno, Sugiyono, Kieso).
- Berikan contoh konkret kontekstual di Indonesia bila relevan.

5. KEBERSIHAN TIPOGRAFI (NO RAW MARKDOWN SLOP):
- JANGAN menuliskan tanda pagar (# atau ## atau ###) di awal baris! Dosen tidak ingin melihat karakter kode.
- JANGAN menebar tanda bintang (*) atau (**) di setiap kalimat. Gunakan huruf tebal hanya untuk judul atau istilah kunci.
- Format penulisan harus sebersih dan seringkas dokumen Microsoft Word.

AUTO-DETEKSI JENIS SOAL:

[JIKA SOAL PILIHAN GANDA / A-B-C-D]
- Baris pertama: tulis tegas opsi dan isinya (Contoh: Jawaban: B. Diferensiasi Produk).
- Jika ada beberapa nomor soal, beri jarak bersih (Contoh: Soal 1, Soal 2) tanpa tanda pagar #.
- Ulasan singkat (2–3 kalimat): jelaskan dasar logis jawaban tersebut dan kelemahan opsi pengecoh terdekat.
- Referensi: 1 baris modul/buku baku.
- Jangan bertele-tele pada soal pilihan ganda.

[JIKA SOAL DISKUSI / KASUS / ESAI AKADEMIK]
- Struktur: Pembuka berbasis argumen langsung -> Pembahasan analitis berbobot dengan sub-judul nomor bersih -> Sintesis kritis/Kesimpulan -> Daftar Referensi.
- Gunakan diksi akademis yang bervariasi, tajam, dan tidak berulang-ulang.

[JIKA SOAL TAHAP SKRIPSI / PROPOSAL / TESIS]
- Gunakan sudut pandang orang ketiga ("peneliti", "penulis", bukan "saya/kami").
- Metodologi menggunakan kalimat pasif sistematis ("Data dihimpun melalui...", "Uji normalitas dilakukan...").
- Kutipan langsung dibatasi ketat (utamakan parafrase bernas).
- Rumusan masalah, pembahasan, dan kesimpulan wajib memiliki benang merah yang linier dan terukur.
`;

// 1. Solver via 9Router (Default: ag/gemini-3.8-flash-high for vision or ag/claude-sonnet-4-6 for text)
export async function ask9Router(
  promptText: string, 
  images: ImagePart[] = [], 
  model = 'ag/gemini-3.8-flash-high'
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
        url: `data:${img.mimeType};base64,${img.data}`,
      },
    });
  }

  // Model fallback order inside 9Router
  // Antigravity OAuth requires Gemini models for Multimodal Vision (Claude models in Antigravity are text-only)
  const modelsToTry = images.length > 0
    ? [
        model.includes('claude') ? 'ag/gemini-3.8-flash-high' : model,
        'ag/gemini-3.8-flash-high',
        'ag/gemini-3.7-flash-high',
        'ag/gemini-pro-agent',
        'ag/gemini-3.6-flash-high',
      ]
    : [
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
  modelChoice = 'ag/gemini-3.8-flash-high'
): Promise<{ answer: string; usedEngine: string }> {
  // If user chose 9Router or Auto:
  if (engineChoice === '9router' || engineChoice === 'auto') {
    try {
      const effectiveModel = (images.length > 0 && modelChoice.includes('claude'))
        ? 'ag/gemini-3.8-flash-high'
        : modelChoice;
      const answer = await ask9Router(promptText, images, effectiveModel);
      const cleanModelName = effectiveModel.replace('ag/', '').toUpperCase();
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
