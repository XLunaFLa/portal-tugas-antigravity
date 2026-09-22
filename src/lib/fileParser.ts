// ============================================================
// Antigravity Document Parser (Server-side)
// Extracts text & math formulas from DOCX, PDF, XLSX, TXT, CSV, etc.
// Fully supports Microsoft Office Math (OMML <m:oMath>) & Media Images
// ============================================================

export interface ParsedDocumentImage {
  fileName: string;
  mimeType: string;
  base64: string; // format: data:image/...;base64,...
}

export interface ParsedDocumentResult {
  text: string;
  charCount: number;
  wordCount: number;
  fileName: string;
  fileType: string;
  images?: ParsedDocumentImage[];
}

// ─── OMML (Office Math Markup Language) to LaTeX Converter ───────
export function parseOmmlToLatex(xml: string): string {
  let s = xml;

  // 1. Fractions: innermost <m:f> first
  let prev = '';
  while (s.includes('<m:f') && s !== prev) {
    prev = s;
    s = s.replace(/<m:f\b(?:(?!<m:f\b)[\s\S])*?<m:num\b[^>]*>([\s\S]*?)<\/m:num>(?:(?!<m:f\b)[\s\S])*?<m:den\b[^>]*>([\s\S]*?)<\/m:den>(?:(?!<m:f\b)[\s\S])*?<\/m:f>/g, (_m, num, den) => {
      return ` \\frac{${parseOmmlToLatex(num).trim()}}{${parseOmmlToLatex(den).trim()}} `;
    });
  }

  // 2. Superscripts (Exponents / Pangkat): innermost <m:sSup> first
  prev = '';
  while (s.includes('<m:sSup') && s !== prev) {
    prev = s;
    s = s.replace(/<m:sSup\b(?:(?!<m:sSup\b)[\s\S])*?<m:e\b[^>]*>([\s\S]*?)<\/m:e>(?:(?!<m:sSup\b)[\s\S])*?<m:sup\b[^>]*>([\s\S]*?)<\/m:sup>(?:(?!<m:sSup\b)[\s\S])*?<\/m:sSup>/g, (_m, base, exp) => {
      return `${parseOmmlToLatex(base).trim()}^{${parseOmmlToLatex(exp).trim()}}`;
    });
  }

  // 3. Subscripts (Indeks Bawah): innermost <m:sSub> first
  prev = '';
  while (s.includes('<m:sSub') && s !== prev) {
    prev = s;
    s = s.replace(/<m:sSub\b(?:(?!<m:sSub\b)[\s\S])*?<m:e\b[^>]*>([\s\S]*?)<\/m:e>(?:(?!<m:sSub\b)[\s\S])*?<m:sub\b[^>]*>([\s\S]*?)<\/m:sub>(?:(?!<m:sSub\b)[\s\S])*?<\/m:sSub>/g, (_m, base, sub) => {
      return `${parseOmmlToLatex(base).trim()}_{${parseOmmlToLatex(sub).trim()}}`;
    });
  }

  // 4. Radicals (Akar Kuadrat & Akar n): innermost <m:rad> first
  prev = '';
  while (s.includes('<m:rad') && s !== prev) {
    prev = s;
    s = s.replace(/<m:rad\b(?:(?!<m:rad\b)[\s\S])*?(?:<m:deg\b[^>]*>([\s\S]*?)<\/m:deg>)?(?:(?!<m:rad\b)[\s\S])*?<m:e\b[^>]*>([\s\S]*?)<\/m:e>(?:(?!<m:rad\b)[\s\S])*?<\/m:rad>/g, (_m, deg, expr) => {
      const d = deg ? parseOmmlToLatex(deg).trim() : '';
      const e = parseOmmlToLatex(expr).trim();
      return d ? `\\sqrt[${d}]{${e}}` : `\\sqrt{${e}}`;
    });
  }

  // 5. Delimiters (Tanda Kurung): innermost <m:d> first
  prev = '';
  while (s.includes('<m:d') && s !== prev) {
    prev = s;
    s = s.replace(/<m:d\b(?:(?!<m:d\b)[\s\S])*?<m:e\b[^>]*>([\s\S]*?)<\/m:e>(?:(?!<m:d\b)[\s\S])*?<\/m:d>/g, (_m, expr) => {
      return `(${parseOmmlToLatex(expr).trim()})`;
    });
  }

  // 6. Replace <m:t>text</m:t> with text
  s = s.replace(/<m:t\b[^>]*>([\s\S]*?)<\/m:t>/g, '$1');

  // 7. Strip all remaining XML tags
  s = s.replace(/<[^>]+>/g, '');
  return s.trim();
}

