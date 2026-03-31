import axios from "axios";

export const generateResponse = async (prompt) => {
  const res = await axios.post(process.env.OLLAMA_URL, {
    model: process.env.MODEL,
    prompt,
    stream: false,
  });

  return res.data.response;
};