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

5. STRUKTUR TATA LETAK ESTETIS & RAPI (STANDAR PLAYGROUND AI & CHATGPT):
- DILARANG KERAS MENUMPUK jawaban dalam satu baris kalimat panjang yang berdempetan!
- Setiap nomor soal WAJIB diawali dengan heading yang jelas (gunakan format: ### Soal 1, ### Soal 2).
- Setiap sub-pertanyaan atau butir poin (a., b., c., 1., 2., dst.) WAJIB DITULIS PADA BARIS BARU TERSENDIRI menggunakan format daftar berbutir yang rapi:
  * **a.** [Penjelasan / Rumus bagian a]
  * **b.** [Penjelasan / Rumus bagian b]
  * **c.** [Penjelasan / Rumus bagian c]
- Berikan jarak kosong (1 baris kosong) antar nomor soal agar naskah terlihat berjarak, rapi, dan mudah dibaca.

6. FORMAT NOTASI MATEMATIKA, FISIKA & RUMUS ILMIAH:
- Gunakan sintaks LaTeX standar yang bersih untuk formula matematika agar ter-render secara visual dengan sempurna oleh KaTeX di web:
  - Gunakan $...$ untuk rumus pendek di dalam kalimat (inline math), misalnya $x = 4\text{ cm}$ atau $\sin 30^\circ = \frac{1}{2}$.
  - Gunakan $$...$$ pada baris tersendiri untuk persamaan utama, rumus balok, dan penurunan langkah (block math), misalnya:
    $$V(x) = x(24 - 2x)^2 = 4x^3 - 96x^2 + 576x$$
    $$L = \int_0^5 (5x - x^2)\,dx = \frac{125}{6}\text{ satuan luas}$$
  - Untuk matriks, selalu gunakan format standar pmatrix/bmatrix agar tampil 2 dimensi:
    $$\begin{pmatrix} 3 & 2 \\ 5 & 4 \end{pmatrix} \begin{pmatrix} x \\ y \end{pmatrix} = \begin{pmatrix} 12 \\ 22 \end{pmatrix}$$
  - Gunakan \frac{a}{b} untuk pecahan, \sqrt{...} untuk akar, dan \implies untuk tanda panah kesimpulan.
- DILARANG menuliskan matriks secara mendatar menggunakan kurung siku bersambung seperti [ 3 2 ] [ x ] di dalam teks.

7. DILARANG KERAS MONOLOG INTERNAL & RAGU-RAGU (ANTI-SELF-DOUBT):
- DILARANG KERAS menampilkan proses berpikir bimbang, tanya-jawab dengan diri sendiri, atau monolog perdebatan seperti:
  "Mari kita hitung ulang...", "Tunggu...", "Periksa kembali opsi...", "Apakah opsi A atau B?", "Jika komplemen adalah...", "Berarti opsi A adalah...".
- Selesaikan seluruh perhitungan dan analisis secara internal di pikiranmu sebelum mulai menulis.
- Teks keluaran HANYA berisi jawaban final yang lugas, mantap, terbukti, dan langkah pembuktian yang teratur tanpa keraguan sedikit pun.

AUTO-DETEKSI JENIS SOAL:

[JIKA SOAL PILIHAN GANDA / A-B-C-D]
- Tulis nomor soal bersih: Soal 1, Soal 2.
- Baris pertama: tulis tegas opsi dan isinya (Contoh: Jawaban: B. Diferensiasi Produk).
- Ulasan singkat (2–3 kalimat): jelaskan dasar logis jawaban tersebut dan kelemahan opsi pengecoh terdekat.
- Referensi: 1 baris modul/buku baku.
- Jangan bertele-tele pada soal pilihan ganda.

[JIKA SOAL DISKUSI / KASUS / ESAI AKADEMIK / HITUNGAN]
- Struktur: Pembuka berbasis argumen/konsep langsung -> Penurunan matematis atau pembahasan analitis berbobot -> Sintesis kritis/Kesimpulan -> Daftar Referensi.
- Jika ada penurunan rumus, tuliskan baris per baris secara teratur dan rapi.
- Gunakan diksi akademis yang bervariasi, tajam, dan tidak berulang-ulang.

[JIKA SOAL TAHAP SKRIPSI / PROPOSAL / TESIS]
- Gunakan sudut pandang orang ketiga ("peneliti", "penulis", bukan "saya/kami").
- Metodologi menggunakan kalimat pasif sistematis ("Data dihimpun melalui...", "Uji normalitas dilakukan...").
- Kutipan langsung dibatasi ketat (utamakan parafrase bernas).
- Rumusan masalah, pembahasan, dan kesimpulan wajib memiliki benang merah yang linier dan terukur.
`;

// Helper to format answers cleanly into lines/bullets if squashed
export function formatReadableAnswers(raw: string): string {
  if (!raw) return '';
  let s = raw;

  // 1. Separate "Soal X JAWABAN = a. ..." onto clean lines with markdown heading and bold label
  s = s.replace(/(Soal\s+\d+)\s*(JAWABAN\s*=?:?)\s*(?:([a-zA-Z]\.)\s+)?/gi, (_match, soal, ans, sub) => {
    let out = `### ${soal}\n**${ans}**\n`;
    if (sub) out += `* **${sub}** `;
    return out;
  });

  // 2. Separate inline squashed sub-items: " ... b. ... c. ..." into bullet lines
  s = s.replace(/([^\n])\s+([b-z]\.\s+)/g, '$1\n* **$2**');

  // 3. Clean spacing inside bold tags e.g. **b. ** -> **b.** 
  s = s.replace(/\*\*([a-z]\.)\s+\*\*/g, '**$1** ');

  // 4. Ensure clear spacing between consecutive questions
  s = s.replace(/([^\n])\s+(### Soal\s+\d+)/gi, '$1\n\n$2');

  return s.trim();
}

// Helper function to thoroughly sanitize math syntax for Word (.docx) & PDF export
export function cleanMathAndTypography(raw: string): string {
  if (!raw) return '';
  let s = formatReadableAnswers(raw);

  // 1. Remove leaked chain-of-thought / monologue / self-doubt
  s = s.replace(/\b(?:Mari hitung ulang|Tunggu\.|Periksa kembali opsi)[^.\n]*[.\n]/gi, '');

  // 2. Format 2D matrices for Word/PDF: \begin{pmatrix} a & b \\ c & d \end{pmatrix} -> [ a   b ]\n[ c   d ]
  s = s.replace(/\\begin\{[bp]matrix\}([\s\S]*?)\\end\{[bp]matrix\}/g, (_m, inner) => {
    const rows = inner.trim().split('\\\\').map((r: string) => {
      const cols = r.split('&').map((c: string) => c.trim()).join('   ');
      return `[  ${cols}  ]`;
    });
    return '\n' + rows.join('\n') + '\n';
  });

  // 3. LaTeX commands & wrappers
  s = s.replace(/\\(?:text|mathrm|mathbf)\{([^}]+)\}/g, '$1');
  s = s.replace(/\\left\s*([(\[{])/g, '$1');
  s = s.replace(/\\right\s*([)\]}])/g, '$1');
  s = s.replace(/\\(?:implies|Rightarrow)\b/g, ' ⇒ ');
  s = s.replace(/\\(?:rightarrow|to)\b/g, ' → ');
  s = s.replace(/\\int_\{([^{}]+)\}\^\{([^{}]+)\}/g, '∫[$1 to $2] ');
  s = s.replace(/\\int_([0-9a-zA-Z])\^([0-9a-zA-Z])/g, '∫[$1 to $2] ');
  s = s.replace(/\\int\b/g, '∫ ');

  // 4. Operators & symbols
  s = s.replace(/\\cdot/g, ' · ');
  s = s.replace(/\\times/g, ' × ');
  s = s.replace(/\\div/g, ' ÷ ');
  s = s.replace(/\\pm/g, ' ± ');
  s = s.replace(/\\approx/g, ' ≈ ');
  s = s.replace(/\\leq/g, ' ≤ ').replace(/\\le\b/g, ' ≤ ');
  s = s.replace(/\\geq/g, ' ≥ ').replace(/\\ge\b/g, ' ≥ ');
  s = s.replace(/\\neq/g, ' ≠ ');
  s = s.replace(/\\infty/g, ' ∞ ');

  // 5. Greek letters
  s = s.replace(/\\theta/g, 'θ').replace(/\\Theta/g, 'Θ');
  s = s.replace(/\\omega/g, 'ω').replace(/\\Omega/g, 'Ω');
  s = s.replace(/\\alpha/g, 'α').replace(/\\beta/g, 'β');
  s = s.replace(/\\gamma/g, 'γ').replace(/\\Delta/g, 'Δ').replace(/\\delta/g, 'δ');
  s = s.replace(/\\pi/g, 'π').replace(/\\lambda/g, 'λ');
  s = s.replace(/\\mu/g, 'μ').replace(/\\sigma/g, 'σ').replace(/\\rho/g, 'ρ');
  s = s.replace(/\\partial/g, '∂');

  // 6. Fractions
  s = s.replace(/\\frac\{1\}\{2\}/g, '½');
  s = s.replace(/\\frac\{1\}\{4\}/g, '¼');
  s = s.replace(/\\frac\{3\}\{4\}/g, '¾');
  while (/\\frac\{([^{}]+)\}\{([^{}]+)\}/.test(s)) {
    s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, (_match, num, den) => {
      const cleanNum = num.trim();
      const cleanDen = den.trim();
      if (/^[a-zA-Z0-9_]+$/.test(cleanNum) && /^[a-zA-Z0-9_]+$/.test(cleanDen)) {
        return `${cleanNum}/${cleanDen}`;
      }
      return `(${cleanNum} / ${cleanDen})`;
    });
  }

  // 7. Square roots
  while (/\\sqrt\{([^{}]+)\}/.test(s)) {
    s = s.replace(/\\sqrt\{([^{}]+)\}/g, (_m, inner) => {
      const cleanInner = inner.trim();
      if (cleanInner.startsWith('(') && cleanInner.endsWith(')')) {
        return `√${cleanInner}`;
      }
      return `√(${cleanInner})`;
    });
  }

  // 8. Superscripts and Degrees
  s = s.replace(/\^\s*\\circ/g, '°');
  s = s.replace(/\^\{\s*\\circ\s*\}/g, '°');
  s = s.replace(/\^\{\s*([0-9+\-n]+)\s*\}/g, (_m, p) => {
    const map: Record<string, string> = { '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','+':'⁺','-':'⁻','n':'ⁿ' };
    return p.split('').map((c: string) => map[c] || c).join('');
  });
  s = s.replace(/\^([0-9+\-n])/g, (_m, c) => {
    const map: Record<string, string> = { '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','+':'⁺','-':'⁻','n':'ⁿ' };
    return map[c] || `^${c}`;
  });

  // 9. Subscripts
  s = s.replace(/_\{([a-zA-Z0-9]+)\}/g, (_m, p) => {
    const subMap: Record<string, string> = { '0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉' };
    if (/^[0-9]+$/.test(p)) return p.split('').map((c: string) => subMap[c] || c).join('');
    return `_${p}`;
  });
  s = s.replace(/_([0-9])/g, (_m, c) => {
    const subMap: Record<string, string> = { '0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉' };
    return subMap[c] || `_${c}`;
  });

  // 10. Standard math functions
  s = s.replace(/\\(sin|cos|tan|cot|sec|csc|ln|log|exp|lim)\b/g, '$1');

  // 11. Outer $ delimiters
  s = s.replace(/\$\$([^$]+)\$\$/g, '$1');
  s = s.replace(/\$([^$\n]+)\$/g, '$1');
  s = s.replace(/\$/g, '');

  // 12. Normalize spaces & fraction spacing
  s = s.replace(/([½¼¾])([a-zA-Z])/g, '$1 $2');
  s = s.replace(/[ \t]+/g, ' ');
  s = s.replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');
  s = s.replace(/\s*·\s*/g, ' · ');
  s = s.replace(/\s*=\s*/g, ' = ');

  // 13. Collapse multiple blank lines
  s = s.replace(/\n{3,}/g, '\n\n');

  return s.trim();
}

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

  // High-efficiency, fast fallback inside 9Router (capped at 2 fast attempts to stay well within Vercel timeout)
  const primaryModel = (images.length > 0 && model.includes('claude'))
    ? 'ag/gemini-3.8-flash-high'
    : model;
  const secondaryModel = primaryModel === 'ag/gemini-3.8-flash-high' 
    ? 'ag/gemini-3.7-flash-high' 
    : 'ag/gemini-3.8-flash-high';
  const uniqueModels = Array.from(new Set([primaryModel, secondaryModel]));

  let lastError: any = null;

  for (const [idx, targetModel] of uniqueModels.entries()) {
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

      const controller = new AbortController();
      const timeoutMs = idx === 0 ? 22000 : 12000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(`${NINE_ROUTER_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${NINE_ROUTER_API_KEY}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`9Router [${targetModel}] error ${response.status}: ${errorBody}`);
      }

      const rawText = await response.text();
      let answer = '';

      if (rawText.includes('data: ')) {
        const lines = rawText.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ') && !trimmed.includes('[DONE]')) {
            try {
              const parsed = JSON.parse(trimmed.slice(6));
              const delta = parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.message?.content || '';
              answer += delta;
            } catch {
              // ignore malformed line
            }
          }
        }
      } else {
        try {
          const result = JSON.parse(rawText);
          answer = result.choices?.[0]?.message?.content || '';
        } catch {
          // ignore
        }
      }

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
  preferredModel = 'gemini-3.5-flash-lite'
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY belum dikonfigurasi.');
  }

  const modelsToTry = [
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-3-flash-preview',
    preferredModel, 
    'gemini-3.5-flash',
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
    // For large multi-question documents (> 2000 chars), tunnel roundtrip + multi-question generation
    // risks hitting Vercel's 60s function limit. Fast-path directly to Gemini 3.5 Flash for sub-25s response!
    const isVeryLongPrompt = promptText.length > 2000;
    if (engineChoice === 'auto' && isVeryLongPrompt) {
      const answer = await askGemini(promptText, images, 'gemini-3.5-flash');
      return { answer, usedEngine: 'Google Gemini 3.5 Flash (Cloud Turbo Direct)' };
    }

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
