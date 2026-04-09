import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

export const transcribeAudio = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No audio file uploaded" });
  }

  const apiKey = process.env.NVIDIA_API_KEY_CHAT;

  try {
    const formData = new FormData();
    formData.append("file", fs.createReadStream(req.file.path));
    formData.append("model", "nvidia/canary"); 
    formData.append("language", "en");
    formData.append("response_format", "json");

    const response = await axios.post("https://integrate.api.nvidia.com/v1/audio/transcriptions", formData, {
      headers: {
        ...formData.getHeaders(),
        "Authorization": `Bearer ${apiKey}`,
      },
    });

    // Cleanup the temp file
    fs.unlinkSync(req.file.path);

    res.json({ text: response.data.text });
  } catch (error) {
    console.error("NVIDIA STT Error:", error.response?.data || error.message);
    
    // Cleanup even on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: "Speech to text conversion failed" });
  }
};
