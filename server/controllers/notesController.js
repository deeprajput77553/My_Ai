import { generateResponse } from "../services/ollamaService.js";
import { combinedSearch } from "../services/searchService.js";
import { searchImages } from "../services/imageService.js";

// ── Generate Notes ─────────────────────────────────────────────────────────────
export const generateNotes = async (req, res) => {
  try {
    const { prompt } = req.body;

    // Fetch web context + images in parallel
    const [searchResults, images] = await Promise.all([
      combinedSearch(prompt),
      searchImages(prompt, 6),
    ]);

    const webContext = searchResults.length
      ? `\n\nAdditional web context:\n` +
        searchResults.map((r) => `- ${r.title}: ${r.snippet}`).join("\n")
      : "";

    const notesPrompt = `You are an expert note-taking assistant. Generate comprehensive, well-structured notes on the following topic.
${webContext}

STRICT RULES:
- Always respond in clean Markdown format
- Use # for main title, ## for sections, ### for subsections
- Use bullet points (- ) for lists
- Use **bold** for key terms
- Use tables where comparisons are needed (always with a proper header row separated by |---|)
- Use > blockquotes for important notes or tips
- Use \`code\` for technical terms or inline code
- Use --- to separate major sections
- Never write plain prose without structure
- End with a ## Summary section

Topic: ${prompt}`;

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

    const parsePrompt = `You are a question extraction assistant. Read the following text and extract all questions or topics that need to be answered or explained.

RULES:
- Return ONLY a JSON array of strings, nothing else
- Each string is one question or topic
- If the text contains numbered questions, extract each one
- If the text contains topics/assignments, treat each as a question
- Do not include any explanation, preamble, or markdown — ONLY the raw JSON array
- Example output: ["What is photosynthesis?", "Explain the water cycle", "Define osmosis"]

Text:
${text.slice(0, 4000)}`;

    const raw = await generateResponse(parsePrompt);

    let questions = [];
    try {
      const cleaned = raw.replace(/```json|```/g, "").trim();
      questions = JSON.parse(cleaned);
      if (!Array.isArray(questions)) questions = [];
    } catch {
      questions = raw
        .split("\n")
        .map((l) => l.replace(/^[\d\-\.\*\[\]]+\s*/, "").trim())
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

    // Fetch relevant web context for this specific question
    const [searchResults, images] = await Promise.all([
      combinedSearch(question),
      searchImages(question, 4),
    ]);

    const webContext = searchResults.length
      ? `\nWeb context:\n` +
        searchResults.map((r) => `- ${r.title}: ${r.snippet}`).join("\n") + "\n"
      : "";

    const answerPrompt = `You are an expert tutor. Answer the following question thoroughly and in detail.
${webContext}
RULES:
- Respond in clean Markdown
- Use ## for section headings within your answer
- Use bullet points, numbered lists, tables, and code blocks where appropriate
- Use **bold** for key terms
- Be comprehensive — do not truncate or summarize prematurely
- End with a brief ## Key Takeaways section

Question: ${question}`;

    const answer = await generateResponse(answerPrompt);

    res.json({ answer, searchResults, images });
  } catch (err) {
    console.error("answerQuestion error:", err);
    res.status(500).json({ error: err.message });
  }
};