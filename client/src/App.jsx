import { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { sendMessage, getChats, getConversation } from "./api";
import { useAuth } from "./contexts/AuthContext";
import { useSettings } from "./contexts/SettingsContext";
import AuthPage from "./components/AuthPage";
import Sidebar from "./components/Sidebar";
import Notes from "./components/Notes";
import SourcesPanel from "./components/SourcesPanel";
import CodeBlock from "./components/CodeBlock";
import WeatherWidget from "./components/WeatherWidget";
import NewsWidget from "./components/NewsWidget";
import RemindersPanel from "./components/RemindersPanel";
import UserDataPanel from "./components/UserDataPanel";
import SettingsPanel from "./components/SettingsPanel";
import AdminPanel from "./components/AdminPanel";
import SplashScreen from "./components/SplashScreen";
import GlobalNotification from "./components/GlobalNotification";
import Dashboard from "./components/Dashboard";
import { extractTextFromFile } from "./utils/fileExtractor";
import "./App.css";

function useVoice({ onTranscript, onAutoSend }) {
  const { settings } = useSettings();
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);

  // Browser Speech State
  const recognitionRef = useRef(null);
  const transcriptRef = useRef("");
  const lastEmittedRef = useRef("");
  const silenceTimerRef = useRef(null);

  const onTranscriptRef = useRef(onTranscript);
  const onAutoSendRef = useRef(onAutoSend);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onAutoSendRef.current = onAutoSend;
  }, [onTranscript, onAutoSend]);

  useEffect(() => {
    setTtsEnabled(settings?.ttsAutoPlay ?? false);
  }, [settings?.ttsAutoPlay]);

  // Check support and setup Browser SR
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      setSupported(true);
      const rec = new SR();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onresult = (e) => {
        let interim = ""; let final = "";
        for (let i = e.resultIndex; i < e.results.length; ++i) {
          if (e.results[i].isFinal) final += e.results[i][0].transcript;
          else interim += e.results[i][0].transcript;
        }
        const currentEmitted = (transcriptRef.current + final + " " + interim).trim();
        if (final) {
          transcriptRef.current += final;
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            if (onAutoSendRef.current && transcriptRef.current.trim()) {
              onAutoSendRef.current(transcriptRef.current.trim());
              transcriptRef.current = "";
              rec.stop();
            }
          }, 2000);
        }
        if (onTranscriptRef.current) onTranscriptRef.current(currentEmitted);
      };

      rec.onend = () => {
        setListening(false);
      };

      rec.onerror = (e) => {
        console.warn("Browser Speech Error:", e.error);
        setListening(false);

        // Only show intrusive alerts for fatal configuration errors, not for Silence/no-speech timeouts.
        if (e.error !== "no-speech") {
          alert(`Microphone Error: "${e.error}"\n\nIf it says "not-allowed", your Windows OS or Browser is physically blocking access (Check Windows Settings > Privacy > Microphone).\nIf it says "network", a firewall/VPN is blocking the speech service.`);
        }
      };

      recognitionRef.current = rec;
    }
  }, []);

  const toggleMic = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) {
      alert("Microphone access is blocked or unsupported.\n\nIf you are using Brave, go to Settings ➔ Privacy and security ➔ ENABLE 'Google Services for Push Messaging' (or 'Speech Recognition'), and ensure mic permissions are granted to use voice chat.");
      return;
    }
    if (listening) {
      rec.stop();
    } else {
      transcriptRef.current = "";
      lastEmittedRef.current = "";
      try {
        rec.start();
        setListening(true);
      } catch (err) {
        console.warn("Mic start error:", err);
      }
    }
  }, [listening]);

  const speak = useCallback((text) => {
    if (!ttsEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/<think>[\s\S]*?<\/think>/g, "").replace(/```[\s\S]*?```/g, "code").trim().slice(0, 600);
    if (!clean) return;
    const utterance = new SpeechSynthesisUtterance(clean);
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find(v => v.name.toLowerCase().includes("female") || v.name.toLowerCase().includes("google uk english female")) || voices[0];
    utterance.rate = 1.05;
    window.speechSynthesis.speak(utterance);
  }, [ttsEnabled]);

  const stopSpeaking = useCallback(() => { window.speechSynthesis?.cancel(); }, []);

  return { listening, supported, ttsEnabled, setTtsEnabled, toggleMic, speak, stopSpeaking };
}

