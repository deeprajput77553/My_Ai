import { useState } from "react";
import { deleteChat } from "../api";
import { useAuth } from "../contexts/AuthContext";
import "./Sidebar.css";

const NAV_ITEMS = [
  { id: "dashboard", symbol: "Home",      uicon: "fi fi-rr-apps" },
  { id: "chat",      symbol: "Chat",      uicon: "fi fi-rr-messages" },
  { id: "notes",     symbol: "Notes",     uicon: "fi fi-rr-edit" },
  { id: "reminders", symbol: "Reminders", uicon: "fi fi-rr-bell" },
  { id: "userdata",  symbol: "My Data",   uicon: "fi fi-rr-data-transfer" },
  { id: "settings",  symbol: "Settings",  uicon: "fi fi-rr-settings" },
];

const ADMIN_NAV = { id: "admin", symbol: "Admin Panel", uicon: "fi fi-rr-shield-check" };

function Sidebar({
  conversations, setConversations,
  onSelectChat, onNewChat, activeConvId,
  notesHistory, setNotesHistory,
  onSelectNotes, activeNotesIndex,
  open, setOpen,
  activeTab, onTabChange,
}) {
  const { user, isAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  const firstLetter = user?.name ? user.name.charAt(0).toUpperCase() : "A";

  const handleDeleteChat = async (e, id) => {
    e.stopPropagation();
    try {
      await deleteChat(id);
      setConversations((prev) => prev.filter((c) => c._id !== id));
      if (activeConvId === id) onNewChat();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleDeleteNote = (e, index) => {
    e.stopPropagation();
    setNotesHistory((prev) => prev.filter((_, i) => i !== index));
    if (activeNotesIndex === index) onSelectNotes(null);
  };

  const getPreview = (conv) => {
    const msgs = conv.messages || [];
    const lastAi = [...msgs].reverse().find((m) => m.role === "ai");
    return lastAi?.content?.slice(0, 45) || "No messages yet";
  };

  const getMsgCount = (conv) => {
    const msgs = conv.messages || [];
    return Math.floor(msgs.length / 2);
  };

  const handleNavClick = (tabId) => {
    onTabChange(tabId);
    if (window.innerWidth <= 768) setOpen(false);
  };

  const navItems = isAdmin ? [...NAV_ITEMS, ADMIN_NAV] : NAV_ITEMS;

  return (
    <>
      <div className={`sidebar ${open ? "open" : ""}`}>

        {/* ── Logo / Brand ── */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">{firstLetter}</div>
          <span className="sidebar-brand-name">OLLAMA AI</span>
          <button className="sidebar-close-btn" onClick={() => setOpen(false)}>×</button>
        </div>

        {/* ── Navigation ── */}
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`sidebar-nav-item ${activeTab === item.id ? "active" : ""} ${item.id === "admin" ? "admin-nav" : ""}`}
              onClick={() => handleNavClick(item.id)}
              id={`sidebar-nav-${item.id}`}
            >
              <i className={`${item.uicon} sidebar-nav-uicon`} aria-hidden="true" />
              <span className="sidebar-nav-label">{item.symbol}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-divider" />

        {/* ── Context panel based on active tab ── */}
        {activeTab === "chat" && (
          <div className="sidebar-panel">
            <button className="new-chat-btn" onClick={() => { onNewChat(); setOpen(false); }}>
              <span>＋</span> New Chat
            </button>
            <div className="sidebar-section-label">Recent Chats</div>
            
            <div className="sidebar-search">
              <i className="fi fi-rr-search"></i>
              <input 
                type="text" 
                placeholder="Search chats..." 
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="sidebar-history-list">
              {conversations.filter(c => 
                (c.title || "").toLowerCase().includes((searchTerm || "").toLowerCase())
              ).length === 0 ? (
                <div className="sidebar-empty">No chats yet</div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv._id}
                    className={`sidebar-history-card ${activeConvId === conv._id ? "active" : ""}`}
                    onClick={() => { onSelectChat(conv); setOpen(false); }}
                  >
                    <div className="sidebar-history-content">
                      <div className="sidebar-history-title">
                        {conv.title?.length > 28 ? conv.title.slice(0, 28) + "…" : conv.title || "New conversation"}
                      </div>
                      <div className="sidebar-history-preview">
                        {getPreview(conv)}… · {getMsgCount(conv)} msg{getMsgCount(conv) !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <button
                      className="sidebar-delete-btn"
                      onClick={(e) => handleDeleteChat(e, conv._id)}
                      title="Delete"
                    ><i className="fi fi-sr-trash"></i></button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "notes" && (
          <div className="sidebar-panel">
            <div className="sidebar-section-label">Saved Notes</div>
            <div className="sidebar-history-list">
              {notesHistory.length === 0 ? (
                <div className="sidebar-empty">No notes yet</div>
              ) : (
                notesHistory.map((note, i) => (
                  <div
                    key={i}
                    className={`sidebar-history-card ${activeNotesIndex === i ? "active" : ""}`}
                    onClick={() => { onSelectNotes(i); setOpen(false); }}
                  >
                    <div className="sidebar-history-content">
                      <div className="sidebar-history-title">
                        {note.prompt.length > 28 ? note.prompt.slice(0, 28) + "…" : note.prompt}
                      </div>
                      <div className="sidebar-history-preview">{note.timestamp}</div>
                    </div>
                    <button
                      className="sidebar-delete-btn"
                      onClick={(e) => handleDeleteNote(e, i)}
                      title="Delete"
                    ><i className="fi fi-sr-trash"></i></button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {(activeTab === "reminders" || activeTab === "userdata" || activeTab === "settings" || activeTab === "admin") && (
          <div className="sidebar-panel sidebar-info-panel">
            <div className="sidebar-info-text">
              {activeTab === "reminders" && "View upcoming exams, events and deadlines in the main area."}
              {activeTab === "userdata" && "AI learns from your chats and stores your personal info here."}
              {activeTab === "settings" && "Adjust theme, font size, account and AI preferences."}
              {activeTab === "admin" && "Manage users, approve registrations, and assign roles."}
            </div>
          </div>
        )}

      </div>



      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}
    </>
  );
}

export default Sidebar;