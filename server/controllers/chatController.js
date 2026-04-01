import Chat from "../models/Chat.js";
import { generateResponse } from "../services/ollamaService.js";

export const sendMessage = async (req, res) => {
  try {
    const { message } = req.body;

    const history = await Chat.find().sort({ createdAt: -1 }).limit(5);

    const context = history
      .reverse()
      .map((c) => `User: ${c.userMessage}\nAI: ${c.aiMessage}`)
      .join("\n");

    const prompt = `${context}\nUser: ${message}\nAI:`;

    const aiResponse = await generateResponse(prompt);

    const chat = await Chat.create({
      userMessage: message,
      aiMessage: aiResponse,
    });

    res.json(chat);
  } catch (err) {
    console.error("sendMessage error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const getChats = async (req, res) => {
  try {
    const chats = await Chat.find().sort({ createdAt: 1 });
    res.json(chats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteChat = async (req, res) => {
  try {
    await Chat.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};