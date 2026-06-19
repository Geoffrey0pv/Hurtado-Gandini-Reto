// src/lib/ocr.ts — Texto de PDF + fallback OCR.
// 1) pdf-parse (PDF con capa de texto nativa). 2) Si el texto es escaso
//    (PDF escaneado), fallback a tesseract.js en espaniol.
import { PDFParse } from "pdf-parse";

export interface ExtractTextResult {
  text: string;
  method: "pdf-parse" | "ocr" | "none";
  chars: number;
}

// Umbral: por debajo de esto asumimos PDF escaneado y vamos a OCR.
const MIN_TEXT_CHARS = 100;

export async function extractTextFromPdf(buffer: Buffer): Promise<ExtractTextResult> {
  // 1) Intento de texto nativo.
  let nativeText = "";
  try {
    const parser = new PDFParse({ data: buffer });
    const res = await parser.getText();
    nativeText = (res.text ?? "").trim();
  } catch {
    nativeText = "";
  }

  if (nativeText.length >= MIN_TEXT_CHARS) {
    return { text: nativeText, method: "pdf-parse", chars: nativeText.length };
  }

  // 2) Fallback OCR (lento; solo cuando el texto nativo es insuficiente).
  try {
    const ocrText = (await ocrPdf(buffer)).trim();
    if (ocrText.length > nativeText.length) {
      return { text: ocrText, method: "ocr", chars: ocrText.length };
    }
  } catch {
    // si OCR falla, devolvemos lo poco que haya del texto nativo
  }

  return {
    text: nativeText,
    method: nativeText ? "pdf-parse" : "none",
    chars: nativeText.length,
  };
}

// OCR de un PDF escaneado: renderiza paginas a imagen y reconoce con tesseract.
// pdf-parse@2 expone getScreenshot() para rasterizar las paginas.
async function ocrPdf(buffer: Buffer): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const parser = new PDFParse({ data: buffer });
  const shot = await parser.getScreenshot();

  const worker = await createWorker("spa");
  try {
    let out = "";
    for (const page of shot.pages ?? []) {
      // page.data es el PNG (Uint8Array) de la pagina rasterizada.
      const { data } = await worker.recognize(Buffer.from(page.data));
      out += data.text + "\n";
    }
    return out;
  } finally {
    await worker.terminate();
  }
}
