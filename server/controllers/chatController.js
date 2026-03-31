import Chat from "../models/Chat.js";
import { generateResponse } from "../services/ollamaService.js";

const MAX_CONTEXT = 5;

export const sendMessage = async (req, res) => {
  try {
    const { message } = req.body;

    console.log("User message:", message);

    const history = await Chat.find()
      .sort({ createdAt: -1 })
      .limit(5);

    const context = history
      .reverse()
      .map(c => `User: ${c.userMessage}\nAI: ${c.aiMessage}`)
      .join("\n");

    const prompt = `${context}\nUser: ${message}\nAI:`;

    console.log("Sending to Ollama...");

    const aiResponse = await generateResponse(prompt);

    console.log("AI Response:", aiResponse);

    const chat = await Chat.create({
      userMessage: message,
      aiMessage: aiResponse,
    });

    res.json(chat);

  } catch (err) {
    console.error("🔥 FULL ERROR:", err); // VERY IMPORTANT
    res.status(500).json({ error: err.message });
  }
};

export const getChats = async (req, res) => {
  const chats = await Chat.find().sort({ createdAt: 1 });
  res.json(chats);
};