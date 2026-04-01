import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";

// Point pdf.js worker to the CDN (avoids bundler issues)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// ── TXT ───────────────────────────────────────────────────────────────────────
const extractTxt = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });

// ── JSON ──────────────────────────────────────────────────────────────────────
const extractJson = async (file) => {
  const text = await extractTxt(file);
  try {
    const parsed = JSON.parse(text);
    // Pretty-print so AI can read it clearly
    return JSON.stringify(parsed, null, 2);
  } catch {
    return text; // return raw if not valid JSON
  }
};

// ── DOCX ──────────────────────────────────────────────────────────────────────
const extractDocx = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const result = await mammoth.extractRawText({ arrayBuffer: e.target.result });
        resolve(result.value);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });

// ── PDF ───────────────────────────────────────────────────────────────────────
const extractPdf = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(" ");
    fullText += pageText + "\n";
  }

  return fullText.trim();
};

// ── MAIN EXTRACTOR ────────────────────────────────────────────────────────────
export const extractTextFromFile = async (file) => {
  const ext = file.name.split(".").pop().toLowerCase();

  switch (ext) {
    case "txt":  return await extractTxt(file);
    case "json": return await extractJson(file);
    case "docx": return await extractDocx(file);
    case "pdf":  return await extractPdf(file);
    default:
      throw new Error(`Unsupported file type: .${ext}`);
  }
};