// Portal Tugas — hanya menggunakan 9Router Antigravity (tidak ada Google API langsung)
const TUNNEL_URL = 'https://pest-forwarding-personalized-much.trycloudflare.com/v1';
const LOCAL_URL = 'http://127.0.0.1:20129/v1';

const NINE_ROUTER_BASE_URL = process.env.NINE_ROUTER_BASE_URL 
  || (process.env.VERCEL ? TUNNEL_URL : LOCAL_URL);
const NINE_ROUTER_API_KEY = process.env.NINE_ROUTER_API_KEY || 'sk-87aec067d631e9b8-zhlati-3571faa8';

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
- Tulis nomor soal: ### Soal 1, ### Soal 2.
- Baris pertama: tulis tegas opsi dan isinya (Contoh: **Jawaban: B. Diferensiasi Produk**).
- JIKA PENGGUNA MEMINTA HANYA KUNCI / HANYA ABCD / ATAU SOAL BERJUMLAH BANYAK (10–40 SOAL):
  * DILARANG membuat ulasan panjang, penurunan rumus bertele-tele, atau referensi! Cukup nomor soal dan opsi jawaban (atau maksimal 1 baris rumus jika hitungan).
  * Ini WAJIB dipatuhi agar seluruh butir soal tuntas terjawab lengkap dari awal sampai akhir!
- JIKA SOAL HANYA 1–5 NOMOR DAN TIDAK ADA PERMINTAAN HANYA ABCD:
  * Berikan ulasan singkat (1–2 kalimat) dan referensi modul.

[JIKA SOAL DISKUSI / KASUS / ESAI AKADEMIK / HITUNGAN]
- Struktur: Pembuka berbasis argumen/konsep langsung -> Penurunan matematis atau pembahasan analitis berbobot -> Sintesis kritis/Kesimpulan -> Daftar Referensi.
- Jika ada penurunan rumus, tuliskan baris per baris secara teratur dan rapi.
- Gunakan diksi akademis yang bervariasi, tajam, dan tidak berulang-ulang.

[JIKA SOAL TAHAP SKRIPSI / PROPOSAL / TESIS]
- Gunakan sudut pandang orang ketiga ("peneliti", "penulis", bukan "saya/kami").
- Metodologi menggunakan kalimat pasif sistematis ("Data dihimpun melalui...", "Uji normalitas dilakukan...").
- Kutipan langsung dibatasi ketat (utamakan parafrase bernas).
- Rumusan masalah, pembahasan, dan kesimpulan wajib memiliki benang merah yang linier dan terukur.

8. KEWAJIBAN MENJAWAB SEMUA SOAL — ZERO SKIP POLICY (MUTLAK):
- DILARANG KERAS melewati, meringkas, atau menghilangkan satu pun nomor soal dari daftar yang diberikan.
- Jika soal berjumlah 40 nomor, WAJIB dijawab 40 nomor: Soal 1 sampai Soal 40 semuanya harus hadir dalam output.
- DILARANG menulis kalimat seperti: "Soal 5-10 mirip pola soal sebelumnya...", "dst.", "dan seterusnya", "Soal berikutnya serupa", atau variasi apapun yang menandakan penghilangan.
- Jika output terasa panjang, TETAP lanjutkan hingga soal terakhir. Jangan potong di tengah jalan.
- Cek ulang: apakah semua nomor soal sudah terjawab sebelum menyelesaikan output.

9. INSTRUKSI ANALISIS GAMBAR & DIAGRAM (VISION MULTIMODAL):
- Jika ada gambar, diagram, grafik, tabel, atau ilustrasi terlampir — WAJIB dianalisis sepenuhnya sebelum menjawab.
- Identifikasi setiap elemen visual: angka, label sumbu, warna, bentuk geometri, garis, simbol, dan keterangan.
- Gunakan data dari gambar sebagai dasar kalkulasi. Jangan asumsikan nilai tanpa melihat gambar terlebih dahulu.
- Jika soal menunjuk gambar tertentu (misal: "lihat gambar di bawah", "[Gambar/Diagram Terlampir]"), obligasi jawab berdasarkan konten visual tersebut.

