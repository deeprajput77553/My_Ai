import Chat from "../models/Chat.js";
import { generateResponse } from "../services/ollamaService.js";
import { combinedSearch } from "../services/searchService.js";
import { searchImages } from "../services/imageService.js";

// ── System prompts ─────────────────────────────────────────────────────────────
const CHAT_SYSTEM = `You are an expert AI assistant with deep knowledge across all fields including science, technology, history, mathematics, medicine, law, finance, arts, and more.

RESPONSE RULES:
- Always give complete, detailed, and accurate answers — never truncate or say "I'll stop here"
- Use clear structure: bullet points, numbered steps, headers, tables where helpful
- For factual questions: be precise, cite web search context if provided
- For creative questions: be imaginative and thorough
- For math/logic: show full working and explain each step
- Always answer in the same language the user wrote in
- Never refuse a reasonable question — if unsure, say so and give your best answer
- Keep conversation context in mind and refer back to earlier messages when relevant
- Be direct and confident`;

const CODE_SYSTEM = `You are an expert software engineer and coding assistant with mastery of all programming languages, frameworks, algorithms, data structures, system design, and best practices.

RESPONSE RULES:
- Always provide complete, working, production-ready code — never use placeholders like "// add logic here"
- Explain what the code does and why, step by step
- Include error handling in all code
- Show example input/output where relevant
- If multiple approaches exist, show the best one and mention alternatives
- Use proper code blocks with language tags
- Follow best practices and clean code principles
- If asked to fix a bug, explain what was wrong and why your fix works
- Always answer in the same language the user wrote in`;

// ── Detect if message is coding related ───────────────────────────────────────
const CODE_KEYWORDS = [
  "code", "function", "bug", "error", "fix", "debug", "program", "script",
  "algorithm", "class", "array", "loop", "api", "database", "sql", "html",
  "css", "javascript", "python", "java", "typescript", "react", "node",
  "express", "mongodb", "git", "component", "variable", "syntax", "compile",
  "runtime", "exception", "import", "export", "async", "await", "promise",
  "fetch", "request", "response", "endpoint", "framework", "library",
  "implement", "write a", "build a", "create a", "how to code", "how to make",
  "how to build", "recursion", "complexity", "sort", "search", "binary",
  "stack", "queue", "linked list", "tree", "graph", "regex", "terminal",
  "command", "dockerfile", "deploy", "server", "client", "backend", "frontend"
];

const isCodeQuestion = (message) => {
  const lower = message.toLowerCase();
  return CODE_KEYWORDS.some((kw) => lower.includes(kw));
};

// ── Decide if web context helps ───────────────────────────────────────────────
const needsWebContext = async (message) => {
  const prompt = `Does this question need current/real-world factual information from the web?
Reply ONLY "YES" or "NO".
Question: "${message}"`;
  try {
    const d = await generateResponse(prompt, "chat");
    return d.trim().toUpperCase().startsWith("YES");
  } catch {
    return false;
  }
};

const extractQuery = async (message) => {
  const prompt = `Extract the best web search query for this message. Reply ONLY with the query.
Message: "${message}"`;
  try {
    const q = await generateResponse(prompt, "chat");
    return q.trim().slice(0, 100);
  } catch {
    return message.slice(0, 100);
  }
};

// ── Send Message ──────────────────────────────────────────────────────────────
export const sendMessage = async (req, res) => {
  try {
    const { message, conversationId } = req.body;

    // Detect model to use
    const modelType   = isCodeQuestion(message) ? "code" : "chat";
    const systemPrompt = modelType === "code" ? CODE_SYSTEM : CHAT_SYSTEM;

    // Load or create conversation
    let conversation;
    if (conversationId) {
      conversation = await Chat.findById(conversationId);
    }
    if (!conversation) {
      conversation = new Chat({ title: message.slice(0, 60), messages: [] });
    }

    // Build conversation history context
    const historyContext = conversation.messages
      .slice(-10)
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n");

    // Fetch search + images in parallel
    const searchQuery = await extractQuery(message);
    const [searchResults, images, useWebContext] = await Promise.all([
      combinedSearch(searchQuery),
      searchImages(searchQuery, 6),
      needsWebContext(message),
    ]);

    // Build final prompt
    let aiPrompt = `${systemPrompt}\n\n`;

    if (historyContext) {
      aiPrompt += `--- Conversation so far ---\n${historyContext}\n\n`;
    }

    if (useWebContext && searchResults.length > 0) {
      const webContext = searchResults
        .map((r) => `[${r.source}] ${r.title}: ${r.snippet}`)
        .join("\n");
      aiPrompt += `--- Web search results for "${searchQuery}" ---\n${webContext}\n\n`;
    }

    aiPrompt += `--- Current question ---\nUser: ${message}\nAssistant:`;

    const aiResponse = await generateResponse(aiPrompt, modelType);

    // Save to DB
    conversation.messages.push({ role: "user", content: message });
    conversation.messages.push({ role: "ai", content: aiResponse });
    await conversation.save();

    res.json({
      conversationId: conversation._id,
      title: conversation.title,
      userMessage: message,
      aiMessage: aiResponse,
      modelUsed: modelType,       // send back which model was used
      searchResults,
      images,
      searchQuery,
      webEnhanced: useWebContext,
    });
  } catch (err) {
    console.error("sendMessage error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ── Get all conversations ─────────────────────────────────────────────────────
export const getChats = async (req, res) => {
  try {
    const chats = await Chat.find()
      .sort({ updatedAt: -1 })
      .select("title messages updatedAt");
    res.json(chats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Get single conversation ───────────────────────────────────────────────────
export const getConversation = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ error: "Not found" });
    res.json(chat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Delete conversation ───────────────────────────────────────────────────────
export const deleteChat = async (req, res) => {
  try {
    await Chat.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};