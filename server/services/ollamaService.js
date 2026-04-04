import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const OLLAMA_URL  = process.env.OLLAMA_URL  || "http://127.0.0.1:11434/api/generate";
const CHAT_MODEL  = process.env.CHAT_MODEL  || "llama3";
const CODE_MODEL  = process.env.CODE_MODEL  || "codellama";

const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

// model param: "chat" | "code" | any explicit model name
export const generateResponse = async (prompt, model = "chat", options = {}) => {
  const provider = options.provider || "nvidia"; // Prioritize Nvidia by default

  if (provider === "nvidia") {
    try {
      const isCode = model === "code";
      const targetModel = isCode ? "z-ai/glm5" : "openai/gpt-oss-120b";
      
      const apiKey = isCode 
        ? (process.env.NVIDIA_API_KEY_CODE || "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") 
        : (process.env.NVIDIA_API_KEY_CHAT || "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");

      const payload = {
        model: targetModel,
        messages: [{"role": "user", "content": prompt}],
        temperature: 1,
        top_p: 1,
        max_tokens: isCode ? 16384 : 4096,
        stream: false,
      };

      if (isCode) {
        payload.extra_body = { chat_template_kwargs: { enable_thinking: true, clear_thinking: false } };
      }

      const { data } = await axios.post(NVIDIA_URL, payload, {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        }
      });

      let content = data.choices[0]?.message?.content || "";
      const reasoning = data.choices[0]?.message?.reasoning_content;
      
      if (reasoning) {
         content = `<think>\n${reasoning}\n</think>\n\n` + content;
      }
      
      return content;
    } catch (error) {
      console.error("Nvidia API Error:", error.response?.data || error.message);
      // Fallback to Ollama if Nvidia fails
      console.log("Falling back to local Ollama...");
    }
  }

  // Fallback / Explicit to Ollama
  const resolvedModel =
    model === "chat" ? CHAT_MODEL :
    model === "code" ? CODE_MODEL :
    model;

  const { data } = await axios.post(OLLAMA_URL, {
    model: resolvedModel,
    prompt,
    stream: false,
  });

  return data.response;
};