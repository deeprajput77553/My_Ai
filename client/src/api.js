import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
});

// Add token to all requests if it exists
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ── Chat ──────────────────────────────────────────
export const sendMessage       = (message, conversationId) =>
  API.post("/chat", { message, conversationId });

export const getChats          = ()     => API.get("/chat");
export const getConversation   = (id)   => API.get(`/chat/${id}`);
export const deleteChat        = (id)   => API.delete(`/chat/${id}`);

// ── Notes ─────────────────────────────────────────
export const generateNotes          = (prompt)   => API.post("/notes/generate", { prompt });
export const parseQuestionsFromFile = (text)     => API.post("/notes/parse-questions", { text });
export const answerQuestion         = (question) => API.post("/notes/answer", { question });