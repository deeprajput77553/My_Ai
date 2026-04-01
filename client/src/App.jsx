import { useEffect, useState, useRef, useCallback } from "react";
import { sendMessage, getChats, getConversation } from "./api";
import Sidebar from "./components/Sidebar";
import Notes from "./components/Notes";
import SourcesPanel from "./components/SourcesPanel";
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
  const [tab, setTab]                           = useState("chat");
  const [message, setMessage]                   = useState("");

  // Sidebar conversations list
  const [conversations, setConversations]       = useState([]);

  // Active conversation
  const [conversationId, setConversationId]     = useState(null); // MongoDB _id
  const [displayedMessages, setDisplayedMessages] = useState([]); // { role, content, _id? }

  // Per-message search meta { tempId/index: { searchResults, images, searchQuery } }
  const [msgMeta, setMsgMeta]                   = useState({});

  const [loading, setLoading]                   = useState(false);
  const [sidebarOpen, setSidebarOpen]           = useState(false);
  const [typingIndex, setTypingIndex]           = useState(null); // index in displayedMessages

  // Notes
  const [notesHistory, setNotesHistory]         = useState([]);
  const [activeNotesIndex, setActiveNotesIndex] = useState(null);
  const [loadedNote, setLoadedNote]             = useState(null);

  const bottomRef        = useRef(null);
  const handleTypingDone = useCallback(() => setTypingIndex(null), []);

  // Load conversation list on mount
  useEffect(() => {
    const load = async () => {
      const res = await getChats();
      setConversations(res.data);
    };
    load();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayedMessages, loading]);

  // ── Select a conversation from sidebar ───────────────────────────────────
  const handleSelectChat = async (conv) => {
    try {
      const res = await getConversation(conv._id);
      const fullConv = res.data;

      // Convert messages array into display format
      // Pair up user+ai messages for rendering
      const msgs = fullConv.messages.map((m, i) => ({
        ...m,
        _displayId: `${fullConv._id}_${i}`,
      }));

      setConversationId(fullConv._id);
      setDisplayedMessages(msgs);
      setTypingIndex(null);
      setMsgMeta({});
      setTab("chat");
    } catch (err) {
      console.error("Failed to load conversation:", err);
    }
  };

  // ── New chat ──────────────────────────────────────────────────────────────
  const handleNewChat = () => {
    setConversationId(null);
    setDisplayedMessages([]);
    setMessage("");
    setTypingIndex(null);
    setMsgMeta({});
  };

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!message.trim()) return;
    setLoading(true);
    const userText = message;
    setMessage("");

    // Optimistically add user message
    const userMsg = { role: "user", content: userText, _displayId: `temp_user_${Date.now()}` };
    setDisplayedMessages((prev) => [...prev, userMsg]);

    try {
      const res = await sendMessage(userText, conversationId);
      const { conversationId: newConvId, aiMessage, searchResults, images, searchQuery, webEnhanced } = res.data;

      // Set/update conversation ID
      setConversationId(newConvId);

      // Add AI message
      const aiMsg = { role: "ai", content: aiMessage, _displayId: `ai_${Date.now()}` };
      const aiIndex = displayedMessages.length + 1; // index after optimistic user msg
      setDisplayedMessages((prev) => [...prev, aiMsg]);
      setTypingIndex(aiIndex);

      // Store search meta
      if (webEnhanced) {
        setMsgMeta((prev) => ({
          ...prev,
          [aiMsg._displayId]: { searchResults, images, searchQuery },
        }));
      }

      // Refresh sidebar conversation list
      const listRes = await getChats();
      setConversations(listRes.data);

    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── Notes history ─────────────────────────────────────────────────────────
  const handleNotesSaved = (prompt, notes) => {
    const entry = {
      prompt, notes,
      timestamp: new Date().toLocaleString("en-IN", {
        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
      }),
    };
    setNotesHistory((prev) => [entry, ...prev]);
    setActiveNotesIndex(0);
  };

  const handleSelectNotes = (index) => {
    if (index === null) { setActiveNotesIndex(null); setLoadedNote(null); return; }
    setActiveNotesIndex(index);
    setLoadedNote(notesHistory[index]);
    setTab("notes");
  };

  // ── Pair messages for rendering (user → ai pairs) ────────────────────────
  // displayedMessages is a flat array of {role, content} — render them in pairs
  const messagePairs = [];
  for (let i = 0; i < displayedMessages.length; i += 2) {
    const userM = displayedMessages[i];
    const aiM   = displayedMessages[i + 1];
    messagePairs.push({ userM, aiM, pairIndex: i });
  }

  return (
    <div className="app">

      <Sidebar
        conversations={conversations}
        setConversations={setConversations}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        activeConvId={conversationId}
        notesHistory={notesHistory}
        setNotesHistory={setNotesHistory}
        onSelectNotes={handleSelectNotes}
        activeNotesIndex={activeNotesIndex}
        open={sidebarOpen}
        setOpen={setSidebarOpen}
      />

      <div className="main">

        {/* Sticky topbar */}
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

        {/* ── Chat tab ── */}
        {tab === "chat" && (
          <>
            <div className="chatBox">
              {displayedMessages.length === 0 && !loading && (
                <div style={{ margin: "auto", textAlign: "center", color: "#475569", fontSize: "14px" }}>
                  <div style={{ fontSize: "40px", marginBottom: "12px" }}>✨</div>
                  Ask me anything to get started.
                </div>
              )}

              {messagePairs.map(({ userM, aiM, pairIndex }) => (
                <div key={userM?._displayId || pairIndex} className="messageBlock">

                  {/* User message */}
                  {userM && (
                    <div className="userRow">
                      <div className="userMsg">{userM.content}</div>
                    </div>
                  )}

                  {/* AI message */}
                  {aiM && (
                    <>
                      <div className="aiRow">
                        <div className="aiMsg">
                          {pairIndex + 1 === typingIndex ? (
                            <TypingMessage text={aiM.content} onDone={handleTypingDone} />
                          ) : (
                            aiM.content
                          )}
                        </div>
                      </div>

                      {/* Sources panel */}
                      {msgMeta[aiM._displayId] && (
                        <div className="aiRow">
                          <div style={{ maxWidth: "70%", width: "100%" }}>
                            <SourcesPanel
                              searchResults={msgMeta[aiM._displayId].searchResults}
                              images={msgMeta[aiM._displayId].images}
                              searchQuery={msgMeta[aiM._displayId].searchQuery}
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}
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

        {/* ── Notes tab ── */}
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