// ─── Comprehensive OpenXML DOCX Parser ───────────────────────────
async function parseDocxOpenXml(buffer: Buffer): Promise<{ text: string; images: ParsedDocumentImage[] }> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(buffer);

  // 1. Parse Numbering Definitions (word/numbering.xml)
  const numToAbs: Record<string, string> = {};
  const absFormats: Record<string, string> = {};
  const numXml = await zip.file('word/numbering.xml')?.async('string');
  if (numXml) {
    const numRegex = /<w:num\b[^>]*w:numId="(\d+)"[\s\S]*?<w:abstractNumId\b[^>]*w:val="(\d+)"/g;
    let m: RegExpExecArray | null;
    while ((m = numRegex.exec(numXml)) !== null) numToAbs[m[1]] = m[2];

    const absRegex = /<w:abstractNum\b[^>]*w:abstractNumId="(\d+)"[\s\S]*?<w:numFmt\b[^>]*w:val="([^"]+)"/g;
    while ((m = absRegex.exec(numXml)) !== null) absFormats[m[1]] = m[2];
  }

  // 2. Parse Media Relationships (word/_rels/document.xml.rels)
  const relsXml = await zip.file('word/_rels/document.xml.rels')?.async('string');
  const relMap: Record<string, string> = {};
  if (relsXml) {
    const relRegex = /<Relationship\b[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g;
    let rm: RegExpExecArray | null;
    while ((rm = relRegex.exec(relsXml)) !== null) {
      relMap[rm[1]] = rm[2].replace(/^media\//, 'word/media/');
    }
  }

  // 3. Extract Embedded Diagram Images from word/media/
  const imageMap: Record<string, ParsedDocumentImage> = {};
  const uniqueImages: ParsedDocumentImage[] = [];
  const processedFiles = new Set<string>();

  for (const [rId, target] of Object.entries(relMap)) {
    const fullPath = target.startsWith('word/') ? target : `word/${target}`;
    const file = zip.file(fullPath);
    if (file) {
      const imgBuffer = await file.async('nodebuffer');
      const ext = target.split('.').pop()?.toLowerCase() || 'png';
      const mime = (ext === 'jpeg' || ext === 'jpg') ? 'image/jpeg' : 'image/png';
      const b64 = imgBuffer.toString('base64');
      const fileName = target.split('/').pop() || 'diagram.png';
      const item: ParsedDocumentImage = {
        fileName,
        mimeType: mime,
        base64: `data:${mime};base64,${b64}`,
      };
      imageMap[rId] = item;
      if (!processedFiles.has(fileName)) {
        processedFiles.add(fileName);
        uniqueImages.push(item);
      }
    }
  }

  // 4. Parse document.xml Paragraphs
  const docXml = await zip.file('word/document.xml')?.async('string');
  if (!docXml) {
    throw new Error('Berkas word/document.xml tidak ditemukan di dalam paket DOCX.');
  }

  const pRegex = /<w:p\b[\s\S]*?<\/w:p>/g;
  let pm: RegExpExecArray | null;
  const lines: string[] = [];

  let qNumber = 0;
  const numCounters: Record<string, number> = {};

  while ((pm = pRegex.exec(docXml)) !== null) {
    const pContent = pm[0];

    // Traverse runs, formulas, and images in order
    const tokenRegex = /(<w:t\b[^>]*>[\s\S]*?<\/w:t>|<m:oMath\b[^>]*>[\s\S]*?<\/m:oMath>|<(?:a:blip|v:imagedata)\b[^>]*(?:r:embed|r:id)="([^"]+)"[^>]*\/?>)/g;
    let tm: RegExpExecArray | null;
    let pText = '';

    while ((tm = tokenRegex.exec(pContent)) !== null) {
      const match = tm[0];
      if (match.startsWith('<w:t')) {
        const text = match.replace(/<[^>]+>/g, '');
        pText += text;
      } else if (match.startsWith('<m:oMath')) {
        const inner = match.replace(/^<m:oMath\b[^>]*>/, '').replace(/<\/m:oMath>$/, '');
        const tex = parseOmmlToLatex(inner);
        if (tex) {
          pText += ` $${tex}$ `;
        }
      } else if (tm[2]) {
        const img = imageMap[tm[2]];
        if (img) {
          pText += `\n[Gambar/Diagram Terlampir: ${img.fileName}]\n`;
        }
      }
    }

    const clean = pText.trim();
    if (!clean) continue;

    // Determine Numbering Prefix
    let pPrefix = '';
    const numPrMatch = pContent.match(/<w:numPr\b[\s\S]*?<w:numId\b[^>]*w:val="(\d+)"/);
    if (numPrMatch) {
      const numId = numPrMatch[1];
      const absId = numToAbs[numId];
      const fmt = absFormats[absId] || 'decimal';

      if (numId === '1' || (fmt === 'decimal' && !numToAbs[numId])) {
        qNumber++;
        pPrefix = `\n### Soal ${qNumber}\n`;
      } else if (fmt === 'lowerLetter' || fmt === 'upperLetter') {
        numCounters[numId] = (numCounters[numId] || 0) + 1;
        const letter = String.fromCharCode(64 + numCounters[numId]); // A, B, C, D
        pPrefix = `${letter}. `;
      } else if (fmt === 'lowerRoman') {
        numCounters[numId] = (numCounters[numId] || 0) + 1;
        const romans = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii'];
        pPrefix = `(${romans[numCounters[numId] - 1] || numCounters[numId]}) `;
      } else if (fmt === 'decimal') {
        numCounters[numId] = (numCounters[numId] || 0) + 1;
        pPrefix = `(${numCounters[numId]}) `;
      } else {
        pPrefix = `- `;
      }
    }

    lines.push(`${pPrefix}${clean}`.trim());
  }

  return {
    text: lines.join('\n\n'),
    images: uniqueImages,
  };
}

