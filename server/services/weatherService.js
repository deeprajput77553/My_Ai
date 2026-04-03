/**
 * weatherService.js
 * Uses wttr.in — completely free, no API key needed.
 * Returns structured current weather data.
 */
import axios from "axios";

// Extract location from the query string
// e.g. "weather in mumbai" → "mumbai"
export const extractLocationFromQuery = (query) => {
  const patterns = [
    /weather\s+(?:in|at|for|of)\s+(.+)/i,
    /(.+?)\s+weather/i,
    /mausam\s+(.+)/i,
    /temperature\s+(?:in|at|of)\s+(.+)/i,
    /forecast\s+(?:in|at|for)\s+(.+)/i,
  ];
  for (const p of patterns) {
    const m = query.match(p);
    if (m && m[1]) {
      // Clean up: remove question marks, trailing words like "today/now"
      return m[1].replace(/[?!.,]/g, "").replace(/\s*(today|now|current|right now)\s*/gi, "").trim();
    }
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
    // wttr.in JSON API − free, no key required
    const url = `https://wttr.in/${encodeURIComponent(location)}?format=j1`;
    const { data } = await axios.get(url, {
      headers: { "User-Agent": "OllamaAI/1.0" },
      timeout: 8000,
    });

    if (!data?.current_condition?.[0]) return null;

    const cc = data.current_condition[0];
    const area = data.nearest_area?.[0];
    const areaName = area?.areaName?.[0]?.value || location;
    const country = area?.country?.[0]?.value || "";
    const codeStr = cc.weatherCode || "116";
    const cond = getCondition(codeStr);

    // Today's forecast
    const todayFc = data.weather?.[0];
    const forecast = (data.weather || []).slice(0, 4).map(d => ({
      date: d.date,
      high: parseFloat(d.maxtempC),
      low:  parseFloat(d.mintempC),
      condition: cond.label,
      icon: cond.icon,
    }));

    return {
      location: `${areaName}${country ? ", " + country : ""}`,
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
