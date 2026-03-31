import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
});

export const sendMessage = (message, conversationId) =>
  API.post("/chat", { message, conversationId });

export const getChats = () => API.get("/chat");

export const deleteChat = (id) =>
  API.delete(`/chat/${id}`);