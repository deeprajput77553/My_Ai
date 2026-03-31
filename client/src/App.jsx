import { useEffect, useState, useRef } from "react";
import { sendMessage, getChats } from "./api";
import "./App.css";

function App() {
  const [message, setMessage] = useState("");
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const bottomRef = useRef(null);

  useEffect(() => {
    const loadChats = async () => {
      const res = await getChats();
      setChats(res.data);
    };
    loadChats();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats, loading]);

  const handleSend = async () => {
    if (!message.trim()) return;

    setLoading(true);

    try {
      const res = await sendMessage(message);
      setChats((prev) => [...prev, res.data]);
      setMessage("");
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSend();
  };

  return (
    <div className="app">

      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <h3>Chats</h3>
        <p>History coming soon...</p>
      </div>

      {sidebarOpen && (
        <div className="overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="main">

        {/* Topbar */}
        <div className="topbar">
          <button className="menuBtn" onClick={() => setSidebarOpen(true)}>☰</button>
          <h2>OLLAMA AI</h2>
        </div>

        {/* Chat */}
        <div className="chatBox">
          {chats.map((chat, i) => (
            <div key={i} className="messageBlock">

              <div className="userRow">
                <div className="userMsg">{chat.userMessage}</div>
              </div>

              <div className="aiRow">
                <div className="aiMsg">{chat.aiMessage}</div>
              </div>

            </div>
          ))}

          {loading && (
            <div className="aiRow">
              <div className="aiMsg">
                <div className="dots">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="inputArea">
          <input
            className="input"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask something..."
          />
          <button className="button" onClick={handleSend}>
            Send
          </button>
        </div>

      </div>
    </div>
  );
}

export default App;