import { generateResponse } from "../services/ollamaService.js";

// ── Generate structured notes from a topic ────────────────────────────────────
export const generateNotes = async (req, res) => {
  try {
    const { prompt } = req.body;

    const notesPrompt = `You are an expert note-taking assistant. Generate comprehensive, well-structured notes on the following topic.

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
    res.json({ notes });
  } catch (err) {
    console.error("generateNotes error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ── Parse raw file text into a list of questions/topics ───────────────────────
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

    // Parse the JSON array from AI response
    let questions = [];
    try {
      // Strip any accidental markdown fences
      const cleaned = raw.replace(/```json|```/g, "").trim();
      questions = JSON.parse(cleaned);
      if (!Array.isArray(questions)) questions = [];
    } catch {
      // Fallback: try to extract lines that look like questions
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

// ── Answer a single question with full detail ─────────────────────────────────
export const answerQuestion = async (req, res) => {
  try {
    const { question } = req.body;

    const answerPrompt = `You are an expert tutor. Answer the following question thoroughly and in detail.

RULES:
- Respond in clean Markdown
- Use ## for section headings within your answer
- Use bullet points, numbered lists, tables, and code blocks where appropriate
- Use **bold** for key terms
- Be comprehensive — do not truncate or summarize prematurely
- End with a brief ## Key Takeaways section

Question: ${question}`;

    const answer = await generateResponse(answerPrompt);
    res.json({ answer });
  } catch (err) {
    console.error("answerQuestion error:", err);
    res.status(500).json({ error: err.message });
  }
};