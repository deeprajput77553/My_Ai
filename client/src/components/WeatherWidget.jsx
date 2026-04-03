import { useState, useEffect } from "react";
import "./WeatherWidget.css";

const WeatherWidget = ({ weatherData }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  if (!weatherData) return null;

  const isStructured = weatherData.current && weatherData.location;
  const raw = weatherData.raw || weatherData.title || "";
  const query = weatherData.query || "Weather";

  // Parse temperature from raw text if available
  const tempMatch = raw.match(/(\d{1,3})\s*°/);
  const tempVal = tempMatch ? tempMatch[1] : null;

  // Parse condition keywords
  const conditionMap = [
    { words: ["clear", "sunny", "fair", "☀"],  icon: "☀",  label: "Clear",  color: "#fbbf24" },
    { words: ["cloud", "overcast", "cloudy"],   icon: "☁",  label: "Cloudy", color: "#94a3b8" },
    { words: ["rain", "drizzle", "shower"],     icon: "🌧",  label: "Rain",   color: "#38bdf8" },
    { words: ["storm", "thunder", "lightning"], icon: "⛈",  label: "Storm",  color: "#a78bfa" },
    { words: ["snow", "blizzard", "sleet"],     icon: "❄",  label: "Snow",   color: "#bae6fd" },
    { words: ["fog", "mist", "haze"],           icon: "🌫",  label: "Foggy",  color: "#64748b" },
    { words: ["wind", "breezy", "gust"],        icon: "💨",  label: "Windy",  color: "#7dd3fc" },
    { words: ["hot", "heat", "warm"],           icon: "🌡",  label: "Hot",    color: "#f97316" },
    { words: ["cold", "cool", "chill"],         icon: "🧊",  label: "Cold",   color: "#93c5fd" },
  ];
  const rawLower = raw.toLowerCase();
  const matched = conditionMap.find(c => c.words.some(w => rawLower.includes(w)));
  const condition = matched || { icon: "🌤", label: "Partly Cloudy", color: "#fbbf24" };

  // Extract humidity
  const humidMatch = raw.match(/humidity[:\s]+(\d{1,3})\s*%/i);
  const humidity = humidMatch ? humidMatch[1] : null;

  // Extract wind
  const windMatch = raw.match(/wind[:\s]+(\d+)/i) || raw.match(/(\d+)\s*km\/h/i) || raw.match(/(\d+)\s*mph/i);
  const wind = windMatch ? windMatch[1] : null;

  if (isStructured) {
    return <StructuredWeather data={weatherData} visible={visible} />;
  }

  return (
    <div className={`ww-wrap ${visible ? "ww-in" : ""}`}>
      <div className="ww-card" style={{ "--accent": condition.color }}>
        {/* Gradient orb background */}
        <div className="ww-bg-orb" style={{ background: `radial-gradient(circle at 30% 50%, ${condition.color}22 0%, transparent 70%)` }} />

        <div className="ww-left">
          <div className="ww-source-badge">Live Search</div>
          <div className="ww-location">{query}</div>

          {tempVal ? (
            <div className="ww-temp-row">
              <span className="ww-temp">{tempVal}</span>
              <span className="ww-temp-unit">°C</span>
            </div>
          ) : null}

          <div className="ww-condition-row">
            <span className="ww-cond-icon">{condition.icon}</span>
            <span className="ww-cond-label">{condition.label}</span>
          </div>

          <div className="ww-stats-row">
            {humidity && (
              <div className="ww-stat">
                <span className="ww-stat-icon">💧</span>
                <span>{humidity}% humidity</span>
              </div>
            )}
            {wind && (
              <div className="ww-stat">
                <span className="ww-stat-icon">💨</span>
                <span>{wind} km/h</span>
              </div>
            )}
          </div>
        </div>

        <div className="ww-right">
          <div className="ww-big-icon" style={{ color: condition.color }}>{condition.icon}</div>
          <div className="ww-date">{new Date().toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" })}</div>
        </div>

        {/* Snippet text */}
        {raw && (
          <div className="ww-snippet">
            <p>{raw.slice(0, 200)}{raw.length > 200 ? "…" : ""}</p>
            {weatherData.source && <div className="ww-src-link">via {weatherData.source}</div>}
          </div>
        )}
      </div>
    </div>
  );
};

// Structured weather (for real API data)
const StructuredWeather = ({ data, visible }) => {
  const { location, current, forecast } = data;
  const conditionText = current?.condition || "";
  const conditionIcons = {
    clear: "☀", sunny: "☀", cloud: "☁", rain: "🌧",
    storm: "⛈", snow: "❄", fog: "🌫", wind: "💨",
  };
  const icon = Object.entries(conditionIcons).find(([k]) =>
    conditionText.toLowerCase().includes(k)
  )?.[1] || "🌤";

  return (
    <div className={`ww-wrap ${visible ? "ww-in" : ""}`}>
      <div className="ww-card">
        <div className="ww-bg-orb" />
        <div className="ww-left">
          <div className="ww-source-badge">Current Weather</div>
          <div className="ww-location">{location}</div>
          <div className="ww-temp-row">
            <span className="ww-temp">{Math.round(current.temperature)}</span>
            <span className="ww-temp-unit">°C</span>
          </div>
          <div className="ww-condition-row">
            <span className="ww-cond-icon">{icon}</span>
            <span className="ww-cond-label">{conditionText}</span>
          </div>
          <div className="ww-stats-row">
            {current.humidity != null && (
              <div className="ww-stat"><span>💧</span><span>{current.humidity}%</span></div>
            )}
            {current.windSpeed != null && (
              <div className="ww-stat"><span>💨</span><span>{current.windSpeed} km/h</span></div>
            )}
            {current.feelsLike != null && (
              <div className="ww-stat"><span>🌡</span><span>Feels {Math.round(current.feelsLike)}°</span></div>
            )}
          </div>
        </div>
        <div className="ww-right">
          <div className="ww-big-icon">{icon}</div>
          <div className="ww-date">{new Date().toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" })}</div>
        </div>
        {forecast?.length > 0 && (
          <div className="ww-forecast">
            {forecast.slice(0, 4).map((d, i) => (
              <div key={i} className="ww-fc-day" style={{ animationDelay: `${i * 0.08}s` }}>
                <span className="ww-fc-date">
                  {new Date(d.date).toLocaleDateString("en-IN", { weekday: "short" })}
                </span>
                <span className="ww-fc-icon">{icon}</span>
                <span className="ww-fc-hi">{Math.round(d.high)}°</span>
                <span className="ww-fc-lo">{Math.round(d.low)}°</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WeatherWidget;
