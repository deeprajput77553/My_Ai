import { useState, useEffect } from "react";
import "./WeatherWidget.css";

const WeatherWidget = ({ weatherData }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  if (!weatherData) return null;

  const { location, current, forecast } = weatherData;

  return (
    <div className={`weather-widget ${isVisible ? "visible" : ""}`}>
      <div className="weather-header">
        <span className="weather-icon">🌤️</span>
        <h3>Weather in {location}</h3>
      </div>

      <div className="weather-current">
        <div className="temp-display">
          <span className="temp-value">{Math.round(current.temperature)}°</span>
          <span className="temp-unit">C</span>
        </div>
        <div className="weather-details">
          <div className="weather-condition">
            <span className="condition-icon">{getWeatherIcon(current.condition)}</span>
            <span>{current.condition}</span>
          </div>
          <div className="weather-stats">
            <div className="stat">
              <span className="stat-icon">💧</span>
              <span>{current.humidity}%</span>
            </div>
            <div className="stat">
              <span className="stat-icon">💨</span>
              <span>{current.windSpeed} km/h</span>
            </div>
            <div className="stat">
              <span className="stat-icon">🌡️</span>
              <span>Feels like {Math.round(current.feelsLike)}°</span>
            </div>
          </div>
        </div>
      </div>

      {forecast && forecast.length > 0 && (
        <div className="weather-forecast">
          <h4>Forecast</h4>
          <div className="forecast-days">
            {forecast.slice(0, 5).map((day, index) => (
              <div key={index} className="forecast-day" style={{ animationDelay: `${index * 0.1}s` }}>
                <span className="forecast-date">{formatDate(day.date)}</span>
                <span className="forecast-icon">{getWeatherIcon(day.condition)}</span>
                <div className="forecast-temps">
                  <span className="temp-high">{Math.round(day.high)}°</span>
                  <span className="temp-low">{Math.round(day.low)}°</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const getWeatherIcon = (condition) => {
  const lower = condition.toLowerCase();
  if (lower.includes("clear") || lower.includes("sunny")) return "☀️";
  if (lower.includes("cloud")) return "☁️";
  if (lower.includes("rain")) return "🌧️";
  if (lower.includes("storm") || lower.includes("thunder")) return "⛈️";
  if (lower.includes("snow")) return "❄️";
  if (lower.includes("fog") || lower.includes("mist")) return "🌫️";
  if (lower.includes("wind")) return "💨";
  return "🌤️";
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
};

export default WeatherWidget;
