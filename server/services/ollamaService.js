import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const OLLAMA_URL  = process.env.OLLAMA_URL  || "http://127.0.0.1:11434/api/generate";
const CHAT_MODEL  = process.env.CHAT_MODEL  || "llama3";
const CODE_MODEL  = process.env.CODE_MODEL  || "codellama";

// model param: "chat" | "code" | any explicit model name
export const generateResponse = async (prompt, model = "chat") => {
  const resolvedModel =
    model === "chat" ? CHAT_MODEL :
    model === "code" ? CODE_MODEL :
    model; // allow passing explicit model name directly

  const { data } = await axios.post(OLLAMA_URL, {
    model: resolvedModel,
    prompt,
    stream: false,
  });

  return data.response;
};