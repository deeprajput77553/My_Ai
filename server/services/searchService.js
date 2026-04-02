import axios from "axios";

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept": "application/json, text/html, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Connection": "keep-alive",
};

// ── DuckDuckGo Instant Answer API ─────────────────────────────────────────────
export const duckduckgoSearch = async (query) => {
  try {
    const { data } = await axios.get("https://api.duckduckgo.com/", {
      params: {
        q: query,
        format: "json",
        no_html: 1,
        skip_disambig: 1,
        no_redirect: 1,
        t: "ollama_ai_app",
      },
      headers: BROWSER_HEADERS,
      timeout: 10000,
    });

    const results = [];

    if (data.Abstract) {
      results.push({
        title: data.Heading || query,
        snippet: data.Abstract,
        url: data.AbstractURL || "",
        source: data.AbstractSource || "DuckDuckGo",
      });
    }

    if (data.Answer) {
      results.push({
        title: `Answer: ${query}`,
        snippet: data.Answer,
        url: "",
        source: "DuckDuckGo",
      });
    }

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

// ── Wikipedia REST API (no auth needed, but needs correct headers) ─────────────
export const wikipediaSearch = async (query) => {
  try {
    // Use Wikipedia's opensearch API — simpler and less likely to 403
    const searchRes = await axios.get("https://en.wikipedia.org/w/api.php", {
      params: {
        action: "opensearch",
        search: query,
        limit: 3,
        namespace: 0,
        format: "json",
      },
      headers: {
        ...BROWSER_HEADERS,
        "Api-User-Agent": "OllamaAIApp/1.0 (educational project)",
      },
      timeout: 10000,
    });

    // opensearch returns [query, titles[], descriptions[], urls[]]
    const [, titles, descriptions, urls] = searchRes.data;
    if (!titles?.length) return [];

    // Get summary for top result using the page extract API
    const extractRes = await axios.get("https://en.wikipedia.org/w/api.php", {
      params: {
        action: "query",
        titles: titles[0],
        prop: "extracts|pageimages",
        exintro: true,
        explaintext: true,
        exsentences: 5,
        piprop: "thumbnail",
        pithumbsize: 400,
        format: "json",
        redirects: 1,
      },
      headers: {
        ...BROWSER_HEADERS,
        "Api-User-Agent": "OllamaAIApp/1.0 (educational project)",
      },
      timeout: 10000,
    });

    const pages = extractRes.data?.query?.pages || {};
    const page  = Object.values(pages)[0];
    if (!page || page.missing) return [];

    return [{
      title: page.title,
      snippet: page.extract?.slice(0, 600) || descriptions[0] || "",
      url: urls[0] || `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title)}`,
      source: "Wikipedia",
      thumbnail: page.thumbnail?.source || null,
    }];

  } catch (err) {
    console.error("Wikipedia search error:", err.message);
    return [];
  }
};

// ── Combined ──────────────────────────────────────────────────────────────────
export const combinedSearch = async (query) => {
  const [ddg, wiki] = await Promise.allSettled([
    duckduckgoSearch(query),
    wikipediaSearch(query),
  ]);

  const ddgResults  = ddg.status  === "fulfilled" ? ddg.value  : [];
  const wikiResults = wiki.status === "fulfilled" ? wiki.value : [];

  const all  = [...wikiResults, ...ddgResults];
  const seen = new Set();
  return all.filter((r) => {
    if (!r.url || seen.has(r.url)) return r.url === "" ? true : false;
    seen.add(r.url);
    return true;
  });
};