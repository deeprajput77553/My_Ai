import axios from "axios";
import * as cheerio from "cheerio";

// DuckDuckGo image search — scrapes the vqd token then fetches images
export const searchImages = async (query, count = 6) => {
  try {
    // Step 1: Get vqd token from DDG HTML page
    const initRes = await axios.get("https://duckduckgo.com/", {
      params: { q: query, iax: "images", ia: "images" },
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      },
      timeout: 8000,
    });

    const vqdMatch = initRes.data.match(/vqd=['"]([^'"]+)['"]/);
    if (!vqdMatch) return [];
    const vqd = vqdMatch[1];

    // Step 2: Fetch image results
    const imgRes = await axios.get("https://duckduckgo.com/i.js", {
      params: { q: query, vqd, f: ",,,,,", p: "1", v7exp: "a" },
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        Referer: "https://duckduckgo.com/",
      },
      timeout: 8000,
    });

    const results = imgRes.data?.results || [];
    return results.slice(0, count).map((img) => ({
      url: img.image,
      thumbnail: img.thumbnail,
      title: img.title,
      source: img.url,
    }));
  } catch (err) {
    console.error("Image search error:", err.message);
    return [];
  }
};