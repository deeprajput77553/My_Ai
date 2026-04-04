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
- **Bold** key terms (NEVER use code blocks for simple text)
- Use bullet points (- ) and numbered lists for clarity
- Use tables (| Col | Col |) for any comparison
- Use > blockquotes for important tips or hints
- Use \`\`\`info code blocks ONLY for the final "Summary" or "Key Takeaways" section.
- Use \`\`\`language blocks ONLY for actual multi-line code snippets
- Be exhaustive — cover history, theory, examples, and common mistakes
- ## Summary at the end inside an \`\`\`info block
`;

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

    const parsePrompt = `You are a curriculum designer. Analyze the text below and extract a list of the most important questions, topics, or key concepts that should be explained in detail.
Focus on identifying:
1. Core concepts and definitions.
2. "How" and "Why" questions that explain processes.
3. Comparative topics (X vs Y).
4. Major themes or structural components of the text.

Return ONLY a raw JSON array of strings. No explanation, no markdown, no preamble.
Example: ["Concept A", "How process B works", "What is C?", "Comparison between D and E"]

Text:
${text.slice(0, 5000)}`;

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
- Use **bold** for key terms (NEVER use code blocks for simple text)
- Use bullet points and numbered lists for clarity
- Include a comparison table if relevant
- Use \`code blocks\` ONLY for actual code, formulas, or commands.
- Wrap the final "Key Takeaways" section in an \`\`\`info block for a cleaner look.
- Do NOT cut the answer short — cover every aspect
- End with ## Key Takeaways
`;

    const answer = await generateResponse(answerPrompt);
    res.json({ answer, searchResults, images });
  } catch (err) {
    console.error("answerQuestion error:", err);
    res.status(500).json({ error: err.message });
  }
};