import { useEffect, useState, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { sendMessage, getChats, getConversation } from "./api";
import Sidebar from "./components/Sidebar";
import Notes from "./components/Notes";
import SourcesPanel from "./components/SourcesPanel";
import CodeBlock from "./components/CodeBlock";
import "./App.css";

// ─────────────────────────────────────────────────────────────────────────────
// 🎤  useVoice — Speech Recognition + TTS hook
// ─────────────────────────────────────────────────────────────────────────────
function useVoice({ onTranscript, onAutoSend }) {
  const [listening,  setListening]  = useState(false);
  const [supported,  setSupported]  = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }

    setSupported(true);
    const rec = new SR();
    rec.continuous     = false;   // stop after one utterance
    rec.interimResults = true;    // show partial results while speaking
    rec.lang           = "en-US";

    rec.onresult = (e) => {
      let interim = "";
      let final   = "";
      for (const result of e.results) {
        if (result.isFinal) final   += result[0].transcript;
        else                 interim += result[0].transcript;
      }
      // Show whatever we have so far in the input box
      onTranscript(final || interim);
      // Auto-send when we get a final result
      if (final.trim()) onAutoSend(final.trim());
    };

    rec.onend  = () => setListening(false);
    rec.onerror = (e) => {
      console.warn("SpeechRecognition error:", e.error);
      setListening(false);
    };

    recognitionRef.current = rec;
  }, []); // eslint-disable-line

  // Toggle mic on/off
  const toggleMic = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    if (listening) {
      rec.stop();
      setListening(false);
    } else {
      try { rec.start(); setListening(true); }
      catch { /* already started */ }
    }
  }, [listening]);

  // Speak text aloud
  const speak = useCallback((text) => {
    if (!ttsEnabled) return;
    if (!window.speechSynthesis) return;
    // Cancel any ongoing speech first
    window.speechSynthesis.cancel();
    // Strip markdown symbols for cleaner speech
    const clean = text
      .replace(/```[\s\S]*?```/g, "code block")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/#{1,6}\s/g, "")
      .replace(/\[(.+?)\]\(.+?\)/g, "$1")
      .slice(0, 600); // don't read huge responses in full
    const utt = new SpeechSynthesisUtterance(clean);
      const voices = window.speechSynthesis.getVoices();

    const femaleVoice =
    voices.find(v =>
      v.name.toLowerCase().includes("female") ||
      v.name.toLowerCase().includes("zira") ||     // Windows female
      v.name.toLowerCase().includes("samantha") || // Mac female
      v.name.toLowerCase().includes("google uk english female") ||
      v.name.toLowerCase().includes("en-gb")
    ) || voices[0];

  utt.voice = femaleVoice;
    utt.rate   = 1.05;
    utt.pitch  = 1;
    utt.volume = 1;
    window.speechSynthesis.speak(utt);
  }, [ttsEnabled]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
  }, []);

  return { listening, supported, ttsEnabled, setTtsEnabled, toggleMic, speak, stopSpeaking };
}

