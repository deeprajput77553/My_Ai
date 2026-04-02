import { useEffect, useState, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { sendMessage, getChats, getConversation } from "./api";
import Sidebar from "./components/Sidebar";
import Notes from "./components/Notes";
import SourcesPanel from "./components/SourcesPanel";
import CodeBlock from "./components/CodeBlock";
import "./App.css";

// ── Markdown components — uses CodeBlock for fenced code ─────────────────────
const ChatMarkdown = ({ content }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    components={{
      code({ node, inline, className, children, ...props }) {
        if (inline) {
          return (
            <code style={{
              background: "rgba(30,41,59,0.9)",
              border: "1px solid rgba(255,255,255,0.08)",
              padding: "2px 6px",
              borderRadius: "4px",
              fontSize: "13px",
              color: "#7dd3fc",
              fontFamily: "Fira Code, Consolas, monospace",
            }} {...props}>{children}</code>
          );
        }
        return <CodeBlock className={className}>{children}</CodeBlock>;
      },
      // Left-align all text elements
      p:          ({ children }) => <p style={{ margin: "0 0 10px", textAlign: "left" }}>{children}</p>,
      ul:         ({ children }) => <ul style={{ paddingLeft: "20px", margin: "0 0 10px", textAlign: "left" }}>{children}</ul>,
      ol:         ({ children }) => <ol style={{ paddingLeft: "20px", margin: "0 0 10px", textAlign: "left" }}>{children}</ol>,
      li:         ({ children }) => <li style={{ marginBottom: "4px", textAlign: "left" }}>{children}</li>,
      h1:         ({ children }) => <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#f1f5f9", margin: "16px 0 8px", textAlign: "left" }}>{children}</h1>,
      h2:         ({ children }) => <h2 style={{ fontSize: "17px", fontWeight: 600, color: "#e2e8f0", margin: "14px 0 6px", textAlign: "left" }}>{children}</h2>,
      h3:         ({ children }) => <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#cbd5e1", margin: "12px 0 4px", textAlign: "left" }}>{children}</h3>,
      strong:     ({ children }) => <strong style={{ color: "#f1f5f9", fontWeight: 600 }}>{children}</strong>,
      blockquote: ({ children }) => (
        <blockquote style={{
          borderLeft: "3px solid #6366f1",
          background: "rgba(99,102,241,0.08)",
          padding: "10px 14px",
          borderRadius: "0 8px 8px 0",
          margin: "12px 0",
          color: "#94a3b8",
          fontStyle: "italic",
          textAlign: "left",
        }}>{children}</blockquote>
      ),
      table: ({ children }) => (
        <div style={{ overflowX: "auto", margin: "14px 0" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>{children}</table>
        </div>
      ),
      th: ({ children }) => (
        <th style={{ padding: "8px 12px", background: "rgba(56,189,248,0.12)", color: "#7dd3fc", fontWeight: 700, textAlign: "left", borderBottom: "1px solid rgba(56,189,248,0.2)" }}>{children}</th>
      ),
      td: ({ children }) => (
        <td style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)", color: "#cbd5e1", textAlign: "left" }}>{children}</td>
      ),
    }}
  >
    {content}
  </ReactMarkdown>
);

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
      if (indexRef.current >= text.length) { clearInterval(interval); onDone?.(); }
    }, 14);
    return () => clearInterval(interval);
  }, [text, onDone]);

  return (
    <span style={{ textAlign: "left", display: "block" }}>
      {displayed}
      {displayed.length < text.length && <span className="typingCursor" />}
    </span>
  );
}

