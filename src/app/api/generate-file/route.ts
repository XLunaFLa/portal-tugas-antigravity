import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

// ─── Markdown Parser (Server-side copy) ─────────────────────
type BlockType = 'h1' | 'h2' | 'h3' | 'paragraph' | 'bullet' | 'numbered' | 'table' | 'empty';
interface Block { type: BlockType; content: string; num?: number; rows?: string[][] }

function strip(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1').replace(/\[(.+?)\]\(.+?\)/g, '$1').trim();
}

function parseMarkdown(text: string): Block[] {
  const lines = text.split('\n');
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const t = lines[i].trim();
    if (!t) { blocks.push({ type: 'empty', content: '' }); i++; continue; }
    if (t.startsWith('|') && t.endsWith('|')) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const row = lines[i].trim();
        if (!/^[\|\-\s]+$/.test(row)) rows.push(row.split('|').slice(1, -1).map(c => strip(c)));
        i++;
      }
      if (rows.length) blocks.push({ type: 'table', content: '', rows });
      continue;
    }
    if (t.startsWith('# '))   { blocks.push({ type: 'h1', content: strip(t.slice(2)) }); i++; continue; }
    if (t.startsWith('## '))  { blocks.push({ type: 'h2', content: strip(t.slice(3)) }); i++; continue; }
    if (t.startsWith('### ')) { blocks.push({ type: 'h3', content: strip(t.slice(4)) }); i++; continue; }
    if (t.startsWith('- ') || t.startsWith('* ') || t.startsWith('• '))
      { blocks.push({ type: 'bullet', content: strip(t.slice(2)) }); i++; continue; }
    const nm = t.match(/^(\d+)\.\s+(.+)/);
    if (nm) { blocks.push({ type: 'numbered', content: strip(nm[2]), num: parseInt(nm[1]) }); i++; continue; }
    blocks.push({ type: 'paragraph', content: t });
    i++;
  }
  return blocks;
}

// ─── Word Generator ──────────────────────────────────────────
async function buildDocx(content: string): Promise<Buffer> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import('docx');
  const blocks = parseMarkdown(content);
  const children: InstanceType<typeof Paragraph>[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case 'h1': children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: block.content, bold: true, size: 36, color: '0f2944' })], spacing: { before: 480, after: 240 } })); break;
      case 'h2': children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: block.content, bold: true, size: 28, color: '1d4ed8' })], spacing: { before: 360, after: 180 } })); break;
      case 'h3': children.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text: block.content, bold: true, size: 24, color: '1e40af' })], spacing: { before: 280, after: 120 } })); break;
      case 'paragraph': children.push(new Paragraph({ children: [new TextRun({ text: block.content, size: 24 })], spacing: { before: 120, after: 120, line: 360 }, alignment: AlignmentType.JUSTIFIED })); break;
      case 'bullet': children.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: block.content, size: 24 })], spacing: { before: 60, after: 60 } })); break;
      case 'numbered': children.push(new Paragraph({ numbering: { reference: 'num-list', level: 0 }, children: [new TextRun({ text: block.content, size: 24 })], spacing: { before: 60, after: 60 } })); break;
      case 'empty': children.push(new Paragraph({ children: [new TextRun({ text: '', size: 18 })], spacing: { before: 0, after: 0 } })); break;
      case 'table': if (block.rows) { for (const [ri, row] of block.rows.entries()) children.push(new Paragraph({ children: [new TextRun({ text: row.join('  |  '), size: 22, bold: ri === 0 })], spacing: { before: 40, after: 40 } })); } break;
    }
  }

  const doc = new Document({
    numbering: { config: [{ reference: 'num-list', levels: [{ level: 0, format: 'decimal' as any, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }] },
    sections: [{ properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1800 } } }, children }],
  });
  return Packer.toBuffer(doc);
}

// ─── Excel Generator ─────────────────────────────────────────
async function buildXlsx(content: string): Promise<Buffer> {
  const XLSX = await import('xlsx');
  const blocks = parseMarkdown(content);
  const wb = XLSX.utils.book_new();
  const tables = blocks.filter(b => b.type === 'table' && b.rows?.length);
  if (tables.length > 0) {
    tables.forEach((t, idx) => {
      const ws = XLSX.utils.aoa_to_sheet(t.rows!);
      ws['!cols'] = Array.from({ length: (t.rows![0] || []).length }, () => ({ wch: 30 }));
      XLSX.utils.book_append_sheet(wb, ws, `Tabel ${idx + 1}`);
    });
  } else {
    const rows: (string | number)[][] = [['No.', 'Konten', 'Keterangan']];
    let no = 1;
    for (const b of blocks) {
      if (b.type === 'h1' || b.type === 'h2' || b.type === 'h3') rows.push(['', `=== ${b.content} ===`, '']);
      else if (b.type === 'paragraph') rows.push([no++, b.content, 'Paragraf']);
      else if (b.type === 'bullet') rows.push([no++, `• ${b.content}`, 'Poin']);
      else if (b.type === 'numbered') rows.push([b.num ?? no++, b.content, 'Nomor']);
    }
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 6 }, { wch: 80 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Konten');
  }
  return Buffer.from(XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }));
}

