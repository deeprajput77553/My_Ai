/**
 * weatherService.js
 * Uses wttr.in — completely free, no API key needed.
 * Returns structured current weather data.
 */
import axios from "axios";

// Extract location from the query string
// e.g. "weather in mumbai" → "mumbai"
export const extractLocationFromQuery = (query) => {
  // First clean up things like "what's the", "how is the", etc.
  let cleanQuery = query.toLowerCase()
    .replace(/^(what is|what's|how is|how's|show me|tell me|find)( the)?\s+/i, "")
    .trim();

  const patterns = [
    /(?:weather|mausam|temperature|forecast)\s+(?:in|at|for|of)?\s*(.+)/i,
    /(.+?)\s+(?:weather|mausam|temperature|forecast)/i,
    /\b(\d{5,6})\b/, // Match 5 or 6 digit ZIP/PIN codes
  ];

  for (const p of patterns) {
    const m = cleanQuery.match(p);
    if (m && (m[1] || m[2])) {
      let loc = m[1] || m[2];
      // Clean up punctuation and time words
      loc = loc.replace(/[?!.,]/g, "").replace(/\s*(today|now|current|right now|tonight|tomorrow)\s*/gi, "").trim();
      if (loc && loc !== "the") return loc;
    }
  }
  
  // Last resort: if it's a short query (just 1 or 2 words), assume it's a place
  const words = cleanQuery.split(/\s+/);
  if (words.length <= 2 && !/^(hi|hello|what|how|who|thanks|ok)$/i.test(words[0])) {
    return cleanQuery.replace(/[?!.,]/g, "").trim();
  }

  return null;
};

// Map condition code + emoji from wttr.in weather code
const getCondition = (code) => {
  const n = parseInt(code, 10);
  if ([113].includes(n))               return { label: "Clear / Sunny",   icon: "☀" };
  if ([116].includes(n))               return { label: "Partly Cloudy",   icon: "⛅" };
  if ([119, 122].includes(n))          return { label: "Cloudy",          icon: "☁" };
  if ([143].includes(n))               return { label: "Foggy",           icon: "🌫" };
  if ([176,293,296,299,353].includes(n)) return { label: "Light Rain",    icon: "🌦" };
  if ([302,305,308,356,359].includes(n)) return { label: "Heavy Rain",    icon: "🌧" };
  if ([200,386,389,392,395].includes(n)) return { label: "Thunderstorm",  icon: "⛈" };
  if ([179,323,326,329,332,335,338,350,368,371,374,377].includes(n)) return { label: "Snow", icon: "❄" };
  if ([260,263,266,281,284,311,314,317,320,185].includes(n)) return { label: "Drizzle", icon: "🌦" };
  return { label: "Cloudy", icon: "☁" };
};

export const fetchWeather = async (location) => {
  if (!location) return null;
  
  try {
    const url = `https://wttr.in/${encodeURIComponent(location)}?format=j1`;
    const { data } = await axios.get(url, {
      headers: { "User-Agent": "OllamaAI/1.0" },
      timeout: 8000,
    });

    if (!data?.current_condition?.[0]) return null;

    const cc = data.current_condition[0];
    const area = data.nearest_area?.[0];
    
    // Construct readable display name: Area, Region, Country
    const areaName = area?.areaName?.[0]?.value || "";
    const region = area?.region?.[0]?.value || "";
    const country = area?.country?.[0]?.value || "";
    
    let displayName = areaName;
    if (region && region.toLowerCase() !== areaName.toLowerCase()) {
      displayName += (displayName ? `, ${region}` : region);
    }
    if (country) displayName += (displayName ? `, ${country}` : country);
    
    if (!displayName || displayName.trim() === ",") displayName = location;

    const codeStr = cc.weatherCode || "116";
    const cond = getCondition(codeStr);

    const forecast = (data.weather || []).slice(0, 4).map(d => ({
      date: d.date,
      high: parseFloat(d.maxtempC),
      low:  parseFloat(d.mintempC),
      condition: cond.label,
      icon: cond.icon,
    }));

    return {
      location: displayName,
      queryLocation: location,
      current: {
        temperature: parseFloat(cc.temp_C),
        feelsLike:   parseFloat(cc.FeelsLikeC),
        humidity:    parseInt(cc.humidity, 10),
        windSpeed:   parseFloat(cc.windspeedKmph),
        condition:   cond.label,
        icon:        cond.icon,
        visibility:  parseFloat(cc.visibility),
        uvIndex:     parseInt(cc.uvIndex, 10),
        description: cc.weatherDesc?.[0]?.value || cond.label,
      },
      forecast,
    };
  } catch (err) {
    console.error("fetchWeather error:", err.message);
    return null;
  }
};