// ─────────────────────────────────────────────────────────────────────────────
// Markdown renderer
// ─────────────────────────────────────────────────────────────────────────────
const ChatMarkdown = ({ content }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    components={{
      code({ node, inline, className, children, ...props }) {
        if (inline) return (
          <code className="markdown-inline-code" {...props}>{children}</code>
        );
        return <CodeBlock className={className}>{children}</CodeBlock>;
      },
      blockquote: ({ children }) => (
        <blockquote className="markdown-blockquote">{children}</blockquote>
      ),
      p: ({ children }) => <p className="markdown-p">{children}</p>,
      ul: ({ children }) => <ul className="markdown-ul">{children}</ul>,
      ol: ({ children }) => <ol className="markdown-ol">{children}</ol>,
      li: ({ children }) => <li className="markdown-li">{children}</li>,
      h1: ({ children }) => <h1 className="markdown-h1">{children}</h1>,
      h2: ({ children }) => <h2 className="markdown-h2">{children}</h2>,
      h3: ({ children }) => <h3 className="markdown-h3">{children}</h3>,
      strong: ({ children }) => <strong className="markdown-strong">{children}</strong>,
      table: ({ children }) => (
        <div className="markdown-table-wrapper">
          <table className="markdown-table">{children}</table>
        </div>
      ),
      th: ({ children }) => (
        <th className="markdown-th">{children}</th>
      ),
      td: ({ children }) => (
        <td className="markdown-td">{children}</td>
      ),
    }}
  >
    {content}
  </ReactMarkdown>
);