// ─── PowerPoint Generator ────────────────────────────────────
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
    if (block.type === 'h2' || block.type === 'h3') { if (cur) slides.push(cur); cur = { title: block.content, items: [] }; }
    else if (cur) {
      if (block.type === 'bullet' || block.type === 'numbered') cur.items.push({ text: block.content, isBullet: true });
      else if (block.type === 'paragraph' && block.content.length > 2) cur.items.push({ text: block.content, isBullet: false });
    } else if (block.type === 'paragraph' && block.content.length > 2) {
      if (!cur) cur = { title: 'Pendahuluan', items: [] };
      cur.items.push({ text: block.content, isBullet: false });
    }
  }
  if (cur) slides.push(cur);
  // Title slide
  const ts = pptx.addSlide();
  ts.background = { fill: NAVY };
  ts.addShape('RECTANGLE' as any, { x: 0, y: 4.2, w: '100%', h: 0.07, fill: { color: BLUE }, line: { type: 'none' as any } });
  ts.addText(titleBlock?.content || title, { x: 0.8, y: 1.4, w: 8.4, h: 2.0, fontSize: 34, bold: true, color: WHITE, align: 'center', fontFace: 'Calibri', wrap: true });
  ts.addText('Portal Tugas Antigravity', { x: 0.8, y: 3.6, w: 8.4, h: 0.5, fontSize: 13, color: 'a0c4ff', align: 'center', italic: true, fontFace: 'Calibri' });
  // Content slides
  slides.forEach((slide, idx) => {
    const s = pptx.addSlide();
    s.background = { fill: LGRAY };
    s.addShape('RECTANGLE' as any, { x: 0, y: 0, w: '100%', h: 1.15, fill: { color: NAVY }, line: { type: 'none' as any } });
    s.addShape('RECTANGLE' as any, { x: 0, y: 1.15, w: '100%', h: 0.05, fill: { color: BLUE }, line: { type: 'none' as any } });
    s.addText(slide.title, { x: 0.4, y: 0.1, w: 8.8, h: 1.0, fontSize: 22, bold: true, color: WHITE, valign: 'middle', fontFace: 'Calibri', wrap: true });
    if (slide.items.length > 0) {
      const textItems = slide.items.map(item => ({ text: item.text, options: { bullet: item.isBullet ? { type: 'bullet' as any, color: BLUE, indent: 15 } : false, fontSize: 15, color: DARK, breakLine: true, paraSpaceBefore: item.isBullet ? 4 : 8, paraSpaceAfter: item.isBullet ? 2 : 6 } }));
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
  const ML = 25; const W = 160; let y = 30;
  const addPage = (h: number) => { if (y + h > 277) { doc.addPage(); y = 20; } };
  doc.setFillColor(15, 41, 68); doc.rect(0, 0, 210, 12, 'F');
  doc.setFillColor(29, 78, 216); doc.rect(0, 12, 210, 1.5, 'F');
  doc.setFontSize(10); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'normal');
  doc.text('Antigravity Academic Assistant', ML, 8);
  y = 22;
  for (const block of blocks) {
    switch (block.type) {
      case 'h1': addPage(14); doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 41, 68); { const l = doc.splitTextToSize(block.content, W); doc.text(l, ML, y); y += l.length * 8 + 4; } break;
      case 'h2': addPage(12); doc.setFontSize(15); doc.setFont('helvetica', 'bold'); doc.setTextColor(29, 78, 216); { const l = doc.splitTextToSize(block.content, W); doc.text(l, ML, y); y += l.length * 7 + 1; doc.setDrawColor(29, 78, 216); doc.setLineWidth(0.3); doc.line(ML, y, ML + W, y); y += 3; } break;
      case 'h3': addPage(10); doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 64, 175); { const l = doc.splitTextToSize(block.content, W); doc.text(l, ML, y); y += l.length * 6.5 + 2; } break;
      case 'paragraph': addPage(8); doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(15, 23, 42); { const l = doc.splitTextToSize(block.content, W); doc.text(l, ML, y); y += l.length * 6 + 3; } break;
      case 'bullet': addPage(7); doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(15, 23, 42); doc.setFillColor(29, 78, 216); doc.circle(ML + 1.8, y - 1.8, 1, 'F'); { const l = doc.splitTextToSize(block.content, W - 8); doc.text(l, ML + 6, y); y += l.length * 6 + 2; } break;
      case 'numbered': addPage(7); doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42); doc.text(`${block.num}.`, ML, y); doc.setFont('helvetica', 'normal'); { const l = doc.splitTextToSize(block.content, W - 9); doc.text(l, ML + 9, y); y += l.length * 6 + 2; } break;
      case 'table': if (block.rows) { for (const [ri, row] of block.rows.entries()) { addPage(7); doc.setFontSize(10); doc.setFont('helvetica', ri === 0 ? 'bold' : 'normal'); doc.setTextColor(15, 23, 42); doc.text(row.join('  |  ').slice(0, 110), ML, y); y += 6.5; } y += 3; } break;
      case 'empty': y += 3; break;
    }
  }
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) { doc.setPage(p); doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(148, 163, 184); doc.text(`Halaman ${p} / ${pageCount}`, 105, 292, { align: 'center' }); }
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
