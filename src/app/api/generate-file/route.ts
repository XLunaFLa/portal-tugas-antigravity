import { NextRequest, NextResponse } from 'next/server';
import { cleanMathAndTypography } from '@/lib/gemini';
import katex from 'katex';
import { mml2omml } from 'mathml2omml';

export const maxDuration = 30;

function latexToOmmlComponent(latex: string, ImportedXmlComponent: any): any | null {
  try {
    const cleanTex = latex.trim();
    if (!cleanTex) return null;
    const html = katex.renderToString(cleanTex, { output: 'mathml', throwOnError: false });
    const match = html.match(/<math[\s\S]*?<\/math>/);
    if (!match) return null;
    const omml = mml2omml(match[0]);
    const comp = ImportedXmlComponent.fromXmlString(omml);
    return comp && comp.root && comp.root[0] ? comp.root[0] : comp;
  } catch {
    return null;
  }
}

// ─── Markdown Parser & Sanitizer ─────────────────────────────
type BlockType = 'h1' | 'h2' | 'h3' | 'question' | 'answer' | 'review' | 'reference' | 'formula' | 'paragraph' | 'bullet' | 'numbered' | 'table' | 'empty';
interface Block {
  type: BlockType;
  content: string;
  num?: number;
  rows?: string[][];
}

function pdfSafeText(str: string): string {
  if (!str) return '';
  return str
    .replace(/√/g, 'sqrt')
    .replace(/θ/g, 'theta')
    .replace(/ω/g, 'omega')
    .replace(/α/g, 'alpha')
    .replace(/β/g, 'beta')
    .replace(/Δ/g, 'Delta')
    .replace(/π/g, 'pi')
    .replace(/λ/g, 'lambda')
    .replace(/⁺/g, '+')
    .replace(/⁻/g, '-')
    .replace(/₀/g, '0')
    .replace(/₁/g, '1')
    .replace(/₂/g, '2');
}

function stripMarkdownSymbols(text: string): string {
  if (!text) return '';
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_{1,2}(.+?)_{1,2}/g, '$1')
    .replace(/^#{1,6}\s*/, '')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/[\*#]/g, '') // remove any stray unclosed asterisks or hashes
    .trim();
}

interface InlineRun {
  text: string;
  bold?: boolean;
  italics?: boolean;
}

