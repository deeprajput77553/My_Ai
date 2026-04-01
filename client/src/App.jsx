import { useEffect, useState, useRef, useCallback } from "react";
import { sendMessage, getChats } from "./api";
import Sidebar from "./components/Sidebar";
import Notes from "./components/Notes";
import "./App.css";

// ── Typing animation ──────────────────────────────────────────────────────────
function TypingMessage({ text, onDone }) {
  const [displayed, setDisplayed] = useState("");
  const indexRef = useRef(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDisplayed("");
    indexRef.current = 0;
    const interval = setInterval(() => {
      indexRef.current += 1;
      setDisplayed(text.slice(0, indexRef.current));
      if (indexRef.current >= text.length) {
        clearInterval(interval);
        onDone?.();
      }
    }, 18);
    return () => clearInterval(interval);
  }, [text, onDone]);

  return (
    <span>
      {displayed}
      {displayed.length < text.length && <span className="typingCursor" />}
    </span>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
function App() {
  const [tab, setTab]                   = useState("chat");
  const [message, setMessage]           = useState("");
  const [chats, setChats]               = useState([]);
  const [activeChatIndex, setActiveChatIndex] = useState(null);
  const [displayedChats, setDisplayedChats]   = useState([]);
  const [loading, setLoading]           = useState(false);
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [typingId, setTypingId]         = useState(null);

  // Notes history: [{ prompt, notes, timestamp }]
  const [notesHistory, setNotesHistory]         = useState([]);
  const [activeNotesIndex, setActiveNotesIndex] = useState(null);
  const [loadedNote, setLoadedNote]             = useState(null); // notes loaded from history

  const bottomRef = useRef(null);
  const handleTypingDone = useCallback(() => setTypingId(null), []);

  // Load chats on mount
  useEffect(() => {
    const load = async () => {
      const res = await getChats();
      setChats(res.data);
      setDisplayedChats(res.data);
    };
    load();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayedChats, loading]);

  // ── Chat handlers ─────────────────────────────────────────────────────────
  const handleSelectChat = (index) => {
    setActiveChatIndex(index);
    setDisplayedChats([chats[index]]);
    setTypingId(null);
    setTab("chat");
  };

  const handleNewChat = () => {
    setActiveChatIndex(null);
    setDisplayedChats([]);
    setMessage("");
    setTypingId(null);
  };

  const handleSend = async () => {
    if (!message.trim()) return;
    setLoading(true);
    const userText = message;
    setMessage("");
    try {
      const res = await sendMessage(userText);
      const newChat = res.data;
      setChats((prev) => [...prev, newChat]);
      setActiveChatIndex(null);
      setDisplayedChats((prev) => [...prev, newChat]);
      setTypingId(newChat._id);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── Notes history handlers ────────────────────────────────────────────────
  const handleNotesSaved = (prompt, notes) => {
    const entry = {
      prompt,
      notes,
      timestamp: new Date().toLocaleString("en-IN", {
        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
      }),
    };
    setNotesHistory((prev) => [entry, ...prev]);
    setActiveNotesIndex(0);
  };

  const handleSelectNotes = (index) => {
    setActiveNotesIndex(index);
    setLoadedNote(notesHistory[index]);
    setTab("notes");
  };

  return (
    <div className="app">

      <Sidebar
        chats={chats}
        setChats={setChats}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        activeChatIndex={activeChatIndex}
        notesHistory={notesHistory}
        onSelectNotes={handleSelectNotes}
        activeNotesIndex={activeNotesIndex}
        open={sidebarOpen}
        setOpen={setSidebarOpen}
      />

      <div className="main">

        {/* ── Sticky Topbar ── */}
        <div className="topbar">
          <button className="menuBtn" onClick={() => setSidebarOpen(true)}>☰</button>
          <h2>OLLAMA AI</h2>
          <div className="tabs">
            <button
              className={`tabBtn ${tab === "chat" ? "activeTab" : ""}`}
              onClick={() => { setTab("chat"); setLoadedNote(null); }}
            >💬 Chat</button>
            <button
              className={`tabBtn ${tab === "notes" ? "activeTab" : ""}`}
              onClick={() => setTab("notes")}
            >📝 Notes</button>
          </div>
        </div>

        {/* ── Chat Tab ── */}
        {tab === "chat" && (
          <>
            <div className="chatBox">
              {displayedChats.length === 0 && !loading && (
                <div style={{ margin: "auto", textAlign: "center", color: "#475569", fontSize: "14px" }}>
                  <div style={{ fontSize: "40px", marginBottom: "12px" }}>✨</div>
                  Ask me anything to get started.
                </div>
              )}

              {displayedChats.map((chat, i) => (
                <div key={chat._id || i} className="messageBlock">
                  <div className="userRow">
                    <div className="userMsg">{chat.userMessage}</div>
                  </div>
                  <div className="aiRow">
                    <div className="aiMsg">
                      {chat._id === typingId ? (
                        <TypingMessage text={chat.aiMessage} onDone={handleTypingDone} />
                      ) : (
                        chat.aiMessage
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="aiRow">
                  <div className="aiMsg">
                    <div className="dots"><span/><span/><span/></div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="inputArea">
              <input
                className="input"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask something..."
              />
              <button className="button" onClick={handleSend} disabled={loading}>
                Send
              </button>
            </div>
          </>
        )}

        {/* ── Notes Tab ── */}
        {tab === "notes" && (
          <Notes
            onNotesSaved={handleNotesSaved}
            preloadedNote={loadedNote}
          />
        )}

      </div>
    </div>
  );
}

export default App;