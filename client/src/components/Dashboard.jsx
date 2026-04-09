import { useState, useEffect } from "react";
import { getDashboardData } from "../api";
import "./Dashboard.css";

function Dashboard({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardData()
      .then((res) => {
        setData(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Dashboard load error:", err);
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div className="db-container">
      <div className="dots"><span /><span /><span /></div>
    </div>
  );

  const { user, weather, news, reminders, date } = data || {};
  const dateObj = new Date(date);
  const hour = dateObj.getHours();
  
  let greeting = "Good Day";
  if (hour < 12) greeting = "Good Morning";
  else if (hour < 17) greeting = "Good Afternoon";
  else if (hour < 21) greeting = "Good Evening";
  else greeting = "Good Night";

  const formattedDate = dateObj.toLocaleDateString("en-IN", { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="db-container">
      <div className="db-greeting">
        <div className="db-date">{formattedDate}</div>
        <h1>{greeting}, {user?.name || "Sir"}</h1>
      </div>

      <div className="db-grid">
        {/* Weather Card */}
        <div className="db-card" onClick={() => onNavigate("chat", "What is the live weather?")} title="Check live weather">
          <div className="db-card-header">
            <i className="fi fi-rr-cloud-sun"></i> Live Weather
          </div>
          {weather ? (
            <div className="db-weather-brief">
              <div className="db-weather-temp">{weather.current?.temperature || "—"}°</div>
              <div className="db-weather-info">
                <div className="db-weather-city">{weather.location || "Mumbai"}</div>
                <div className="db-weather-desc">{weather.current?.condition || "Clear Skies"}</div>
              </div>
            </div>
          ) : (
            <div className="db-empty-state">Unable to fetch weather</div>
          )}
        </div>

        {/* Top News Card */}
        <div className="db-card" onClick={() => onNavigate("chat", "What are the latest news headlines?")} title="Read the news">
          <div className="db-card-header">
            <i className="fi fi-rr-newspaper"></i> Top News
          </div>
          {news && news[0] ? (
            <div className="db-news-item">
              <div className="db-news-title">{news[0].title}</div>
              <div className="db-news-meta">
                <span>{news[0].source}</span>
                <span>•</span>
                <span>Just Now</span>
              </div>
            </div>
          ) : (
            <div className="db-empty-state">No news headlines found</div>
          )}
        </div>

        {/* Next Reminder Card */}
        <div className="db-card" onClick={() => onNavigate("reminders")}>
          <div className="db-card-header">
            <i className="fi fi-rr-alarm-clock"></i> Next Reminder
          </div>
          {reminders && reminders[0] ? (
            <div className="db-rem-brief">
              <div className="db-rem-title">{reminders[0].title}</div>
              <div className="db-rem-time">
                <i className="fi fi-rr-calendar"></i>
                {new Date(reminders[0].dueDate).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ) : (
            <div className="db-empty-state">No upcoming reminders</div>
          )}
        </div>
      </div>

      <div className="db-actions">
        <h3 className="db-actions-title">Quick Actions</h3>
        <div className="db-actions-grid">
          <button className="db-action-btn" onClick={() => onNavigate("chat")}>
            <div className="db-action-icon"><i className="fi fi-rr-comment-alt"></i></div>
            <div>
              <div className="db-action-label">Start Chat</div>
              <div className="db-action-sub">Ask AI something new</div>
            </div>
          </button>

          <button className="db-action-btn" onClick={() => onNavigate("notes")}>
            <div className="db-action-icon"><i className="fi fi-rr-edit"></i></div>
            <div>
              <div className="db-action-label">Create Notes</div>
              <div className="db-action-sub">Generate study materials</div>
            </div>
          </button>

          <button className="db-action-btn" onClick={() => onNavigate("reminders")}>
            <div className="db-action-icon"><i className="fi fi-rr-bell"></i></div>
            <div>
              <div className="db-action-label">Set Reminder</div>
              <div className="db-action-sub">Don't forget important tasks</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