// ── User message with edit ────────────────────────────────────────────────────
function UserMessage({ content, onResend }) {
  const [editing, setEditing]   = useState(false);
  const [editVal, setEditVal]   = useState(content);

  const handleSave = () => {
    if (editVal.trim()) { onResend(editVal.trim()); }
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="userMsgWrapper">
        <textarea
          className="userEditTextarea"
          value={editVal}
          onChange={(e) => setEditVal(e.target.value)}
          rows={3}
          autoFocus
        />
        <div className="userEditActions">
          <button className="userEditCancel" onClick={() => setEditing(false)}>Cancel</button>
          <button className="userEditSave"   onClick={handleSave}>✓ Resend</button>
        </div>
      </div>
    );
  }

  return (
    <div className="userMsgWrapper">
      <div className="userMsg">{content}</div>
      <div className="userMsgActions">
        <button className="userEditBtn" onClick={() => setEditing(true)}>✏ Edit</button>
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
function App() {
  const [tab, setTab]                             = useState("chat");
  const [message, setMessage]                     = useState("");
  const [conversations, setConversations]         = useState([]);
  const [conversationId, setConversationId]       = useState(null);
  const [displayedMessages, setDisplayedMessages] = useState([]);
  const [msgMeta, setMsgMeta]                     = useState({});
  const [loading, setLoading]                     = useState(false);
  const [sidebarOpen, setSidebarOpen]             = useState(false);
  const [typingId, setTypingId]                   = useState(null);
  const [notesHistory, setNotesHistory]           = useState([]);
  const [activeNotesIndex, setActiveNotesIndex]   = useState(null);
  const [loadedNote, setLoadedNote]               = useState(null);

  const bottomRef        = useRef(null);
  const handleTypingDone = useCallback(() => setTypingId(null), []);

  useEffect(() => {
    getChats().then((res) => setConversations(res.data));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayedMessages, loading]);

  const handleSelectChat = async (conv) => {
    try {
      const res  = await getConversation(conv._id);
      const full = res.data;
      const msgs = full.messages.map((m, i) => ({ ...m, _displayId: `${full._id}_${i}` }));
      setConversationId(full._id);
      setDisplayedMessages(msgs);
      setTypingId(null);
      setMsgMeta({});
      setTab("chat");
    } catch (err) { console.error(err); }
  };

  const handleNewChat = () => {
    setConversationId(null);
    setDisplayedMessages([]);
    setMessage("");
    setTypingId(null);
    setMsgMeta({});
  };

  // Core send — accepts optional override text (for edit+resend)
  const doSend = async (text, convId = conversationId) => {
    if (!text.trim()) return;
    setLoading(true);

    // eslint-disable-next-line react-hooks/purity
    const userDisplayId = `user_${Date.now()}`;
    // eslint-disable-next-line react-hooks/purity
    const aiDisplayId   = `ai_${Date.now() + 1}`;
    const userMsg = { role: "user", content: text, _displayId: userDisplayId };

    setDisplayedMessages((prev) => [...prev, userMsg]);

    try {
      const res = await sendMessage(text, convId);
      const { conversationId: newConvId, aiMessage, searchResults, images, searchQuery, modelUsed } = res.data;

      setConversationId(newConvId);
      const aiMsg = { role: "ai", content: aiMessage, _displayId: aiDisplayId };
      setDisplayedMessages((prev) => [...prev, aiMsg]);
      setTypingId(aiDisplayId);

      setMsgMeta((prev) => ({
        ...prev,
        [aiDisplayId]: {
          searchResults: searchResults || [],
          images:        images        || [],
          searchQuery,
          modelUsed,
        },
      }));

      const listRes = await getChats();
      setConversations(listRes.data);
    } catch (err) { console.error(err); }

    setLoading(false);
  };

  const handleSend = () => {
    if (!message.trim()) return;
    const text = message;
    setMessage("");
    doSend(text);
  };

  // Edit+resend: remove messages from that pair onward, resend
  const handleResend = (pairIndex, newText) => {
    setDisplayedMessages((prev) => prev.slice(0, pairIndex));
    doSend(newText);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

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

  // Pair messages
  const messagePairs = [];
  for (let i = 0; i < displayedMessages.length; i += 2) {
    messagePairs.push({ userM: displayedMessages[i], aiM: displayedMessages[i + 1], pairStart: i });
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
            <button className={`tabBtn ${tab === "chat"  ? "activeTab" : ""}`} onClick={() => { setTab("chat");  setLoadedNote(null); }}>💬 Chat</button>
            <button className={`tabBtn ${tab === "notes" ? "activeTab" : ""}`} onClick={() => setTab("notes")}>📝 Notes</button>
          </div>
        </div>

        {/* ── Chat ── */}
        {tab === "chat" && (
          <>
            <div className="chatBox">
              {displayedMessages.length === 0 && !loading && (
                <div style={{ margin: "auto", textAlign: "center", color: "#475569", fontSize: "14px" }}>
                  <div style={{ fontSize: "40px", marginBottom: "12px" }}>✨</div>
                  Ask me anything to get started.
                </div>
              )}

              {messagePairs.map(({ userM, aiM, pairStart }) => (
                <div key={userM?._displayId || pairStart} className="messageBlock">

                  {/* User message with edit */}
                  {userM && (
                    <div className="userRow">
                      <UserMessage
                        content={userM.content}
                        onResend={(newText) => handleResend(pairStart, newText)}
                      />
                    </div>
                  )}

                  {/* AI message with markdown + code blocks */}
                  {aiM && (
                    <>
                      <div className="aiRow">
                        <div style={{ display: "flex", flexDirection: "column", maxWidth: "75%", minWidth: 0 }}>
                          {msgMeta[aiM._displayId]?.modelUsed && (
                            <span className={`modelBadge ${msgMeta[aiM._displayId].modelUsed}`}>
                              {msgMeta[aiM._displayId].modelUsed === "code" ? "⚡ CodeLlama" : "💬 Llama3"}
                            </span>
                          )}
                          <div className="aiMsg" style={{ maxWidth: "100%" }}>
                            {aiM._displayId === typingId ? (
                              <TypingMessage text={aiM.content} onDone={handleTypingDone} />
                            ) : (
                              <ChatMarkdown content={aiM.content} />
                            )}
                          </div>
                        </div>
                      </div>

                      {msgMeta[aiM._displayId]?.searchResults?.length > 0 || msgMeta[aiM._displayId]?.images?.length > 0 ? (
                        <div className="aiRow">
                          <div style={{ maxWidth: "75%", width: "100%" }}>
                            <SourcesPanel
                              searchResults={msgMeta[aiM._displayId].searchResults}
                              images={msgMeta[aiM._displayId].images}
                              searchQuery={msgMeta[aiM._displayId].searchQuery}
                            />
                          </div>
                        </div>
                      ) : null}
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
              <button className="button" onClick={handleSend} disabled={loading}>Send</button>
            </div>
          </>
        )}

        {/* ── Notes ── */}
        {tab === "notes" && (
          <Notes onNotesSaved={handleNotesSaved} preloadedNote={loadedNote} />
        )}
      </div>
    </div>
  );
}

export default App;