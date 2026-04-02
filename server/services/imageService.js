import axios from "axios";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
  "Accept": "application/json",
  "Accept-Language": "en-US,en;q=0.9",
  "Api-User-Agent": "OllamaAIApp/1.0 (educational project)",
};

// ── Wikipedia images for a topic ──────────────────────────────────────────────
const getWikipediaImages = async (query, count) => {
  try {
    // Step 1: find page title
    const searchRes = await axios.get("https://en.wikipedia.org/w/api.php", {
      params: {
        action: "opensearch",
        search: query,
        limit: 1,
        format: "json",
      },
      headers: HEADERS,
      timeout: 8000,
    });

    const titles = searchRes.data?.[1] || [];
    if (!titles.length) return [];
    const title = titles[0];

    // Step 2: get images list from that page
    const imgListRes = await axios.get("https://en.wikipedia.org/w/api.php", {
      params: {
        action: "query",
        titles: title,
        prop: "images",
        imlimit: 20,
        format: "json",
        redirects: 1,
      },
      headers: HEADERS,
      timeout: 8000,
    });

    const pages   = imgListRes.data?.query?.pages || {};
    const page    = Object.values(pages)[0];
    const imgList = page?.images || [];

    // Filter only real image files (not icons/logos/flags)
    const filtered = imgList
      .map((i) => i.title)
      .filter((t) =>
        t.match(/\.(jpg|jpeg|png|gif|webp)$/i) &&
        !t.match(/icon|logo|flag|seal|banner|symbol|coat|emblem|map|blank/i)
      )
      .slice(0, count);

    if (!filtered.length) return [];

    // Step 3: get actual image URLs from titles
    const infoRes = await axios.get("https://en.wikipedia.org/w/api.php", {
      params: {
        action: "query",
        titles: filtered.join("|"),
        prop: "imageinfo",
        iiprop: "url|thumburl|extmetadata",
        iiurlwidth: 400,
        format: "json",
      },
      headers: HEADERS,
      timeout: 8000,
    });

    const imagePages = infoRes.data?.query?.pages || {};
    return Object.values(imagePages)
      .filter((p) => p.imageinfo?.[0]?.url)
      .map((p) => {
        const info = p.imageinfo[0];
        return {
          url: info.url,
          thumbnail: info.thumburl || info.url,
          title: info.extmetadata?.ImageDescription?.value?.replace(/<[^>]+>/g, "")?.slice(0, 80)
            || p.title.replace("File:", ""),
          source: `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
        };
      });

  } catch (err) {
    console.error("Wikipedia images error:", err.message);
    return [];
  }
};

// ── Wikimedia Commons search ──────────────────────────────────────────────────
const getCommonsImages = async (query, count) => {
  try {
    const res = await axios.get("https://commons.wikimedia.org/w/api.php", {
      params: {
        action: "query",
        generator: "search",
        gsrnamespace: 6,   // File namespace
        gsrsearch: query,
        gsrlimit: count,
        prop: "imageinfo",
        iiprop: "url|thumburl",
        iiurlwidth: 400,
        format: "json",
      },
      headers: HEADERS,
      timeout: 8000,
    });

    const pages = res.data?.query?.pages || {};
    return Object.values(pages)
      .filter((p) => {
        const url = p.imageinfo?.[0]?.url || "";
        return url.match(/\.(jpg|jpeg|png|webp)$/i);
      })
      .map((p) => {
        const info = p.imageinfo[0];
        return {
          url: info.url,
          thumbnail: info.thumburl || info.url,
          title: p.title.replace("File:", ""),
          source: `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title)}`,
        };
      });
  } catch (err) {
    console.error("Commons images error:", err.message);
    return [];
  }
};

// ── Main export — tries Wikipedia first, falls back to Commons ────────────────
export const searchImages = async (query, count = 6) => {
  try {
    const [wikiImgs, commonsImgs] = await Promise.allSettled([
      getWikipediaImages(query, count),
      getCommonsImages(query, count),
    ]);

    const wiki    = wikiImgs.status    === "fulfilled" ? wikiImgs.value    : [];
    const commons = commonsImgs.status === "fulfilled" ? commonsImgs.value : [];

    // Merge, deduplicate by URL, return up to count
    const seen = new Set();
    return [...wiki, ...commons]
      .filter((img) => {
        if (!img.url || seen.has(img.url)) return false;
        seen.add(img.url);
        return true;
      })
      .slice(0, count);

  } catch (err) {
    console.error("searchImages error:", err.message);
    return [];
  }
};