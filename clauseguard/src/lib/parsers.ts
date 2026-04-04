import mammoth from 'mammoth';

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  // pdf-parse v2 has private type annotations on some methods, use dynamic import
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: new Uint8Array(buffer) }) as any;
  await parser.load();
  const text: string = await parser.getText();
  parser.destroy();
  return text;
}

export async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

export async function extractText(buffer: Buffer, fileType: string): Promise<string> {
  if (fileType === 'application/pdf' || fileType.endsWith('.pdf')) {
    return extractTextFromPDF(buffer);
  }
  if (
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileType.endsWith('.docx')
  ) {
    return extractTextFromDOCX(buffer);
  }
  throw new Error('Unsupported file type. Please upload a PDF or DOCX file.');
}
