import { useState, useEffect, useRef } from "react";
import "./CommandPalette.css";

function CommandPalette({ isOpen, onClose, conversations, notesHistory, onNavigate, onSend }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      const recent = [];
      notesHistory.slice(0, 3).forEach((n, i) => {
        recent.push({ type: "note", title: n.prompt, item: n, index: i, icon: "fi-rr-edit" });
      });
      conversations.slice(0, 3).forEach(c => {
        recent.push({ type: "chat", title: c.title, item: c, icon: "fi-rr-messages" });
      });
      setResults(recent);
      return;
    }

    const q = query.toLowerCase();
    const filtered = [];

    // Search Conversations
    conversations.forEach(c => {
      if (c.title?.toLowerCase().includes(q)) {
        filtered.push({ type: "chat", title: c.title, item: c, icon: "fi-rr-messages" });
      }
    });

    // Search Notes
    notesHistory.forEach((n, i) => {
      if (n.prompt?.toLowerCase().includes(q) || n.notes?.toLowerCase().includes(q)) {
        filtered.push({ type: "note", title: n.prompt, item: n, index: i, icon: "fi-rr-edit" });
      }
    });

    // Quick Commands
    const commands = [
      { type: "cmd", title: "Check Weather", cmd: "What is the live weather?", icon: "fi-rr-cloud-sun" },
      { type: "cmd", title: "Latest News", cmd: "What are the latest news headlines?", icon: "fi-rr-newspaper" },
      { type: "cmd", title: "Clear Chat", action: "new-chat", icon: "fi-rr-trash" },
      { type: "cmd", title: "Open Settings", tab: "settings", icon: "fi-rr-settings" },
    ];

    commands.forEach(cmd => {
      if (cmd.title.toLowerCase().includes(q)) {
        filtered.push(cmd);
      }
    });

    setResults(filtered.slice(0, 8));
    setSelectedIndex(0);
  }, [query, conversations, notesHistory]);

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      setSelectedIndex((prev) => (prev + 1) % Math.max(results.length, 1));
    } else if (e.key === "ArrowUp") {
      setSelectedIndex((prev) => (prev - 1 + results.length) % Math.max(results.length, 1));
    } else if (e.key === "Enter") {
      if (results[selectedIndex]) {
        execute(results[selectedIndex]);
      } else if (query.trim()) {
        onSend(query.trim());
        onClose();
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  const execute = (res) => {
    if (res.type === "chat") onNavigate("chat", null, res.item);
    else if (res.type === "note") onNavigate("notes", res.index);
    else if (res.type === "cmd") {
      if (res.cmd) onSend(res.cmd);
      else if (res.tab) onNavigate(res.tab);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="cp-overlay" onClick={onClose}>
      <div className="cp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cp-input-wrapper">
          <i className="fi fi-rr-search cp-search-icon"></i>
          <input
            ref={inputRef}
            id="command-input"
            className="cp-input"
            placeholder="Type a command or search history (Ctrl+K)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="cp-esc-badge">ESC</div>
        </div>

        <div className="cp-results">
          {query.trim() === "" && (
            <div className="cp-hint">Start typing to search chats, notes, and commands...</div>
          )}
          
          {results.map((res, i) => (
            <div
              key={i}
              className={`cp-item ${i === selectedIndex ? "active" : ""}`}
              onMouseEnter={() => setSelectedIndex(i)}
              onClick={() => execute(res)}
            >
              <i className={`fi ${res.icon} cp-item-icon`}></i>
              <div className="cp-item-info">
                <div className="cp-item-title">{res.title}</div>
                <div className="cp-item-type">{res.type.toUpperCase()}</div>
              </div>
              {i === selectedIndex && <div className="cp-item-enter">↵ ENTER</div>}
            </div>
          ))}

          {query.trim() !== "" && results.length === 0 && (
            <div className="cp-item active" onClick={() => { onSend(query); onClose(); }}>
              <i className="fi fi-rr-sparkles cp-item-icon"></i>
              <div className="cp-item-info">
                <div className="cp-item-title">Ask AI: "{query}"</div>
                <div className="cp-item-type">CHAT</div>
              </div>
            </div>
          )}
        </div>

        <div className="cp-footer">
          <div className="cp-shortcut"><kbd>↑↓</kbd> Navigate</div>
          <div className="cp-shortcut"><kbd>↵</kbd> Select</div>
          <div className="cp-shortcut"><kbd>ESC</kbd> Close</div>
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;