function parseInlineRuns(rawText: string): InlineRun[] {
  if (!rawText) return [];
  const pattern = /(\*\*[^*]+?\*\*|\*[^*]+?\*)/g;
  const runs: InlineRun[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(rawText)) !== null) {
    if (match.index > lastIndex) {
      const normal = rawText.slice(lastIndex, match.index).replace(/[\*#]/g, '');
      if (normal) runs.push({ text: normal });
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      const boldText = token.slice(2, -2).replace(/[\*#]/g, '');
      if (boldText) runs.push({ text: boldText, bold: true });
    } else if (token.startsWith('*') && token.endsWith('*')) {
      const italicText = token.slice(1, -1).replace(/[\*#]/g, '');
      if (italicText) runs.push({ text: italicText, italics: true });
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < rawText.length) {
    const remaining = rawText.slice(lastIndex).replace(/[\*#]/g, '');
    if (remaining) runs.push({ text: remaining });
  }

  return runs.length > 0 ? runs : [{ text: rawText.replace(/[\*#]/g, '') }];
}

function parseMarkdown(rawContent: string): Block[] {
  const text = cleanMathAndTypography(rawContent);
  const lines = text.split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const t = lines[i].trim();
    if (!t) {
      i++;
      continue;
    }

    // 1. Table parsing
    if (t.startsWith('|') && t.endsWith('|')) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const row = lines[i].trim();
        if (!/^[\|\-\s]+$/.test(row)) {
          rows.push(row.split('|').slice(1, -1).map(c => stripMarkdownSymbols(c)));
        }
        i++;
      }
      if (rows.length) blocks.push({ type: 'table', content: '', rows });
      continue;
    }

    // 2. Headings (# or BAGIAN / BAB)
    if (t.startsWith('# ') || /^(BAGIAN\s+[IVXLCDM\d]+|BAB\s+[IVXLCDM\d]+)/i.test(t)) {
      blocks.push({ type: 'h1', content: stripMarkdownSymbols(t.replace(/^#\s*/, '')) });
      i++;
      continue;
    }
    if (t.startsWith('## ')) {
      blocks.push({ type: 'h2', content: stripMarkdownSymbols(t.slice(3)) });
      i++;
      continue;
    }
    if (t.startsWith('### ')) {
      blocks.push({ type: 'h3', content: stripMarkdownSymbols(t.slice(4)) });
      i++;
      continue;
    }

    // Bold lines that act as section headings
    const fullBoldMatch = t.match(/^\*{2,3}(.+?)\*{2,3}$/);
    if (fullBoldMatch) {
      const inner = fullBoldMatch[1].trim();
      blocks.push({ type: 'h2', content: stripMarkdownSymbols(inner) });
      i++;
      continue;
    }

    // 3. Question identifiers: Soal 1, Soal 2, Nomor 1, Kasus 1
    if (/^(Soal\s+\d+|Nomor\s+\d+|Kasus\s+\d+|Pertanyaan\s+\d+)/i.test(t)) {
      blocks.push({ type: 'question', content: stripMarkdownSymbols(t) });
      i++;
      continue;
    }

    // 4. Answer lines: Jawaban: B. 45 meter
    if (/^(Jawaban\s*:|Kunci\s*:)/i.test(t)) {
      blocks.push({ type: 'answer', content: t });
      i++;
      continue;
    }

    // 5. Review lines: Ulasan: ... or Pembahasan: ...
    if (/^(Ulasan\s*:|Pembahasan\s*:|Penjelasan\s*:)/i.test(t)) {
      blocks.push({ type: 'review', content: t });
      i++;
      continue;
    }

    // 6. Reference lines: Referensi: ... or Daftar Referensi: ...
    if (/^(Referensi\s*:|Daftar\s+Referensi|Daftar\s+Pustaka)/i.test(t)) {
      blocks.push({ type: 'reference', content: t });
      i++;
      continue;
    }

    // 7. Divider / Horizontal rule (---, ***, ___)
    if (/^[-*_]{3,}$/.test(t)) {
      i++;
      continue;
    }

    // 8. Bullet points: - item, * item, • item
    if (/^[-*•]\s+/.test(t)) {
      const content = t.replace(/^[-*•]\s+/, '');
      blocks.push({ type: 'bullet', content });
      i++;
      continue;
    }

    // 9. Lettered sub-items: a. item or b) item
    const sm = t.match(/^([a-zA-Z])[\.\)]\s+(.+)/);
    if (sm) {
      blocks.push({ type: 'bullet', content: `**${sm[1]}.** ${sm[2]}` });
      i++;
      continue;
    }

    // 10. Numbered list items: 1. item or 1) item
    const nm = t.match(/^(\d+)[\.\)]\s+(.+)/);
    if (nm) {
      blocks.push({ type: 'numbered', content: nm[2], num: parseInt(nm[1], 10) });
      i++;
      continue;
    }

    // 11. Formula / Mathematical derivation line
    const isFormula = (
      t.length < 85 &&
      t.includes('=') &&
      !/(adalah|karena|dengan|sehingga|maka|bahwa|pada|untuk|terletak|berdasarkan)/i.test(t) &&
      /[0-9+\-*\/²³½¼√θωαβπ∂()]/i.test(t)
    );
    if (isFormula) {
      blocks.push({ type: 'formula', content: t });
      i++;
      continue;
    }

    // 12. Standard paragraph
    blocks.push({ type: 'paragraph', content: t });
    i++;
  }

  return blocks;
}

function parseLineToDocxRuns(
  rawText: string,
  docxLib: any,
  baseSize = 24,
  baseFont = 'Calibri',
  baseColor = '0f172a'
): any[] {
  const { TextRun, ImportedXmlComponent } = docxLib;
  const runs: any[] = [];
  const mathParts = rawText.split(/(\$[^$\n]+?\$)/g);

  for (const part of mathParts) {
    if (part.startsWith('$') && part.endsWith('$')) {
      const tex = part.slice(1, -1).trim();
      const ommlComp = latexToOmmlComponent(tex, ImportedXmlComponent);
      if (ommlComp) {
        runs.push(ommlComp);
      } else {
        const clean = cleanMathAndTypography(tex);
        runs.push(new TextRun({ text: clean, italics: true, size: baseSize, font: baseFont, color: baseColor }));
      }
    } else if (part) {
      const inlineRuns = parseInlineRuns(part);
      for (const ir of inlineRuns) {
        runs.push(new TextRun({
          text: ir.text,
          bold: ir.bold,
          italics: ir.italics,
          size: baseSize,
          font: baseFont,
          color: baseColor,
        }));
      }
    }
  }

  return runs.length > 0 ? runs : [new TextRun({ text: '', size: baseSize, font: baseFont })];
}

// ─── Word Generator (DOCX with Native Office Math OMML) ───────
async function buildDocx(content: string): Promise<Buffer> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImportedXmlComponent } = await import('docx');
  const docxLib = { TextRun, ImportedXmlComponent };
  const lines = content.split('\n');
  const children: InstanceType<typeof Paragraph>[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) continue;

    // Divider (---, ***, ___)
    if (/^[-*_]{3,}$/.test(line)) continue;

    // Block math $$...$$
    if (line.startsWith('$$') && line.endsWith('$$') && line.length > 4) {
      const tex = line.slice(2, -2).trim();
      const omml = latexToOmmlComponent(tex, ImportedXmlComponent);
      if (omml) {
        children.push(new Paragraph({
          children: [omml],
          indent: { left: 720 },
          spacing: { before: 80, after: 80 }
        }));
      } else {
        const clean = cleanMathAndTypography(tex);
        children.push(new Paragraph({
          children: [new TextRun({ text: clean, bold: true, size: 24, font: 'Calibri', color: '0f172a' })],
          indent: { left: 720 },
          spacing: { before: 80, after: 80 }
        }));
      }
      continue;
    }

    // Headings (#, ##, ###)
    if (/^#{1,3}\s+/.test(line)) {
      const headingText = line.replace(/^#{1,3}\s+/, '').replace(/[\*#]/g, '');
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: headingText, bold: true, size: 28, font: 'Calibri', color: '0f2944' })],
        spacing: { before: 320, after: 120 }
      }));
      continue;
    }

    // Question labels: Soal 1, Nomor 1, etc.
    if (/^(Soal\s+\d+|Nomor\s+\d+|Kasus\s+\d+)/i.test(line)) {
      children.push(new Paragraph({
        children: [new TextRun({ text: line.replace(/[\*#]/g, ''), bold: true, size: 26, font: 'Calibri', color: '0f2944' })],
        spacing: { before: 260, after: 80 }
      }));
      continue;
    }

    // Answer lines: Jawaban: B. ...
    if (/^(Jawaban\s*:|Kunci\s*:)/i.test(line)) {
      const colonIdx = line.indexOf(':');
      const prefix = line.slice(0, colonIdx + 1);
      const rest = line.slice(colonIdx + 1);
      children.push(new Paragraph({
        children: [
          new TextRun({ text: prefix, bold: true, size: 24, font: 'Calibri', color: '1e3a8a' }),
          ...parseLineToDocxRuns(rest, docxLib, 24, 'Calibri', '0f172a')
        ],
        spacing: { before: 60, after: 60 }
      }));
      continue;
    }

    // Review / Discussion lines
    if (/^(Ulasan\s*:|Pembahasan\s*:|Penjelasan\s*:)/i.test(line)) {
      const colonIdx = line.indexOf(':');
      const prefix = line.slice(0, colonIdx + 1);
      const rest = line.slice(colonIdx + 1);
      children.push(new Paragraph({
        children: [
          new TextRun({ text: prefix + ' ', bold: true, size: 24, font: 'Calibri', color: '0f172a' }),
          ...parseLineToDocxRuns(rest.trimStart(), docxLib, 24, 'Calibri', '1e293b')
        ],
        spacing: { before: 60, after: 60, line: 340 },
        alignment: AlignmentType.JUSTIFIED
      }));
      continue;
    }

    // Reference lines
    if (/^(Referensi\s*:|Daftar\s+Referensi|Daftar\s+Pustaka)/i.test(line)) {
      children.push(new Paragraph({
        children: [new TextRun({ text: line.replace(/[\*#]/g, ''), italics: true, size: 21, font: 'Calibri', color: '475569' })],
        spacing: { before: 40, after: 180 }
      }));
      continue;
    }

    // Bullets (- item, * item, • item)
    const isBullet = /^[-*•]\s+/.test(line);
    if (isBullet) {
      line = line.replace(/^[-*•]\s+/, '');
    }

    // Sub-items (a. item or b) item)
    const sm = line.match(/^([a-zA-Z])[\.\)]\s+(.+)/);
    if (sm) {
      const runs = parseLineToDocxRuns(`**${sm[1]}.** ${sm[2]}`, docxLib, 24, 'Calibri', '1e293b');
      children.push(new Paragraph({
        children: runs,
        bullet: { level: 0 },
        indent: { left: 400 },
        spacing: { before: 60, after: 60, line: 320 }
      }));
      continue;
    }

    // Standard paragraph or bullet line
    const runs = parseLineToDocxRuns(line, docxLib, 24, 'Calibri', isBullet ? '1e293b' : '0f172a');
    children.push(new Paragraph({
      children: runs,
      bullet: isBullet ? { level: 0 } : undefined,
      indent: isBullet ? { left: 400 } : undefined,
      spacing: { before: 70, after: 70, line: 340 },
      alignment: isBullet ? undefined : AlignmentType.JUSTIFIED
    }));
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
        }
      },
      children
    }]
  });

  return await Packer.toBuffer(doc);
}



// ─── Excel Generator (XLSX) ──────────────────────────────────
async function buildXlsx(content: string): Promise<Buffer> {
  const XLSX = await import('xlsx');
  const blocks = parseMarkdown(content);
  const wb = XLSX.utils.book_new();
  const tables = blocks.filter(b => b.type === 'table' && b.rows?.length);

  if (tables.length > 0) {
    tables.forEach((t, idx) => {
      const cleanRows = t.rows!.map(r => r.map(c => stripMarkdownSymbols(c)));
      const ws = XLSX.utils.aoa_to_sheet(cleanRows);
      ws['!cols'] = Array.from({ length: (cleanRows[0] || []).length }, () => ({ wch: 30 }));
      XLSX.utils.book_append_sheet(wb, ws, `Tabel ${idx + 1}`);
    });
  } else {
    const rows: (string | number)[][] = [['No.', 'Konten', 'Keterangan']];
    let no = 1;
    for (const b of blocks) {
      const clean = stripMarkdownSymbols(b.content);
      if (b.type === 'h1' || b.type === 'h2' || b.type === 'h3') {
        rows.push(['', `=== ${clean} ===`, '']);
      } else if (b.type === 'paragraph' && clean) {
        rows.push([no++, clean, 'Paragraf']);
      } else if (b.type === 'bullet' && clean) {
        rows.push([no++, `• ${clean}`, 'Poin']);
      } else if (b.type === 'numbered' && clean) {
        rows.push([b.num ?? no++, clean, 'Nomor']);
      }
    }
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 6 }, { wch: 80 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Konten');
  }

  return Buffer.from(XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }));
}

// ─── PowerPoint Generator (PPTX) ─────────────────────────────
async function buildPptx(content: string, title: string): Promise<Buffer> {
  const PptxGenJS = (await import('pptxgenjs')).default;
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  const NAVY = '0f2944'; const BLUE = '1d4ed8'; const WHITE = 'FFFFFF'; const DARK = '0f172a'; const LGRAY = 'f8fafc';
  const blocks = parseMarkdown(content);
  const titleBlock = blocks.find(b => b.type === 'h1' || b.type === 'h2');
  interface SlideData { title: string; items: { text: string; isBullet: boolean }[] }
  const slides: SlideData[] = [];
  let cur: SlideData | null = null;

  for (const block of blocks) {
    if (block.type === 'h1') continue;
    if (block.type === 'h2' || block.type === 'h3') {
      if (cur) slides.push(cur);
      cur = { title: stripMarkdownSymbols(block.content), items: [] };
    } else if (cur) {
      const clean = stripMarkdownSymbols(block.content);
      if (clean) {
        if (block.type === 'bullet' || block.type === 'numbered') cur.items.push({ text: clean, isBullet: true });
        else if (block.type === 'paragraph' && clean.length > 2) cur.items.push({ text: clean, isBullet: false });
      }
    } else if (block.type === 'paragraph') {
      const clean = stripMarkdownSymbols(block.content);
      if (clean && clean.length > 2) {
        if (!cur) cur = { title: 'Pendahuluan', items: [] };
        cur.items.push({ text: clean, isBullet: false });
      }
    }
  }
  if (cur) slides.push(cur);

  // Title slide (Clean academic presentation — NO AI watermark/branding)
  const ts = pptx.addSlide();
  ts.background = { fill: NAVY };
  ts.addShape('RECTANGLE' as any, { x: 0, y: 4.2, w: '100%', h: 0.07, fill: { color: BLUE }, line: { type: 'none' as any } });
  const cleanTitle = stripMarkdownSymbols(titleBlock?.content || title.replace(/_/g, ' '));
  ts.addText(cleanTitle, { x: 0.8, y: 1.8, w: 8.4, h: 2.0, fontSize: 32, bold: true, color: WHITE, align: 'center', fontFace: 'Calibri', wrap: true });

  // Content slides
  slides.forEach((slide, idx) => {
    const s = pptx.addSlide();
    s.background = { fill: LGRAY };
    s.addShape('RECTANGLE' as any, { x: 0, y: 0, w: '100%', h: 1.15, fill: { color: NAVY }, line: { type: 'none' as any } });
    s.addShape('RECTANGLE' as any, { x: 0, y: 1.15, w: '100%', h: 0.05, fill: { color: BLUE }, line: { type: 'none' as any } });
    s.addText(slide.title, { x: 0.4, y: 0.1, w: 8.8, h: 1.0, fontSize: 22, bold: true, color: WHITE, valign: 'middle', fontFace: 'Calibri', wrap: true });
    if (slide.items.length > 0) {
      const textItems = slide.items.map(item => ({
        text: item.text,
        options: {
          bullet: item.isBullet ? { type: 'bullet' as any, color: BLUE, indent: 15 } : false,
          fontSize: 15,
          color: DARK,
          breakLine: true,
          paraSpaceBefore: item.isBullet ? 4 : 8,
          paraSpaceAfter: item.isBullet ? 2 : 6,
        },
      }));
      s.addText(textItems as any, { x: 0.55, y: 1.3, w: 8.9, h: 5.2, valign: 'top', fontFace: 'Calibri' });
    }
    s.addText(`${idx + 1}`, { x: 9.0, y: 6.8, w: 0.5, h: 0.3, fontSize: 9, color: '94a3b8', align: 'right' });
  });

  return Buffer.from(await pptx.write({ outputType: 'nodebuffer' } as any) as ArrayBuffer);
}

// ─── PDF Generator ───────────────────────────────────────────
async function buildPdf(content: string): Promise<Buffer> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const blocks = parseMarkdown(content);
  const ML = 25; const W = 160; let y = 25;
  const addPage = (h: number) => {
    if (y + h > 270) {
      doc.addPage();
      y = 25;
    }
  };

  // Standard academic paper layout: pure clean page, no headers, no watermarks
  for (const block of blocks) {
    switch (block.type) {
      case 'h1': {
        const clean = pdfSafeText(stripMarkdownSymbols(block.content));
        addPage(14);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 41, 68);
        const l = doc.splitTextToSize(clean, W);
        doc.text(l, ML, y);
        y += l.length * 7 + 4;
        break;
      }
      case 'h2': {
        const clean = pdfSafeText(stripMarkdownSymbols(block.content));
        addPage(12);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        const l = doc.splitTextToSize(clean, W);
        doc.text(l, ML, y);
        y += l.length * 6.5 + 3;
        break;
      }
      case 'h3': {
        const clean = pdfSafeText(stripMarkdownSymbols(block.content));
        addPage(10);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(51, 65, 85);
        const l = doc.splitTextToSize(clean, W);
        doc.text(l, ML, y);
        y += l.length * 6 + 2;
        break;
      }
      case 'question': {
        const clean = pdfSafeText(stripMarkdownSymbols(block.content));
        addPage(11);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 41, 68);
        const l = doc.splitTextToSize(clean, W);
        doc.text(l, ML, y);
        y += l.length * 6.5 + 2.5;
        break;
      }
      case 'answer': {
        const clean = pdfSafeText(stripMarkdownSymbols(block.content));
        addPage(8);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 58, 138);
        const l = doc.splitTextToSize(clean, W);
        doc.text(l, ML, y);
        y += l.length * 5.8 + 2;
        break;
      }
      case 'review': {
        const clean = pdfSafeText(stripMarkdownSymbols(block.content));
        addPage(8);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(15, 23, 42);
        const l = doc.splitTextToSize(clean, W);
        doc.text(l, ML, y);
        y += l.length * 5.8 + 2;
        break;
      }
      case 'reference': {
        const clean = pdfSafeText(stripMarkdownSymbols(block.content));
        addPage(8);
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(71, 85, 105);
        const l = doc.splitTextToSize(clean, W);
        doc.text(l, ML, y);
        y += l.length * 5.2 + 4;
        break;
      }
      case 'formula': {
        const clean = pdfSafeText(stripMarkdownSymbols(block.content));
        addPage(7);
        doc.setFontSize(10.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        const l = doc.splitTextToSize(clean, W - 10);
        doc.text(l, ML + 10, y);
        y += l.length * 5.5 + 2;
        break;
      }
      case 'paragraph': {
        const clean = pdfSafeText(stripMarkdownSymbols(block.content));
        if (!clean) break;
        addPage(8);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(15, 23, 42);
        const l = doc.splitTextToSize(clean, W);
        doc.text(l, ML, y);
        y += l.length * 5.8 + 3;
        break;
      }
      case 'bullet': {
        const clean = pdfSafeText(stripMarkdownSymbols(block.content));
        addPage(7);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(15, 23, 42);
        doc.setFillColor(71, 85, 105);
        doc.circle(ML + 1.5, y - 1.5, 0.8, 'F');
        const l = doc.splitTextToSize(clean, W - 8);
        doc.text(l, ML + 6, y);
        y += l.length * 5.8 + 2;
        break;
      }
      case 'numbered': {
        const clean = pdfSafeText(stripMarkdownSymbols(block.content));
        addPage(7);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(`${block.num}.`, ML, y);
        doc.setFont('helvetica', 'normal');
        const l = doc.splitTextToSize(clean, W - 9);
        doc.text(l, ML + 9, y);
        y += l.length * 5.8 + 2;
        break;
      }
      case 'table':
        if (block.rows) {
          for (const [ri, row] of block.rows.entries()) {
            addPage(7);
            doc.setFontSize(10);
            doc.setFont('helvetica', ri === 0 ? 'bold' : 'normal');
            doc.setTextColor(15, 23, 42);
            doc.text(row.map(c => pdfSafeText(stripMarkdownSymbols(c))).join('  |  ').slice(0, 110), ML, y);
            y += 6.5;
          }
          y += 3;
        }
        break;
    }
  }

  // Discrete page number footer
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`${p}`, 105, 287, { align: 'center' });
  }

  return Buffer.from(doc.output('arraybuffer'));
}

// ─── MIME Types ──────────────────────────────────────────────
const MIME: Record<string, string> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  pdf: 'application/pdf',
};

// ─── Route Handler ───────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { content, filename, type } = await req.json();

    if (!content || !type) {
      return NextResponse.json({ error: 'content and type required' }, { status: 400 });
    }

    const cleanName = (filename || 'Jawaban').replace(/\s+/g, '_');
    let buffer: Buffer;

    switch (type) {
      case 'docx': buffer = await buildDocx(content); break;
      case 'xlsx': buffer = await buildXlsx(content); break;
      case 'pptx': buffer = await buildPptx(content, cleanName); break;
      case 'pdf':  buffer = await buildPdf(content); break;
      default: return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    const ext = type;
    const finalName = cleanName.endsWith(`.${ext}`) ? cleanName : `${cleanName}.${ext}`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': MIME[type] || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${finalName}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (err: any) {
    console.error('generate-file error:', err);
    return NextResponse.json({ error: err.message || 'File generation failed' }, { status: 500 });
  }
}
