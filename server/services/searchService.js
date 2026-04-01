import axios from "axios";
import * as cheerio from "cheerio";

// ── DuckDuckGo Instant Answer API ─────────────────────────────────────────────
export const duckduckgoSearch = async (query) => {
  try {
    const { data } = await axios.get("https://api.duckduckgo.com/", {
      params: {
        q: query,
        format: "json",
        no_html: 1,
        skip_disambig: 1,
      },
      timeout: 8000,
    });

    const results = [];

    // Abstract (main answer)
    if (data.Abstract) {
      results.push({
        title: data.Heading || query,
        snippet: data.Abstract,
        url: data.AbstractURL || "",
        source: data.AbstractSource || "DuckDuckGo",
      });
    }

    // Related topics
    if (data.RelatedTopics?.length) {
      data.RelatedTopics.slice(0, 4).forEach((topic) => {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.slice(0, 60),
            snippet: topic.Text,
            url: topic.FirstURL,
            source: "DuckDuckGo",
          });
        }
      });
    }

    return results.slice(0, 5);
  } catch (err) {
    console.error("DuckDuckGo search error:", err.message);
    return [];
  }
};

// ── Wikipedia Summary API ─────────────────────────────────────────────────────
export const wikipediaSearch = async (query) => {
  try {
    // First get search results
    const searchRes = await axios.get("https://en.wikipedia.org/w/api.php", {
      params: {
        action: "query",
        list: "search",
        srsearch: query,
        format: "json",
        srlimit: 3,
        origin: "*",
      },
      timeout: 8000,
    });

    const pages = searchRes.data?.query?.search || [];
    if (!pages.length) return [];

    // Get summary of top result
    const topTitle = pages[0].title;
    const summaryRes = await axios.get(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topTitle)}`,
      { timeout: 8000 }
    );

    const s = summaryRes.data;
    return [
      {
        title: s.title,
        snippet: s.extract?.slice(0, 600) || "",
        url: s.content_urls?.desktop?.page || "",
        source: "Wikipedia",
        thumbnail: s.thumbnail?.source || null,
      },
    ];
  } catch (err) {
    console.error("Wikipedia search error:", err.message);
    return [];
  }
};

// ── Combined search ────────────────────────────────────────────────────────────
export const combinedSearch = async (query) => {
  const [ddg, wiki] = await Promise.all([
    duckduckgoSearch(query),
    wikipediaSearch(query),
  ]);

  // Deduplicate by URL
  const all = [...wiki, ...ddg];
  const seen = new Set();
  return all.filter((r) => {
    if (!r.url || seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });
};