// ─────────────────────────────────────────────────────────────────────────────
// Reasoning UI
// ─────────────────────────────────────────────────────────────────────────────
function ThinkingAccordion({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="thinking-accordion">
      <div className="thinking-header" onClick={() => setOpen(!open)}>
        <span className="thinking-icon">🧠</span>
        <span className="thinking-title">AI Thinking Process</span>
        <span className="thinking-toggle">{open ? "▼" : "▶"}</span>
      </div>
      {open && (
        <div className="thinking-body">
          <ChatMarkdown content={text} />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Message Parser
// ─────────────────────────────────────────────────────────────────────────────
function ParsedAIMessage({ content }) {
  // If the content doesn't have <think> tags, just render it normally
  if (!content.includes("<think>")) {
    return <ChatMarkdown content={content} />;
  }

  // Use Regex to split out the <think> blocks
  // format: [text before, thinking content, text after]
  const parts = content.split(/<think>\n?([\s\S]*?)\n?<\/think>/);

  return (
    <>
      {parts.map((part, index) => {
        if (!part) return null;
        // The regex split puts the captured <think> content in odd-numbered indices
        if (index % 2 === 1) {
          return <ThinkingAccordion key={index} text={part.trim()} />;
        }
        // Normal text content is in even indices
        return <ChatMarkdown key={index} content={part} />;
      })}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Typing animation
// ─────────────────────────────────────────────────────────────────────────────
function TypingMessage({ text, onDone }) {
  const [displayed, setDisplayed] = useState("");
  const indexRef = useRef(0);
  useEffect(() => {
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
    <div className="userMsgWrapper" onDoubleClick={() => setEditing(true)}>
      <div className="userMsg">
        <ChatMarkdown content={content} />
      </div>
    </div>
  );

}

// ─────────────────────────────────────────────────────────────────────────────
// App
// ─────────────────────────────────────────────────────────────────────────────
// Model Selector Component
// ─────────────────────────────────────────────────────────────────────────────
const NVIDIA_LOGO = "https://cdn.simpleicons.org/nvidia/76B900";
const OLLAMA_LOGO = "https://ollama.com/public/ollama.png";

function ModelSelector({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const options = [
    { id: "nvidia", name: "Nvidia GLM-5", logo: NVIDIA_LOGO, desc: "⚡ Fast & Smart" },
    { id: "ollama", name: "Local Ollama", logo: OLLAMA_LOGO, desc: "🦙 Privacy First" },
  ];

  const current = options.find(o => o.id === value) || options[0];

  return (
    <div className="model-selector-container" ref={containerRef}>
      <div className="model-selector-trigger" onClick={() => setIsOpen(!isOpen)}>
        <img src={current.logo} alt="" className="model-logo" />
        <span>{current.name}</span>
        <span style={{ fontSize: "10px", opacity: 0.6 }}>{isOpen ? "▲" : "▼"}</span>
      </div>

      {isOpen && (
        <div className="model-selector-options">
          {options.map(opt => (
            <div
              key={opt.id}
              className={`model-option ${value === opt.id ? "active" : ""}`}
              onClick={() => { onChange(opt.id); setIsOpen(false); }}
            >
              <img src={opt.logo} alt="" className="model-logo" />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontWeight: "700" }}>{opt.name}</span>
                <span style={{ fontSize: "10px", opacity: 0.5 }}>{opt.desc}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function App() {
  const { isAuthenticated, loading: authLoading, user, logout } = useAuth();

  const { settings } = useSettings();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [message, setMessage] = useState("");
  const [apiProvider, setApiProvider] = useState("nvidia");
  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [displayedMessages, setDisplayedMessages] = useState([]);
  const [msgMeta, setMsgMeta] = useState({});
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [typingId, setTypingId] = useState(null);
  const [notesHistory, setNotesHistory] = useState([]);
  const [activeNotesIndex, setActiveNotesIndex] = useState(null);
  const [loadedNote, setLoadedNote] = useState(null);
  const [showSplash, setShowSplash] = useState(true);

  // File analysis state
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);

  const bottomRef = useRef(null);
  const abortControllerRef = useRef(null);

  const handleTypingDone = useCallback(() => setTypingId(null), []);

  const voice = useVoice({
    onTranscript: (t) => {
      setMessage(curr => {
        const base = curr.includes("🎤") ? curr.split("🎤")[0] : curr;
        return (base.trim() ? base.trim() + " " : "") + "🎤 " + t;
      });
    },
    onAutoSend: (t) => {
      if (!t?.trim()) {
        setMessage(curr => curr.includes("🎤") ? curr.split("🎤")[0] : curr);
        return;
      }
      const base = message.includes("🎤") ? message.split("🎤")[0] : message;
      const fullMsg = (base.trim() ? base.trim() + " " : "") + t.trim();

      if (fullMsg.trim()) {
        doSend(fullMsg.trim());
      }
      setMessage(""); // Clear completely
    }
  });

  useEffect(() => {
    if (isAuthenticated) {
      getChats().then((r) => setConversations(r.data));
    }
  }, [isAuthenticated]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayedMessages, loading]);

  const handleSelectChat = async (conv) => {
    try {
      const res = await getConversation(conv._id);
      const full = res.data;
      setConversationId(full._id);
      setDisplayedMessages(full.messages.map((m, i) => ({ ...m, _displayId: `${full._id}_${i}`, _timestamp: m.timestamp || m.createdAt || null })));
      setTypingId(null);
      setMsgMeta({});
      setActiveTab("chat");
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

  // Format timestamp for message display
  const formatMsgTime = (ts) => {
    if (!ts) return "";
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();
    const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    if (isToday) return `Today, ${time}`;
    if (isYesterday) return `Yesterday, ${time}`;
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) + `, ${time}`;
  };

  const handleFileChange = (e) => {
    const picked = e.target.files[0];
    if (!picked) return;
    setFile(picked);
    e.target.value = "";
  };

  const removeFile = () => setFile(null);

  const doSend = useCallback(async (text, convId = null) => {
    const resolvedConvId = convId ?? conversationId;
    if ((!text?.trim() && !file) || loading) return;

    if (abortControllerRef.current) abortControllerRef.current.abort();
    const ctrl = new AbortController();
    abortControllerRef.current = ctrl;

    voice.stopSpeaking();
    setLoading(true);
    setMessage("");

    let finalText = text;
    let userDisplayContent = text;
    const currentFile = file;
    setFile(null); // Clear early

    if (currentFile) {
      try {
        const extractedText = await extractTextFromFile(currentFile);
        finalText = `[File: ${currentFile.name}]\n${extractedText}\n\nUser Question: ${text || "Please analyze this file."}`;
        userDisplayContent = `📎 **${currentFile.name}**\n\n${text || "Analyzed this file."}`;
      } catch (err) {
        console.error("File extraction failed:", err);
      }
    }

    const now = Date.now();
    const userDisplayId = `user_${now}`;
    const aiDisplayId = `ai_${now + 1}`;
    setDisplayedMessages((prev) => [...prev, { role: "user", content: userDisplayContent, _displayId: userDisplayId, _timestamp: now }]);
    try {
      const res = await sendMessage(
        finalText,
        resolvedConvId,
        apiProvider,
        settings.userDataLearning,
        settings.usageAnalytics,
        { signal: ctrl.signal }
      );
      const { conversationId: newConvId, aiMessage, searchResults, images, searchQuery, modelUsed, apiProvider: returnedApiProvider, weather, news } = res.data;
      setConversationId(newConvId);
      setDisplayedMessages((prev) => [...prev, { role: "ai", content: aiMessage, _displayId: aiDisplayId, _timestamp: Date.now() }]);
      setTypingId(aiDisplayId);
      setMsgMeta((prev) => ({
        ...prev,
        [aiDisplayId]: {
          searchResults: searchResults || [],
          images: images || [],
          searchQuery,
          modelUsed,
          apiProvider: returnedApiProvider || apiProvider,
          weather: weather || null,
          news: news || []
        },
      }));
      const speakableText = aiMessage.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
      setTimeout(() => voice.speak(speakableText), 400);
      const listRes = await getChats();
      setConversations(listRes.data);
    } catch (err) {
      if (err.name === "CanceledError" || err.name === "AbortError" || axios.isCancel(err)) {
        console.log("Generation stopped by user");
      } else {
        console.error(err);
      }
    }
    setLoading(false);
    abortControllerRef.current = null;
  }, [conversationId, loading, voice, apiProvider, file, settings.userDataLearning, settings.usageAnalytics]);

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
      setTypingId(null);
      voice.stopSpeaking();
    }
  };

  const handleSend = () => { if (message.trim() || file) doSend(message.trim()); };

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
      timestamp: new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
    };
    setNotesHistory((prev) => [entry, ...prev]);
    setActiveNotesIndex(0);
  };

  const handleSelectNotes = (index) => {
    if (index === null) { setActiveNotesIndex(null); setLoadedNote(null); return; }
    setActiveNotesIndex(index);
    setLoadedNote(notesHistory[index]);
    setActiveTab("notes");
  };

  const messagePairs = [];
  for (let i = 0; i < displayedMessages.length; i += 2) {
    messagePairs.push({ userM: displayedMessages[i], aiM: displayedMessages[i + 1], pairStart: i });
  }

  if (authLoading) {
    return (
      <div style={{
        display: "flex", flexDirection: "column",
        justifyContent: "center", alignItems: "center",
        height: "100vh",
        background: "linear-gradient(135deg, #0b0f1a, #020617)",
        gap: "16px"
      }}>
        <div className="dots">
          <span style={{ background: "#38bdf8" }}></span>
          <span style={{ background: "#38bdf8" }}></span>
          <span style={{ background: "#38bdf8" }}></span>
        </div>
        <div style={{ fontSize: "16px", color: "#94a3b8", fontWeight: 500 }}>Loading...</div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  const appContent = !isAuthenticated ? <AuthPage /> : (
    <div className={`app ${settings.compactMode ? "compact" : ""} ${settings.animations ? "" : "no-animations"}`}>
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
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab !== "notes") setLoadedNote(null);
        }}
      />

      <div className="main">

        {/* ── Sticky topbar ── */}
        <div className="topbar" data-active-tab={activeTab}>
          <button className="menuBtn" onClick={() => setSidebarOpen(o => !o)}>☰</button>
          <h2 className="topbar-title">
            {activeTab === "dashboard" && "Home"}
            {activeTab === "chat" && "Chat"}
            {activeTab === "notes" && "Notes"}
            {activeTab === "reminders" && "Reminders"}
            {activeTab === "userdata" && "My Data"}
            {activeTab === "settings" && "Settings"}
          </h2>
          <div className="topbar-right">
            <ModelSelector value={apiProvider} onChange={setApiProvider} />
            <div className="topbar-account">
              <button
                className="topbar-user"
                onClick={() => setActiveTab("settings")}
                title="Account Settings"
              >
                <div className="topbar-avatar">{user?.name ? user.name.charAt(0).toUpperCase() : "A"}</div>
                <span className="topbar-name">{user?.name}</span>
              </button>
            </div>

          </div>
        </div>

        {/* ── Tab content ── */}
        <div className="tab-content">
          {/* Dashboard */}
          {activeTab === "dashboard" && (
            <Dashboard onNavigate={(tab, promptText) => {
              setActiveTab(tab);
              if (tab !== "notes") setLoadedNote(null);
              if (promptText && tab === "chat") {
                setTimeout(() => doSend(promptText), 300);
              }
            }} />
          )}

          {/* Chat */}
          {activeTab === "chat" && (
            <>
              <div className="chatBox">
                {displayedMessages.length === 0 && !loading && (
                  <div className="chat-empty">
                    <div className="chat-empty-icon"><i className="fi fi-rr-sparkles"></i></div>
                    <div className="chat-empty-title">How can I help you today?</div>
                    <div className="chat-empty-sub">Ask me anything, or tap the <i className="fi fi-rr-microphone" style={{ verticalAlign: 'middle', fontSize: '1.2em', color: 'var(--accent-1)' }}></i> icon to speak.</div>
                    <div className="chat-suggestions">
                      {["What's the weather today?", "Latest news headlines", "Explain quantum physics", "Write a Python script"].map(s => (
                        <button key={s} className="chat-suggestion-pill" onClick={() => doSend(s)}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messagePairs.map(({ userM, aiM, pairStart }) => (
                  <div key={userM?._displayId || pairStart} className="messageBlock">
                    {userM && (
                      <div className="userRow">
                        <UserMessage content={userM.content} onResend={(t) => handleResend(pairStart, t)} />
                        {userM._timestamp && <span className="msg-timestamp msg-timestamp-right">{formatMsgTime(userM._timestamp)}</span>}
                      </div>
                    )}
                    {aiM && (
                      <>
                        <div className="aiRow">
                          <div style={{ display: "flex", flexDirection: "column", maxWidth: "75%", minWidth: 0 }}>
                            <div className="aiMsg" style={{ maxWidth: "100%" }}>
                              {aiM._displayId === typingId
                                ? <TypingMessage text={aiM.content} onDone={handleTypingDone} />
                                : <ParsedAIMessage content={aiM.content} />}
                            </div>
                            {aiM._timestamp && <span className="msg-timestamp">{formatMsgTime(aiM._timestamp)}</span>}
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

                        {/* ── Dedicated Live Data Section ── */}
                        {(msgMeta[aiM._displayId]?.weather || (msgMeta[aiM._displayId]?.news?.length > 0)) && (
                          <div className="chat-live-section">
                            <div className="chat-live-bar">
                              <span className="chat-live-dot" />
                              <span className="chat-live-label">
                                {msgMeta[aiM._displayId]?.weather && msgMeta[aiM._displayId]?.news?.length > 0
                                  ? "Weather & News"
                                  : msgMeta[aiM._displayId]?.weather ? "Live Weather" : "Latest News"}
                              </span>
                            </div>
                            {msgMeta[aiM._displayId]?.weather && (
                              <WeatherWidget weatherData={msgMeta[aiM._displayId].weather} />
                            )}
                            {msgMeta[aiM._displayId]?.news?.length > 0 && (
                              <NewsWidget newsData={msgMeta[aiM._displayId].news} />
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}

                {loading && (
                  <div className="aiRow">
                    <div className="aiMsg">
                      <div className="dots"><span /><span /><span /></div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input bar */}
              <div className="inputArea">
                <input
                  type="file"
                  style={{ display: "none" }}
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.txt,.json"
                />

                <button
                  className="attachBtn"
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach File (PDF, DOCX, TXT, JSON)"
                >
                  <i className="fi fi-rr-paperclip"></i>
                </button>

                {file && (
                  <div className="input-file-badge">
                    <span className="file-name">{file.name}</span>
                    <button className="file-remove" onClick={removeFile}>×</button>
                  </div>
                )}

                {typeof window !== "undefined" && window.speechSynthesis && (
                  <button
                    className={`ttsBtn ${voice.ttsEnabled ? "ttsOn" : ""}`}
                    onClick={() => { voice.stopSpeaking(); voice.setTtsEnabled((p) => !p); }}
                    title={voice.ttsEnabled ? "Voice response ON" : "Voice response OFF"}
                  >
                    {voice.ttsEnabled ? <i className="fi fi-rr-volume"></i> : <i className="fi fi-rr-volume-slash"></i>}
                  </button>
                )}
                <input
                  className={`input ${voice.listening ? "listening" : ""}`}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={voice.listening ? "Listening…" : "Ask something..."}
                />
                {voice.supported && (
                  <button
                    className={`micBtn ${voice.listening ? "recording" : ""} ${loading || typingId ? "processing" : ""}`}
                    onClick={voice.toggleMic}
                    disabled={(loading || typingId) && !voice.listening}
                    title={voice.listening ? "Stop recording" : "Start voice input"}
                  >
                    {((loading || typingId) && !voice.listening) ? (
                      <div className="mic-loader" />
                    ) : (
                      <i className="fi fi-rr-microphone"></i>
                    )}
                  </button>
                )}
                {loading ? (
                  <button className="button stop-button" onClick={handleStop}>
                    <div className="stop-square"></div>
                    Stop
                  </button>
                ) : (
                  <button className="button" onClick={handleSend} disabled={loading || voice.listening}>
                    Send
                  </button>
                )}
              </div>
            </>
          )}

          {/* Notes */}
          {activeTab === "notes" && (
            <Notes onNotesSaved={handleNotesSaved} preloadedNote={loadedNote} />
          )}

          {/* Reminders */}
          {activeTab === "reminders" && <RemindersPanel />}

          {/* User Data */}
          {activeTab === "userdata" && <UserDataPanel />}

          {/* Settings */}
          {activeTab === "settings" && <SettingsPanel />}

          {/* Admin */}
          {activeTab === "admin" && <AdminPanel />}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      <GlobalNotification />
      {appContent}
    </>
  );
}

export default App;