export async function parseDocumentBuffer(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<ParsedDocumentResult> {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  let extractedText = '';
  let extractedImages: ParsedDocumentImage[] = [];

  // 1. PDF Documents
  if (ext === 'pdf' || mimeType === 'application/pdf') {
    try {
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: buffer });
      const res = await parser.getText();
      extractedText = res.text || '';
      await parser.destroy();
    } catch (pdfErr: any) {
      console.warn('PDF parsing fallback error:', pdfErr.message);
      extractedText = `[Teks PDF tidak dapat diekstrak otomatis: ${pdfErr.message}]`;
    }
  }

  // 2. Word Documents (.docx) — Native OpenXML with OMML & Media Images
  else if (ext === 'docx' || mimeType.includes('wordprocessingml')) {
    try {
      const docxResult = await parseDocxOpenXml(buffer);
      extractedText = docxResult.text;
      extractedImages = docxResult.images;
    } catch (openXmlErr: any) {
      console.warn('OpenXML parser fallback to mammoth:', openXmlErr.message);
      try {
        const mammoth = await import('mammoth');
        const res = await mammoth.extractRawText({ buffer });
        extractedText = res.value || '';
      } catch (docxErr: any) {
        console.warn('DOCX parsing error:', docxErr.message);
        extractedText = `[Gagal membaca dokumen Word: ${docxErr.message}]`;
      }
    }
  }

  // 3. Excel Spreadsheets (.xlsx, .xls, .csv)
  else if (ext === 'xlsx' || ext === 'xls' || ext === 'csv' || mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetTexts: string[] = [];

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) continue;
        const csvContent = XLSX.utils.sheet_to_csv(sheet);
        if (csvContent.trim()) {
          sheetTexts.push(`[Sheet: ${sheetName}]\n${csvContent}`);
        }
      }

      extractedText = sheetTexts.join('\n\n');
    } catch (xlsxErr: any) {
      console.warn('Excel parsing error:', xlsxErr.message);
      extractedText = `[Gagal membaca spreadsheet: ${xlsxErr.message}]`;
    }
  }

  // 4. Plain Text, Markdown, JSON, Code (.txt, .md, .json, .csv)
  else {
    try {
      extractedText = buffer.toString('utf-8');
    } catch {
      extractedText = buffer.toString('latin1');
    }
  }

  // Clean up excessive whitespace
  const cleanedText = extractedText
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const words = cleanedText ? cleanedText.split(/\s+/).length : 0;

  return {
    text: cleanedText,
    charCount: cleanedText.length,
    wordCount: words,
    fileName,
    fileType: ext || 'doc',
    images: extractedImages,
  };
}
