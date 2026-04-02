import { generateResponse } from "../services/ollamaService.js";
import { combinedSearch } from "../services/searchService.js";
import { searchImages } from "../services/imageService.js";

const NOTES_SYSTEM = `You are a world-class educator and note-taking expert. Your notes are comprehensive, accurate, and beautifully structured.`;

const ANSWER_SYSTEM = `You are an expert tutor and examiner. You give complete, exam-ready answers that cover every aspect of the question. Never cut answers short.`;

// ── Generate Notes ─────────────────────────────────────────────────────────────
export const generateNotes = async (req, res) => {
  try {
    const { prompt } = req.body;

    const [searchResults, images] = await Promise.all([
      combinedSearch(prompt),
      searchImages(prompt, 6),
    ]);

    const webContext = searchResults.length
      ? `\n--- Web context ---\n` + searchResults.map((r) => `[${r.source}] ${r.title}: ${r.snippet}`).join("\n")
      : "";

    const notesPrompt = `${NOTES_SYSTEM}
${webContext}

Generate thorough, well-structured notes on: "${prompt}"

STRICT FORMAT RULES:
- # Main title
- ## Major sections (at least 4-6 sections)
- ### Subsections where needed
- **Bold** all key terms and definitions
- Use bullet points (- ) for lists, numbered lists for steps/sequences
- Add a comparison table (| Col | Col |) wherever two or more things can be compared
- Use > blockquotes for important tips, warnings, or key insights
- Use \`inline code\` for technical terms, formulas, or code
- Use \`\`\`language blocks for multi-line code or formulas
- Add --- between major sections
- ## Summary at the end with 5-7 key takeaways as bullet points
- Be exhaustive — cover history, theory, practical use, examples, and common mistakes`;

    const notes = await generateResponse(notesPrompt);
    res.json({ notes, searchResults, images });
  } catch (err) {
    console.error("generateNotes error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ── Parse Questions from File ──────────────────────────────────────────────────
export const parseQuestions = async (req, res) => {
  try {
    const { text } = req.body;

    const parsePrompt = `Extract every question or topic from the text below.
Return ONLY a raw JSON array of strings. No explanation, no markdown, no preamble.
Example: ["What is X?", "Explain Y", "Define Z"]

Text:
${text.slice(0, 4000)}`;

    const raw = await generateResponse(parsePrompt);

    let questions = [];
    try {
      const cleaned = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      questions = Array.isArray(parsed) ? parsed : [];
    } catch {
      questions = raw
        .split("\n")
        .map((l) => l.replace(/^[\d\-\.\*\[\]"]+\s*/, "").replace(/[",$]+$/, "").trim())
        .filter((l) => l.length > 5);
    }

    res.json({ questions });
  } catch (err) {
    console.error("parseQuestions error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ── Answer Single Question ─────────────────────────────────────────────────────
export const answerQuestion = async (req, res) => {
  try {
    const { question } = req.body;

    const [searchResults, images] = await Promise.all([
      combinedSearch(question),
      searchImages(question, 4),
    ]);

    const webContext = searchResults.length
      ? `\n--- Web context ---\n` + searchResults.map((r) => `[${r.source}] ${r.title}: ${r.snippet}`).join("\n") + "\n"
      : "";

    const answerPrompt = `${ANSWER_SYSTEM}
${webContext}

Answer this question completely and in full detail: "${question}"

FORMAT RULES:
- Use ## headings to organize your answer into clear sections
- Use **bold** for key terms and definitions
- Use bullet points and numbered lists for clarity
- Include a comparison table if the question involves comparing things
- Include worked examples where relevant
- Use \`code blocks\` for any code, formulas, or commands
- Do NOT cut the answer short — cover every aspect
- End with ## Key Takeaways (5 bullet points summarizing the most important points)`;

    const answer = await generateResponse(answerPrompt);
    res.json({ answer, searchResults, images });
  } catch (err) {
    console.error("answerQuestion error:", err);
    res.status(500).json({ error: err.message });
  }
};