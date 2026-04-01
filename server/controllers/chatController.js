import Chat from "../models/Chat.js";
import { generateResponse } from "../services/ollamaService.js";
import { combinedSearch } from "../services/searchService.js";
import { searchImages } from "../services/imageService.js";

// ── Decide if search is needed ────────────────────────────────────────────────
const needsSearch = async (message) => {
  const prompt = `You are a decision engine. Does this user message require current/factual web information to answer well?
Reply with ONLY "YES" or "NO". Nothing else.
Message: "${message}"`;
  try {
    const decision = await generateResponse(prompt);
    return decision.trim().toUpperCase().startsWith("YES");
  } catch {
    return false;
  }
};

const extractQuery = async (message) => {
  const prompt = `Extract the core search query from this message. Reply with ONLY the search query, nothing else.
Message: "${message}"`;
  try {
    const q = await generateResponse(prompt);
    return q.trim().slice(0, 100);
  } catch {
    return message.slice(0, 100);
  }
};

// ── Send Message ──────────────────────────────────────────────────────────────
export const sendMessage = async (req, res) => {
  try {
    const { message, conversationId } = req.body;

    // Load or create conversation
    let conversation;
    if (conversationId) {
      conversation = await Chat.findById(conversationId);
    }
    if (!conversation) {
      conversation = new Chat({
        title: message.slice(0, 60), // first message = title
        messages: [],
      });
    }

    // Build full context from conversation history for AI
    const historyContext = conversation.messages
      .slice(-10)                          // last 10 messages max
      .map((m) => `${m.role === "user" ? "User" : "AI"}: ${m.content}`)
      .join("\n");

    // Decide if search needed
    let searchResults = [];
    let images = [];
    let searchQuery = "";
    let aiPrompt = "";
    const shouldSearch = await needsSearch(message);

    if (shouldSearch) {
      searchQuery = await extractQuery(message);
      [searchResults, images] = await Promise.all([
        combinedSearch(searchQuery),
        searchImages(searchQuery, 6),
      ]);

      const webContext = searchResults
        .map((r) => `Source: ${r.source}\nTitle: ${r.title}\nInfo: ${r.snippet}`)
        .join("\n\n");

      aiPrompt = `${historyContext ? historyContext + "\n" : ""}Web search results for "${searchQuery}":\n${webContext}\n\nUsing the above information, answer this:\nUser: ${message}\nAI:`;
    } else {
      aiPrompt = `${historyContext ? historyContext + "\n" : ""}User: ${message}\nAI:`;
    }

    const aiResponse = await generateResponse(aiPrompt);

    // Append both messages to conversation
    conversation.messages.push({ role: "user", content: message });
    conversation.messages.push({ role: "ai", content: aiResponse });
    await conversation.save();

    res.json({
      conversationId: conversation._id,
      title: conversation.title,
      userMessage: message,
      aiMessage: aiResponse,
      searchResults,
      images,
      searchQuery,
      webEnhanced: shouldSearch,
    });
  } catch (err) {
    console.error("sendMessage error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ── Get all conversations (for sidebar) ──────────────────────────────────────
export const getChats = async (req, res) => {
  try {
    // Return conversations sorted newest first, with just title + id + preview
    const chats = await Chat.find()
      .sort({ updatedAt: -1 })
      .select("title messages updatedAt");
    res.json(chats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Get single conversation messages ─────────────────────────────────────────
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