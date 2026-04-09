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

  const quotes = [
    { text: "Your limit is only your imagination.", author: "Unknown" },
    { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
    { text: "Great things never come from comfort zones.", author: "Unknown" },
    { text: "Dream it. Wish it. Do it.", author: "Unknown" },
    { text: "Success doesn’t just find you. You have to go out and get it.", author: "Unknown" },
    { text: "The harder you work for something, the greater you’ll feel when you achieve it.", author: "Unknown" },
    { text: "Wake up with determination. Go to bed with satisfaction.", author: "Unknown" },
    { text: "Do something today that your future self will thank you for.", author: "Unknown" }
  ];
  const dailyQuote = quotes[dateObj.getDate() % quotes.length];

  return (
    <div className="db-container">
      <div className="db-greeting-container">
        <div className="db-greeting">
          <div className="db-date">{formattedDate}</div>
          <h1>{greeting}, {user?.name || "Sir"}</h1>
        </div>
        <div className="db-quote-card">
          <i className="fi fi-sr-quote-right quote-icon"></i>
          <p className="quote-text">"{dailyQuote.text}"</p>
          <span className="quote-author">— {dailyQuote.author}</span>
        </div>
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

        {/* Pomodoro Timer Card */}
        <PomodoroTimer />

        {/* Scratchpad Card */}
        <Scratchpad />
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

function PomodoroTimer() {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState("work"); // work | break

  useEffect(() => {
    let interval = null;
    if (isActive) {
      interval = setInterval(() => {
        if (seconds > 0) {
          setSeconds(seconds - 1);
        } else if (minutes > 0) {
          setMinutes(minutes - 1);
          setSeconds(59);
        } else {
          setIsActive(false);
          // Play a small notification or switch mode
          if (mode === "work") { setMode("break"); setMinutes(5); }
          else { setMode("work"); setMinutes(25); }
        }
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, minutes, seconds, mode]);

  const toggle = () => setIsActive(!isActive);
  const reset = () => {
    setIsActive(false);
    setMinutes(mode === "work" ? 25 : 5);
    setSeconds(0);
  };

  return (
    <div className="db-card pomodoro-card">
      <div className="db-card-header">
        <i className="fi fi-rr-stopwatch"></i> {mode === "work" ? "Focus Mode" : "Break Time"}
      </div>
      <div className="pomo-display">
        {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </div>
      <div className="pomo-controls">
        <button onClick={toggle} className={`pomo-btn ${isActive ? 'pomo-stop' : 'pomo-start'}`}>
          {isActive ? <i className="fi fi-sr-pause"></i> : <i className="fi fi-sr-play"></i>}
        </button>
        <button onClick={reset} className="pomo-btn pomo-reset">
          <i className="fi fi-rr-refresh"></i>
        </button>
      </div>
    </div>
  );
}

function Scratchpad() {
  const [content, setContent] = useState(() => localStorage.getItem("ai_scratchpad") || "");
  
  const handleChange = (e) => {
    const val = e.target.value;
    setContent(val);
    localStorage.setItem("ai_scratchpad", val);
  };

  return (
    <div className="db-card scratchpad-card">
      <div className="db-card-header">
        <i className="fi fi-rr-clipboard"></i> Quick Scratchpad
      </div>
      <textarea 
        className="scratch-area" 
        placeholder="Type quick thoughts or to-dos here... (Autosaves)" 
        value={content}
        onChange={handleChange}
      />
    </div>
  );
}

export default Dashboard;