10. EFISIENSI & KETUNTASAN PAKET SOAL BANYAK (TRY OUT / 10–40 SOAL):
- Jika dokumen berisi banyak soal (misal: Try Out 40 soal), jaga agar pembahasan tiap nomor sangat padat (maksimal 1-2 baris rumus inti) agar seluruh 40 butir soal tuntas terjawab lengkap dari awal sampai akhir!
- DILARANG memotong jawaban di tengah jalan. Selesaikan sampai butir soal terakhir.

11. KEPATUHAN PENUH PADA PERMINTAAN USER ("HANYA ABCD" / "KUNCI JAWABAN SAJA"):
- Jika mahasiswa/user memberi instruksi seperti "hanya ABCD", "jawab ABCD-nya saja", "kunci jawaban saja", atau sejenisnya:
  * WAJIB PATUH MUTLAK: Tuliskan HANYA nomor soal dan pilihan opsinya secara langsung:
    ### Soal 1
    **Jawaban: C. 5 1/2**

    ### Soal 2
    **Jawaban: B. 121**
  * JANGAN sertakan baris perhitungan/pembuktian yang panjang jika pengguna secara jelas meminta "hanya ABCD annya saja"!
  * Ini membuat pengerjaan 40 soal selesai secepat kilat dalam hitungan detik tanpa risiko terputus!
`;

// Helper to repair unclosed LaTeX/Markdown tags if text was truncated
export function repairIncompleteMarkdown(raw: string): string {
  if (!raw) return '';
  let s = raw.trim();

  // 1. Repair unclosed $$ block math
  const blockMatches = s.match(/\$\$/g);
  if (blockMatches && blockMatches.length % 2 !== 0) {
    s += '\n$$';
  }

  // 2. Repair unclosed $ inline math (excluding escaped \$ and $$ blocks)
  const withoutBlock = s.replace(/\$\$[\s\S]*?\$\$/g, '');
  const inlineMatches = withoutBlock.replace(/\\(\$)/g, '').match(/\$/g);
  if (inlineMatches && inlineMatches.length % 2 !== 0) {
    s += '$';
  }

  // 3. Repair unclosed bold **
  const boldMatches = s.match(/\*\*/g);
  if (boldMatches && boldMatches.length % 2 !== 0) {
    s += '**';
  }

  // 4. Repair unclosed code blocks ```
  const codeBlockMatches = s.match(/```/g);
  if (codeBlockMatches && codeBlockMatches.length % 2 !== 0) {
    s += '\n```\n';
  }

  return s;
}

