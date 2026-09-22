// ============================================================
// Antigravity File Generator — Client-side module
// File generation is delegated to /api/generate-file (server-side)
// so browser bundle stays lean and Node.js libs stay server-only
// ============================================================

export type FileType = 'docx' | 'xlsx' | 'pptx' | 'pdf';

// ─── Keyword Detection ───────────────────────────────────────
export function detectRequestedFileType(prompt: string): FileType | null {
  const p = prompt.toLowerCase();
  const hasIntent = /\b(jadikan|buat|buatkan|format|dalam bentuk|hasilkan|generate|simpan|unduh|download)\b/.test(p);
  if (/\b(word|docx|doc)\b/.test(p) && (hasIntent || /\bfile\b/.test(p))) return 'docx';
  if (/\b(excel|xlsx|spreadsheet|lembar kerja)\b/.test(p) && (hasIntent || /\b(file|tabel)\b/.test(p))) return 'xlsx';
  if (/\b(powerpoint|pptx|ppt|presentasi|slide)\b/.test(p) && (hasIntent || /\bfile\b/.test(p))) return 'pptx';
  if (/\bpdf\b/.test(p) && (hasIntent || /\b(file|unduh|download)\b/.test(p))) return 'pdf';
  return null;
}

export function fileTypeLabel(type: FileType): string {
  return { docx: 'Word (.docx)', xlsx: 'Excel (.xlsx)', pptx: 'PowerPoint (.pptx)', pdf: 'PDF (.pdf)' }[type];
}

export function fileTypeEmoji(type: FileType): string {
  return { docx: '📄', xlsx: '📊', pptx: '📑', pdf: '🔴' }[type];
}

// ─── Download via Server API ─────────────────────────────────
// All file generation happens on the server at /api/generate-file
// Client just fetches the blob and triggers browser download
async function downloadViaApi(content: string, filename: string, type: FileType): Promise<void> {
  const cleanName = filename.trim().replace(/\s+/g, '_') || 'Jawaban_Tugas';
  const finalName = cleanName.endsWith(`.${type}`) ? cleanName : `${cleanName}.${type}`;

  const res = await fetch('/api/generate-file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, filename: cleanName, type }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Gagal membuat file' }));
    throw new Error(err.error || 'Gagal membuat file');
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = finalName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 300);
}

export const downloadAsWord  = (c: string, f: string) => downloadViaApi(c, f, 'docx');
export const downloadAsExcel = (c: string, f: string) => downloadViaApi(c, f, 'xlsx');
export const downloadAsPptx  = (c: string, f: string) => downloadViaApi(c, f, 'pptx');
export const downloadAsPdf   = (c: string, f: string) => downloadViaApi(c, f, 'pdf');
