/**
 * newsService.js
 * Fetches real news from free RSS feeds — no API key required.
 * Sources: Reuters, BBC, Times of India, Google News RSS
 */
import axios from "axios";

const RSS_SOURCES = [
  {
    name: "Reuters",
    url: "https://feeds.reuters.com/reuters/topNews",
    category: "World",
  },
  {
    name: "BBC News",
    url: "https://feeds.bbci.co.uk/news/rss.xml",
    category: "World",
  },
  {
    name: "Times of India",
    url: "https://timesofindia.indiatimes.com/rssfeedstopstories.cms",
    category: "India",
  },
  {
    name: "TechCrunch",
    url: "https://techcrunch.com/feed/",
    category: "Tech",
  },
  {
    name: "NDTV",
    url: "https://feeds.feedburner.com/NDTV-LatestNews",
    category: "India",
  },
];

// Simple XML RSS parser using regex (no extra deps)
const parseRSS = (xml, sourceName) => {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];

    const getTag = (tag) => {
      // Handle CDATA
      const cdataMatch = block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i"));
      if (cdataMatch) return cdataMatch[1].trim();
      const plain = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
      return plain ? plain[1].replace(/<[^>]+>/g, "").trim() : "";
    };

    const title   = getTag("title");
    const link    = getTag("link") || block.match(/<link>([^<]+)<\/link>/i)?.[1]?.trim() || "";
    const desc    = getTag("description");
    const pubDate = getTag("pubDate");

    // Skip empty items
    if (!title || title.length < 5) continue;

    // Clean description
    const snippet = desc
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim()
      .slice(0, 200);

    items.push({
      title:       title.replace(/&amp;/g, "&").replace(/&#39;/g, "'"),
      snippet:     snippet || title,
      url:         link,
      source:      sourceName,
      publishedAt: pubDate || new Date().toISOString(),
    });

    if (items.length >= 5) break;
  }

  return items;
};

// Fetch a single RSS feed with timeout
const fetchFeed = async (source) => {
  try {
    const { data } = await axios.get(source.url, {
      headers: {
        "User-Agent": "Mozilla/5.0 OllamaAI/1.0",
        "Accept": "application/rss+xml, application/xml, text/xml, */*",
      },
      timeout: 6000,
      responseType: "text",
    });
    const items = parseRSS(data, source.name);
    return items;
  } catch {
    return [];
  }
};

// Detect which topic category is being asked about
const detectNewsCategory = (query) => {
  const lower = query.toLowerCase();
  if (lower.match(/tech|ai|software|startup|google|apple|microsoft/)) return "Tech";
  if (lower.match(/india|indian|delhi|mumbai|modi|bjp|congress/))     return "India";
  if (lower.match(/sport|cricket|football|ipl|match/))                return "Sports";
  return null; // general news
};

/**
 * fetchNews(query, count)
 * Returns up to `count` news articles relevant to the query.
 */
export const fetchNews = async (query = "", count = 5) => {
  const category = detectNewsCategory(query);

  // Pick best sources for the category
  let sources;
  if (category === "Tech") {
    sources = [RSS_SOURCES[3], RSS_SOURCES[1]]; // TechCrunch, BBC
  } else if (category === "India") {
    sources = [RSS_SOURCES[2], RSS_SOURCES[4], RSS_SOURCES[0]]; // TOI, NDTV, Reuters
  } else {
    sources = [RSS_SOURCES[0], RSS_SOURCES[1], RSS_SOURCES[2]]; // Reuters, BBC, TOI
  }

  // Fetch sources in parallel, take first that succeeds
  const results = await Promise.allSettled(sources.map(s => fetchFeed(s)));

  const articles = [];
  for (const r of results) {
    if (r.status === "fulfilled" && r.value.length > 0) {
      articles.push(...r.value);
      if (articles.length >= count) break;
    }
  }

  // Deduplicate by title prefix
  const seen = new Set();
  return articles.filter(a => {
    const key = a.title.slice(0, 40).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, count);
};