// Helper to format answers cleanly into lines/bullets if squashed
export function formatReadableAnswers(raw: string): string {
  if (!raw) return '';
  let s = repairIncompleteMarkdown(raw);

  // 1. Hapus baris heading kosong "###" yang tidak punya judul
  s = s.replace(/^###\s*$/gm, '');

  // 2. Jika ada pola "Soal 1: Jawaban" tanpa heading markdown "###", ubah menjadi "### Soal 1\n**Jawaban: "
  s = s.replace(/(?:^|\n)(?<!###\s*)(?:\*\*)?Soal\s+(\d+)[:\s]+(?:\*\*)?(?:JAWABAN|Jawaban)[:\s]*/gi, '\n\n### Soal $1\n**Jawaban: ');

  // 3. Pastikan setiap nomor soal (### Soal X) diawali dengan baris baru ganda agar ReactMarkdown merendernya sebagai judul
  s = s.replace(/([^\n])\s*(###\s*Soal\s+\d+)/gi, '$1\n\n$2');

  // 4. Pastikan "**Jawaban:" selalu berada di baris baru setelah judul soal
  s = s.replace(/([^\n])\s*(\*\*Jawaban[:\s])/gi, '$1\n$2');

  // 5. Bersihkan lagi baris kosong berlebih atau heading kosong
  s = s.replace(/^###\s*$/gm, '');
  s = s.replace(/\n{3,}/g, '\n\n');

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
  s = s.replace(/\\(?:big|Big|bigg|Bigg)[lr]?/g, '');
  s = s.replace(/\\left\s*([(\[{.])/g, '$1').replace(/\\left\./g, '');
  s = s.replace(/\\right\s*([)\]}.])/g, '$1').replace(/\\right\./g, '');
  s = s.replace(/\\\{/g, '{').replace(/\\\}/g, '}');
  s = s.replace(/\\[,;:!]/g, ' ');
  s = s.replace(/\\(?:quad|qquad)\b/g, '   ');
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

  // 5. Greek letters & functions
  s = s.replace(/\\(sin|cos|tan|cot|sec|csc|ln|log|exp|lim|det)\b/g, '$1');
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
  s = s.replace(/\^\{([^{}]+)\}/g, (_m, inner) => inner.length === 1 ? `^${inner}` : `^(${inner})`);

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
  s = s.replace(/_\{([^{}]+)\}/g, (_m, inner) => `_${inner}`);

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

// 1. Solver via 9Router (streaming mode — data mengalir token per token, tidak tunggu semua selesai)
export async function ask9Router(
  promptText: string, 
  images: ImagePart[] = [], 
  model = 'ag/gemini-3.8-flash-medium'
): Promise<string> {
  const contentParts: any[] = [];
  const isVercel = Boolean(process.env.VERCEL);
  const isAbcdOnly = /(?:hanya\s+abcd|jawab\s+abcd|abcd\s+saja|kunci\s+jawaban|hanya\s+opsi|opsi\s+saja|pilihan\s+saja|tanpa\s+cara|tanpa\s+pembahasan)/i.test(promptText);

  let userText = promptText;
  if (isAbcdOnly) {
    const abcdHeader = `\n\n[PERINTAH UTAMA — KUNCI JAWABAN SAJA]:\nPengguna meminta HANYA kunci jawaban/pilihan ABCD. DILARANG KERAS menuliskan pembahasan, uraian panjang, rumus, maupun referensi modul. Tuliskan HANYA nomor soal dan pilihan opsi secara langsung: \n### Soal 1\n**Jawaban: C. 5 1/2**\n\n### Soal 2\n**Jawaban: B. 121**\n\nWAJIB TUNTASKAN SELURUH NOMOR DARI 1 SAMPAI NOMOR TERAKHIR TANPA TERPUTUS!\n`;
    userText = `${abcdHeader}\n${promptText}\n\n${abcdHeader}`;
  }

  const fullText = userText && userText.trim().length > 0 
    ? `${SYSTEM_PROMPT}\n\nPertanyaan/Tugas Mahasiswa:\n${userText}`
    : `${SYSTEM_PROMPT}\n\nSilakan baca soal pada gambar di bawah ini, lalu berikan jawaban yang tepat dan penjelasan singkat beserta referensinya:`;

  contentParts.push({ type: 'text', text: fullText });

  // SEMUA GAMBAR DIKIRIM TANPA BATASAN APAPUN (sesuai instruksi user)
  for (const img of images) {
    contentParts.push({
      type: 'image_url',
      image_url: {
        url: `data:${img.mimeType};base64,${img.data}`,
      },
    });
  }

  // Model selection: gunakan gemini-3.8-flash untuk soal banyak / ABCD only agar selesai < 20s
  const primaryModel = (images.length > 0 && model.includes('claude'))
    ? 'ag/gemini-3.8-flash'
    : (isAbcdOnly || promptText.length > 2000 || images.length > 3)
      ? 'ag/gemini-3.8-flash'
      : model;
  const secondaryModel = primaryModel === 'ag/gemini-3.8-flash' 
    ? 'ag/gemini-3.8-flash-medium' 
    : 'ag/gemini-3.8-flash';
  const uniqueModels = Array.from(new Set([primaryModel, secondaryModel]));

  let lastError: any = null;
  const startTime = Date.now();

  for (const [idx, targetModel] of uniqueModels.entries()) {
    const elapsed = Date.now() - startTime;
    const remainingBudget = isVercel ? (58000 - elapsed) : (600000 - elapsed);
    if (idx > 0 && remainingBudget < 15000) {
      break;
    }
    // Lokal: 10 menit (bebas batas waktu). Vercel: maksimal 56.5s (aman sebelum limit 60s)
    const timeoutMs = isVercel
      ? Math.max(10000, Math.min(remainingBudget - 1000, 56500))
      : 600000;

    try {
      const payload = {
        model: targetModel,
        messages: [{ role: 'user', content: contentParts }],
        stream: true,
        temperature: 0.2,
        max_tokens: 8192,
      };

      const controller = new AbortController();
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

      if (!response.ok) {
        clearTimeout(timeoutId);
        const errorBody = await response.text();
        throw new Error(`9Router [${targetModel}] error ${response.status}: ${errorBody}`);
      }

      // Baca stream SSE token per token dengan buffer akumulator (mencegah teks terpotong di perbatasan chunk)
      let fullAnswer = '';
      
      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = '';
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            sseBuffer += decoder.decode(value, { stream: true });
            const lines = sseBuffer.split('\n');
            // Simpan baris terakhir yang belum selesai di buffer
            sseBuffer = lines.pop() || '';
            
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith('data: ')) continue;
              if (trimmed.includes('[DONE]')) break;
              
              try {
                const parsed = JSON.parse(trimmed.slice(6));
                const delta = parsed.choices?.[0]?.delta?.content 
                           || parsed.choices?.[0]?.message?.content 
                           || '';
                fullAnswer += delta;
              } catch {
                // abaikan baris yang rusak
              }
            }
          }

          // Proses baris terakhir jika masih ada di buffer
          if (sseBuffer.trim().startsWith('data: ') && !sseBuffer.includes('[DONE]')) {
            try {
              const parsed = JSON.parse(sseBuffer.trim().slice(6));
              const delta = parsed.choices?.[0]?.delta?.content 
                         || parsed.choices?.[0]?.message?.content 
                         || '';
              fullAnswer += delta;
            } catch {
              // ignore
            }
          }
        } catch (streamErr: any) {
          // Jika timeout abort terjadi di tengah stream, gunakan apa yang sudah terkumpul dengan perbaikan tag
          if (fullAnswer.length > 200) {
            console.warn(`[9Router] Streaming interrupted at ${fullAnswer.length} chars, returning partial answer`);
            clearTimeout(timeoutId);
            const repaired = repairIncompleteMarkdown(fullAnswer);
            return isVercel
              ? repaired + '\n\n---\n> ⏱️ **Pemberitahuan Sistem:** Batas waktu eksekusi serverless (60 detik Vercel) tercapai pada nomor ini. Anda dapat klik tombol **"Lanjutkan Soal Berikutnya"** di bawah atau gunakan **localhost:3000** untuk pengerjaan dokumen besar tanpa batas waktu.'
              : repaired;
          }
          throw streamErr;
        }
      } else {
        const rawText = await response.text();
        try {
          const result = JSON.parse(rawText);
          fullAnswer = result.choices?.[0]?.message?.content || '';
        } catch {
          fullAnswer = rawText;
        }
      }

      clearTimeout(timeoutId);

      if (!fullAnswer) {
        throw new Error(`9Router [${targetModel}] mengembalikan respons kosong.`);
      }

      return fullAnswer;
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        lastError = new Error('Batas waktu 58 detik terlampaui (limit serverless Vercel). Berkas memuat 40 soal lengkap + 23 gambar. Silakan klik "Kerjakan Tugas" lagi atau gunakan versi lokal (localhost:3000) tanpa batas waktu.');
      } else {
        lastError = err;
      }
      console.warn(`9Router model ${targetModel} attempt failed:`, lastError.message);
    }
  }

  throw new Error(`Semua model 9Router gagal. Error terakhir: ${lastError?.message || 'Unknown error'}`);
}


// Orchestrator — hanya 9Router, tidak ada Google API
export async function solveWithDualEngine(
  promptText: string,
  images: ImagePart[] = [],
  engineChoice = 'auto', // 'auto' | '9router' | 'gemini' (semua pakai 9Router)
  modelChoice = 'ag/gemini-3.8-flash-medium'
): Promise<{ answer: string; usedEngine: string }> {
  // Jika ada gambar dan model Claude dipilih → ganti ke Gemini (Claude tidak support vision)
  const effectiveModel = (images.length > 0 && modelChoice.includes('claude'))
    ? 'ag/gemini-3.8-flash-medium'
    : modelChoice;

  const answer = await ask9Router(promptText, images, effectiveModel);
  const cleanModelName = effectiveModel.replace('ag/', '').toUpperCase();
  return { answer, usedEngine: `9Router [${cleanModelName}] (Antigravity)` };
}

