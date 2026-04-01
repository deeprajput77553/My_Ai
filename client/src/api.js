import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
});

// ── Chat ──────────────────────────────────────────
export const sendMessage = (message) =>
  API.post("/chat", { message });

export const getChats = () =>
  API.get("/chat");

export const deleteChat = (id) =>
  API.delete(`/chat/${id}`);

// ── Notes ─────────────────────────────────────────
export const generateNotes = (prompt) =>
  API.post("/notes", { prompt });