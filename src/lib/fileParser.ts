// ============================================================
// Antigravity Document Parser (Server-side)
// Extracts text from PDF, DOCX, XLSX, TXT, CSV, etc.
// ============================================================

export interface ParsedDocumentResult {
  text: string;
  charCount: number;
  wordCount: number;
  fileName: string;
  fileType: string;
}

export async function parseDocumentBuffer(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<ParsedDocumentResult> {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  let extractedText = '';

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

  // 2. Word Documents (.docx)
  else if (ext === 'docx' || mimeType.includes('wordprocessingml')) {
    try {
      const mammoth = await import('mammoth');
      const res = await mammoth.extractRawText({ buffer });
      extractedText = res.value || '';
    } catch (docxErr: any) {
      console.warn('DOCX parsing error:', docxErr.message);
      extractedText = `[Gagal membaca dokumen Word: ${docxErr.message}]`;
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
  };
}
