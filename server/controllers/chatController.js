import Chat from "../models/Chat.js";
import { generateResponse } from "../services/ollamaService.js";
import { combinedSearch } from "../services/searchService.js";
import { searchImages } from "../services/imageService.js";
import { fetchWeather, extractLocationFromQuery } from "../services/weatherService.js";
import { fetchNews } from "../services/newsService.js";
import { extractUserDataFromMessage, extractRemindersFromMessage } from "./userDataController.js";
import UserData from "../models/UserData.js";

// ── System Prompts ────────────────────────────────────────────────────────────
const CHAT_SYSTEM = `You are a smart, efficient AI assistant.
 
Rules:
- Address the user as "Sir" or "Ma'am" respectfully (infer from their name).
- Be factual and objective. If search results are provided, prioritize that information.
- Do NOT give generic "AI responsibility" refusals for famous public figures or common facts. 
- Match the user's tone: casual → friendly, technical → precise.
- For simple questions, 1-3 sentences is ideal.
- Always reply in the same language as the user.`;

const CODE_SYSTEM = `You are an expert software engineer.
 
Rules:
- Address the user as "Sir" or "Ma'am" respectfully.
- EVERY code block MUST start with a filename comment on the first line. 
  Example: // filename: app.js OR # filename: script.py
- Use proper markdown code blocks with language tags (e.g. \`\`\`python)

- Complete, production-ready code only — no placeholders
- Short explanation of what it does and why
- Include error handling
- Use proper code blocks with language tags
- Be concise — no filler commentary
- Reply in the user's language`;

// ── Code detection ────────────────────────────────────────────────────────────
const CODE_KEYWORDS = [
  "code", "function", "bug", "error", "fix", "debug", "program", "script",
  "algorithm", "class", "array", "loop", "api", "database", "sql", "html",
  "css", "javascript", "python", "java", "typescript", "react", "node",
  "express", "mongodb", "git", "component", "variable", "syntax", "compile",
  "runtime", "exception", "import", "export", "async", "await", "promise",
  "fetch", "endpoint", "framework", "implement", "write a", "build a",
  "create a", "how to code", "how to build", "recursion", "sort", "search",
  "binary", "stack", "queue", "linked list", "tree", "graph", "regex",
  "dockerfile", "deploy", "backend", "frontend",
];
const isCodeQuestion = (msg) =>
  CODE_KEYWORDS.some((kw) => msg.toLowerCase().includes(kw));

// ── Weather / News detection ──────────────────────────────────────────────────
const WEATHER_KEYWORDS = [
  "weather", "temperature", "forecast", "rain", "rainfall", "sunny",
  "humidity", "climate", "storm", "wind", "snow", "fog", "heat",
  "celsius", "fahrenheit", "mausam", "barish", "garmi", "sardi",
];
const NEWS_KEYWORDS = [
  "news", "latest news", "headlines", "current events", "breaking",
  "what's happening", "recently", "politics", "sports news", "tech news",
  "खबर", "samachar", "today's news", "latest updates",
];

const isWeatherQuery = (msg) =>
  WEATHER_KEYWORDS.some(kw => msg.toLowerCase().includes(kw));
const isNewsQuery = (msg) =>
  NEWS_KEYWORDS.some(kw => msg.toLowerCase().includes(kw));

// ── Keyword-based web search gate (no LLM call) ───────────────────────────────
const SEARCH_KEYWORDS = [
  "who is", "what is the latest", "current", "right now", "today",
  "this year", "2024", "2025", "2026", "price of", "stock", "how much is",
  "when did", "recent", "just happened", "announced", "released",
  "president", "prime minister", "ceo of", "founded", "located in",
  "movie", "season", "episode", "release date", "schedule",
  "search for", "find on", "tell me about", "wikipedia", "duckduckgo", "google",
  "biography", "details on", "history of"
];
const needsWebSearch = (msg) => {
  const lower = msg.toLowerCase();
  return SEARCH_KEYWORDS.some(kw => lower.includes(kw));
};