// ─────────────────────────────────────────────────────────────────────────────
// Markdown renderer (left-aligned, uses CodeBlock)
// ─────────────────────────────────────────────────────────────────────────────
const ChatMarkdown = ({ content }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    components={{
      code({ node, inline, className, children, ...props }) {
        if (inline) return (
          <code style={{
            background: "rgba(30,41,59,0.9)", border: "1px solid rgba(255,255,255,0.08)",
            padding: "2px 6px", borderRadius: "4px", fontSize: "13px",
            color: "#7dd3fc", fontFamily: "Fira Code, Consolas, monospace",
          }} {...props}>{children}</code>
        );
        return <CodeBlock className={className}>{children}</CodeBlock>;
      },
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
          borderLeft: "3px solid #6366f1", background: "rgba(99,102,241,0.08)",
          padding: "10px 14px", borderRadius: "0 8px 8px 0", margin: "12px 0",
          color: "#94a3b8", fontStyle: "italic", textAlign: "left",
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

// ─────────────────────────────────────────────────────────────────────────────
// Typing animation
// ─────────────────────────────────────────────────────────────────────────────
function TypingMessage({ text, onDone }) {
  const [displayed, setDisplayed] = useState("");
  const indexRef = useRef(0);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDisplayed(""); indexRef.current = 0;
    const iv = setInterval(() => {
      indexRef.current += 1;
      setDisplayed(text.slice(0, indexRef.current));
      if (indexRef.current >= text.length) { clearInterval(iv); onDone?.(); }
    }, 14);
    return () => clearInterval(iv);
  }, [text, onDone]);
  return (
    <span>
      {displayed}
      {displayed.length < text.length && <span className="typingCursor" />}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// User message (with inline edit)
// ─────────────────────────────────────────────────────────────────────────────
function UserMessage({ content, onResend }) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(content);
  if (editing) return (
    <div className="userMsgWrapper">
      <textarea className="userEditTextarea" value={editVal}
        onChange={(e) => setEditVal(e.target.value)} rows={3} autoFocus />
      <div className="userEditActions">
        <button className="userEditCancel" onClick={() => setEditing(false)}>Cancel</button>
        <button className="userEditSave" onClick={() => { if (editVal.trim()) onResend(editVal.trim()); setEditing(false); }}>✓ Resend</button>
      </div>
    </div>
  );
  return (
    <div className="userMsgWrapper">
      <div className="userMsg">{content}</div>
      <div className="userMsgActions">
        <button className="userEditBtn" onClick={() => setEditing(true)}>✏ Edit</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// App
// ─────────────────────────────────────────────────────────────────────────────
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

  // ── Voice hook ──────────────────────────────────────────────────────────────
  const voice = useVoice({
    // When speech is recognised, fill the input box
    onTranscript: (t) => setMessage(t),
    // When a final transcript arrives, auto-send it
    onAutoSend:   (t) => doSend(t),
  });

  useEffect(() => {
    getChats().then((r) => setConversations(r.data));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayedMessages, loading]);

  // ── Select conversation ────────────────────────────────────────────────────
  const handleSelectChat = async (conv) => {
    try {
      const res  = await getConversation(conv._id);
      const full = res.data;
      setConversationId(full._id);
      setDisplayedMessages(full.messages.map((m, i) => ({ ...m, _displayId: `${full._id}_${i}` })));
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
    voice.stopSpeaking();
  };

  // ── Core send (accepts text override for voice) ────────────────────────────
  const doSend = useCallback(async (text, convId = null) => {
    const resolvedConvId = convId ?? conversationId;
    if (!text?.trim() || loading) return;

    // Stop any ongoing speech before sending
    voice.stopSpeaking();
    setLoading(true);
    setMessage("");

    const userDisplayId = `user_${Date.now()}`;
    const aiDisplayId   = `ai_${Date.now() + 1}`;
    setDisplayedMessages((prev) => [...prev, { role: "user", content: text, _displayId: userDisplayId }]);

    try {
      const res = await sendMessage(text, resolvedConvId);
      const { conversationId: newConvId, aiMessage, searchResults, images, searchQuery, modelUsed } = res.data;

      setConversationId(newConvId);
      setDisplayedMessages((prev) => [...prev, { role: "ai", content: aiMessage, _displayId: aiDisplayId }]);
      setTypingId(aiDisplayId);

      setMsgMeta((prev) => ({
        ...prev,
        [aiDisplayId]: { searchResults: searchResults || [], images: images || [], searchQuery, modelUsed },
      }));

      // 🔊 Speak the AI response when typing animation finishes
      // We delay slightly so the typing animation has started
      setTimeout(() => voice.speak(aiMessage), 400);

      const listRes = await getChats();
      setConversations(listRes.data);
    } catch (err) { console.error(err); }

    setLoading(false);
  }, [conversationId, loading, voice]);

  const handleSend = () => {
    if (message.trim()) doSend(message.trim());
  };

  const handleResend = (pairIndex, newText) => {
    setDisplayedMessages((prev) => prev.slice(0, pairIndex));
    doSend(newText);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── Notes ──────────────────────────────────────────────────────────────────
  const handleNotesSaved = (prompt, notes) => {
    const entry = {
      prompt, notes,
      timestamp: new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
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

  // Pair messages for display
  const messagePairs = [];
  for (let i = 0; i < displayedMessages.length; i += 2) {
    messagePairs.push({ userM: displayedMessages[i], aiM: displayedMessages[i + 1], pairStart: i });
  }

  // ─────────────────────────────────────────────────────────────────────────
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

        {/* ── Sticky topbar ── */}
        <div className="topbar">
          <button className="menuBtn" onClick={() => setSidebarOpen(true)}>☰</button>
          <h2>OLLAMA AI</h2>
          <div className="tabs">
            <button className={`tabBtn ${tab === "chat"  ? "activeTab" : ""}`} onClick={() => { setTab("chat");  setLoadedNote(null); }}>💬 Chat</button>
            <button className={`tabBtn ${tab === "notes" ? "activeTab" : ""}`} onClick={() => setTab("notes")}>📝 Notes</button>
          </div>
        </div>

        {/* ── Chat tab ── */}
        {tab === "chat" && (
          <>
            <div className="chatBox">
              {displayedMessages.length === 0 && !loading && (
                <div style={{ margin: "auto", textAlign: "center", color: "#475569", fontSize: "14px" }}>
                  <div style={{ fontSize: "40px", marginBottom: "12px" }}>✨</div>
                  Ask me anything — or tap the mic to speak.
                </div>
              )}

              {messagePairs.map(({ userM, aiM, pairStart }) => (
                <div key={userM?._displayId || pairStart} className="messageBlock">

                  {userM && (
                    <div className="userRow">
                      <UserMessage content={userM.content} onResend={(t) => handleResend(pairStart, t)} />
                    </div>
                  )}

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
                            {aiM._displayId === typingId
                              ? <TypingMessage text={aiM.content} onDone={handleTypingDone} />
                              : <ChatMarkdown content={aiM.content} />}
                          </div>
                        </div>
                      </div>

                      {(msgMeta[aiM._displayId]?.searchResults?.length > 0 || msgMeta[aiM._displayId]?.images?.length > 0) && (
                        <div className="aiRow">
                          <div style={{ maxWidth: "75%", width: "100%" }}>
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

            {/* ── Input bar with mic + TTS ── */}
            <div className="inputArea">

              {/* TTS toggle — only show if speechSynthesis is available */}
              {typeof window !== "undefined" && window.speechSynthesis && (
                <button
                  className={`ttsBtn ${voice.ttsEnabled ? "ttsOn" : ""}`}
                  onClick={() => {
                    voice.stopSpeaking();
                    voice.setTtsEnabled((p) => !p);
                  }}
                  title={voice.ttsEnabled ? "Voice response ON — click to mute" : "Voice response OFF — click to enable"}
                >
                  {voice.ttsEnabled ? "🔊" : "🔇"}
                </button>
              )}

              {/* Text input */}
              <input
                className={`input ${voice.listening ? "listening" : ""}`}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={voice.listening ? "Listening…" : "Ask something or tap 🎤"}
              />

              {/* Mic button — only shown when browser supports it */}
              {voice.supported && (
                <button
                  className={`micBtn ${voice.listening ? "recording" : ""}`}
                  onClick={voice.toggleMic}
                  disabled={loading}
                  title={voice.listening ? "Stop recording" : "Start voice input"}
                >
                  🎤
                </button>
              )}

              {/* Send button */}
              <button className="button" onClick={handleSend} disabled={loading || voice.listening}>
                Send
              </button>
            </div>
          </>
        )}

        {/* ── Notes tab ── */}
        {tab === "notes" && (
          <Notes onNotesSaved={handleNotesSaved} preloadedNote={loadedNote} />
        )}
      </div>
    </div>
  );
}

export default App;