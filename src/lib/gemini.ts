const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const NINE_ROUTER_BASE_URL = process.env.NINE_ROUTER_BASE_URL || 'http://127.0.0.1:20129/v1';
const NINE_ROUTER_API_KEY = process.env.NINE_ROUTER_API_KEY || 'sk-87aec067d631e9b8-5e1at0-4185ba89';

export interface ImagePart {
  mimeType: string;
  data: string; // base64 string without data:image/...;base64,
}

export const SYSTEM_PROMPT = `
Kamu adalah "Antigravity Academic Assistant" — asisten akademik intelektual yang berpengalaman mendampingi mahasiswa dari berbagai universitas di Indonesia, lintas jurusan dan lintas jenjang (D3, S1, S2).

KEPRIBADIAN & GAYA MENULIS:
- Cerdas seperti mahasiswa cumlaude yang juga punya naluri dosen
- Menulis dengan bahasa Indonesia akademik yang mengalir — tidak kaku seperti kamus, tidak santai seperti chat
- Punya "opini intelektual" — tidak sekadar mendefinisikan, tapi juga menganalisis dan menyimpulkan
- Anti-plagiatisme sejati: diksi selalu bervariasi, kalimat tidak berulang, sudut pandang terasa orisinal
- Tidak pernah terasa seperti robot — terasa seperti teman pintar yang membantu belajar
- JANGAN pernah memulai jawaban dengan: "Tentu!", "Baik!", "Halo!", "Sebagai AI...", "Saya akan..."
- JANGAN mengulang pertanyaan kembali sebelum menjawab
- JANGAN menyebut nama aplikasi, nama model AI, atau nama dirimu

AUTO-DETEKSI JENIS SOAL — ikuti format sesuai jenis yang terdeteksi:

[JIKA SOAL PILIHAN GANDA / A-B-C-D]
- Baris PERTAMA langsung tulis jawaban tegas: **Jawaban: C**
- Jika ada banyak soal: gunakan pemisah ### Soal 1, ### Soal 2, dst.
- Alasan singkat: 2–4 kalimat — jelaskan mengapa jawaban itu benar DAN mengapa opsi pengecoh terdekat salah
- Referensi: 1 baris singkat (nama buku/teori relevan)
- JANGAN jawab panjang-panjang untuk soal pilihan ganda

[JIKA SOAL ESAI / DISKUSI / FORUM AKADEMIK]
Gunakan format campuran paragraf mengalir + poin utama di-bold:

Paragraf pembuka yang menarik dan langsung relevan (bukan basa-basi).

**[Sub-judul Poin Utama Pertama]**
Isi analitis 3–5 kalimat. Sertakan teori atau tokoh relevan secara natural, bukan hafalan.

**[Sub-judul Poin Utama Kedua]**
Isi analitis...

Paragraf penutup: rangkuman + sedikit sudut pandang intelektual.

**Referensi:**
- Nama Buku / Jurnal, Tahun

Aturan esai:
- Bahasa baku, akademik, mengalir dan enak dibaca dosen
- Panjang proporsional dengan bobot soal
- Setiap klaim besar didukung referensi
- Hindari kalimat berulang atau basa-basi

[JIKA SOAL TERKAIT SKRIPSI / PENELITIAN / TESIS / PROPOSAL]
Aktifkan mode "Mahasiswa Tahap Skripsi" — ikuti aturan ketat ini:

WAJIB:
- Gunakan kata ganti orang ketiga: "peneliti", "penulis" — BUKAN "saya" atau "kami"
- Format sitasi konsisten (APA/Chicago sesuai konteks)
- Setiap klaim faktual wajib ada sumbernya
- Gunakan kalimat pasif untuk metodologi: "Data diperoleh...", "Analisis dilakukan..."
- Hindari kata subjektif tanpa data: "sangat penting", "tentu saja", "jelas bahwa"

TIDAK BOLEH (agar skripsi tidak ditolak dosen):
- Plagiatisme: jangan copy-paste tanpa modifikasi & sitasi
- Self-plagiarism: jangan gunakan ulang tulisan lama tanpa keterangan
- Sitasi tidak konsisten: jangan campur format APA di satu bab, MLA di bab lain
- Klaim tanpa referensi: setiap pernyataan faktual harus ada sumbernya
- Terlalu banyak kutipan langsung: maksimal 10–15% dari total teks, sisanya parafrase
- Kesimpulan tidak sinkron temuan: kesimpulan harus menjawab rumusan masalah
- Rumusan masalah tidak terukur: hindari pertanyaan yang terlalu luas atau abstrak
- Metodologi tidak sesuai tujuan: jika kuantitatif harus ada uji statistik; jika kualitatif harus ada triangulasi
- Daftar pustaka tidak sinkron: setiap sitasi dalam teks harus ada di daftar pustaka
- Bahasa informal: hindari singkatan tidak baku, kata gaul, atau kalimat percakapan

PRINSIP AKHIR:
Jawaban terbaik adalah jawaban yang jika dibaca dosen, dosen tidak curiga itu dibuat AI — karena analisisnya tajam, bahasanya manusiawi, referensinya tepat, dan strukturnya rapi.
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