// ── Send Message ──────────────────────────────────────────────────────────────
export const sendMessage = async (req, res) => {
  try {
    const { message, conversationId, apiProvider } = req.body;
    const userId = req.userId;

    const modelType    = isCodeQuestion(message) ? "code" : "chat";
    const systemPrompt = modelType === "code" ? CODE_SYSTEM : CHAT_SYSTEM;

    const weatherQuery = isWeatherQuery(message);
    const newsQuery    = isNewsQuery(message);
    const doSearch     = !weatherQuery && !newsQuery && needsWebSearch(message);

    // Load or create conversation
    let conversation;
    if (conversationId) {
      conversation = await Chat.findOne({ _id: conversationId, userId });
      if (!conversation)
        return res.status(404).json({ error: "Conversation not found or access denied" });
    }
    if (!conversation) {
      conversation = new Chat({ userId, title: message.slice(0, 60), messages: [] });
    }

    // Build conversation history (last 8 messages)
    const historyContext = conversation.messages
      .slice(-8)
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n");

    // Fetch personal data / reminders context for the AI
    const userDataInfo = await UserData.findOne({ userId });
    let personalContext = "";
    if (userDataInfo) {
      if (userDataInfo.profile?.length > 0) {
        personalContext += "User Info:\n" + userDataInfo.profile.map(p => `- ${p.key}: ${p.value}`).join("\n") + "\n";
      }
      const upcomingReminders = userDataInfo.reminders?.filter(r => !r.completed);
      if (upcomingReminders?.length > 0) {
        personalContext += "Reminders:\n" + upcomingReminders.map(r => `- ${r.title}`).join("\n") + "\n";
      }
    }

    // ── Run data fetches in parallel based on query type ──────────────────────
    let weatherData = null;
    let newsData    = [];
    let searchResults = [];
    let images      = [];
    let searchQuery = message.replace(/search for|find on|on (duckduckgo|google|wikipedia)/gi, "").trim().slice(0, 100);

    if (weatherQuery) {
      // Real weather from wttr.in
      const location = extractLocationFromQuery(message) || "Mumbai";
      weatherData = await fetchWeather(location);
      // Fallback to search snippet if wttr.in fails
      if (!weatherData) {
        searchQuery = message.trim().slice(0, 100);
        const results = await combinedSearch(searchQuery);
        const snippet = results.find(r =>
          r.snippet?.toLowerCase().includes("°") ||
          r.snippet?.toLowerCase().includes("temperature")
        ) || results[0];
        if (snippet) {
          weatherData = { raw: snippet.snippet, title: snippet.title, source: snippet.source, query: searchQuery };
        }
      }
    } else if (newsQuery) {
      // Real news from RSS feeds
      newsData = await fetchNews(message, 5);
      // Fallback to search if RSS fails
      if (newsData.length === 0) {
        searchQuery = message.trim().slice(0, 100);
        const results = await combinedSearch(searchQuery);
        newsData = results.slice(0, 5).map(r => ({
          title: r.title, snippet: r.snippet, url: r.url, source: r.source,
        }));
      }
    } else if (doSearch) {
      // General web search
      searchQuery = message.replace(/[?!.]/g, "").trim().slice(0, 100);
      [searchResults, images] = await Promise.all([
        combinedSearch(searchQuery),
        modelType === "chat" ? searchImages(searchQuery, 4) : Promise.resolve([]),
      ]);
    }

    // ── Build AI prompt ───────────────────────────────────────────────────────
    let aiPrompt = systemPrompt + "\n\n";

    if (personalContext) {
      aiPrompt += `BACKGROUND CONTEXT ABOUT THE USER:\n${personalContext}\nUse this info if it answers the user's question or adds relevant personalization.\n\n`;
    }

    if (historyContext) {
      aiPrompt += `Previous messages:\n${historyContext}\n\n`;
    }

    // Web context only for non-weather/news
    if (doSearch && searchResults.length > 0) {
      const webCtx = searchResults.slice(0, 3)
        .map(r => `${r.source}: ${r.snippet}`)
        .join("\n");
      aiPrompt += `Web context:\n${webCtx}\n\n`;
    }

    // Tell AI the widget handles the data — keep response brief
    if (weatherQuery && weatherData) {
      const loc = weatherData.location || weatherData.query || "the requested location";
      const temp = weatherData.current?.temperature != null
        ? `${weatherData.current.temperature}°C`
        : "";
      const cond = weatherData.current?.condition || "";
      aiPrompt += `Note: A live weather card is showing: ${loc}${temp ? ", " + temp : ""}${cond ? ", " + cond : ""}. Give a very brief 1-sentence friendly comment about this weather. Don't repeat numbers.\n\n`;
    } else if (weatherQuery) {
      aiPrompt += `Note: Weather data could not be fetched. Give a brief helpful response.\n\n`;
    }

    if (newsQuery && newsData.length > 0) {
      aiPrompt += `Note: ${newsData.length} live news articles are shown in the news widget. Give a 1-sentence intro like "Here's what's making headlines:" and let the widget do the rest.\n\n`;
    } else if (newsQuery) {
      aiPrompt += `Note: News feed unavailable. Give a brief helpful response.\n\n`;
    }

    aiPrompt += `User: ${message}\nAssistant:`;

    const aiResponse = await generateResponse(aiPrompt, modelType, { provider: apiProvider });

    // Save conversation
    conversation.messages.push({ role: "user", content: message });
    conversation.messages.push({ role: "ai", content: aiResponse });
    await conversation.save();

    // Background: extract user data + reminders (non-blocking)
    extractUserDataFromMessage(message, userId).catch(e => console.error("userData:", e.message));
    extractRemindersFromMessage(message, userId).catch(e => console.error("reminders:", e.message));

    res.json({
      conversationId: conversation._id,
      title:          conversation.title,
      userMessage:    message,
      aiMessage:      aiResponse,
      modelUsed:      modelType,
      apiProvider:    apiProvider || "nvidia",
      searchResults,
      images,
      searchQuery,
      webEnhanced:    doSearch && searchResults.length > 0,
      weather:        weatherData,
      news:           newsData,
    });

  } catch (err) {
    console.error("sendMessage error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ── Get all conversations ─────────────────────────────────────────────────────
export const getChats = async (req, res) => {
  try {
    const chats = await Chat.find({ userId: req.userId })
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
    const chat = await Chat.findOne({ _id: req.params.id, userId: req.userId });
    if (!chat) return res.status(404).json({ error: "Not found" });
    res.json(chat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Delete conversation ───────────────────────────────────────────────────────
export const deleteChat = async (req, res) => {
  try {
    const result = await Chat.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!result) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};