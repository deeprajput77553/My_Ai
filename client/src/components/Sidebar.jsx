import { deleteChat } from "../api";
import "./Sidebar.css";

function Sidebar({
  conversations, setConversations,
  onSelectChat, onNewChat, activeConvId,
  notesHistory, setNotesHistory,
  onSelectNotes, activeNotesIndex,
  open, setOpen,
}) {

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

  // Get preview text from last AI message in conversation
  const getPreview = (conv) => {
    const msgs = conv.messages || [];
    const lastAi = [...msgs].reverse().find((m) => m.role === "ai");
    return lastAi?.content?.slice(0, 45) || "No messages yet";
  };

  const getMsgCount = (conv) => {
    const msgs = conv.messages || [];
    return Math.floor(msgs.length / 2); // pairs
  };

  return (
    <>
      <div className={`sidebar ${open ? "open" : ""}`}>

        {/* Header */}
        <div className="sidebarHeader">
          <span className="sidebarTitle">History</span>
          <button className="closeBtn" onClick={() => setOpen(false)}>✕</button>
        </div>

        {/* New Chat */}
        <button className="newChatBtn" onClick={() => { onNewChat(); setOpen(false); }}>
          <span>＋</span> New Chat
        </button>

        <div className="sidebarBody">

          {/* ── Chat Conversations ── */}
          <div className="sectionLabel">💬 Chats</div>
          <div className="historyList">
            {conversations.length === 0 ? (
              <div className="emptyState">No chats yet</div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv._id}
                  className={`historyCard ${activeConvId === conv._id ? "active" : ""}`}
                  onClick={() => { onSelectChat(conv); setOpen(false); }}
                >
                  <div className="historyContent">
                    <div className="historyTitle">
                      {conv.title?.length > 30
                        ? conv.title.slice(0, 30) + "…"
                        : conv.title || "New conversation"}
                    </div>
                    <div className="historyPreview">
                      {getPreview(conv)}… · {getMsgCount(conv)} msg{getMsgCount(conv) !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <button
                    className="deleteBtn"
                    onClick={(e) => handleDeleteChat(e, conv._id)}
                    title="Delete conversation"
                  >🗑</button>
                </div>
              ))
            )}
          </div>

          {/* ── Notes History ── */}
          <hr className="sidebarDivider" />
          <div className="sectionLabel">📝 Notes</div>
          <div className="historyList">
            {notesHistory.length === 0 ? (
              <div className="emptyState">No notes yet</div>
            ) : (
              notesHistory.map((note, i) => (
                <div
                  key={i}
                  className={`historyCard notesCard-sidebar ${activeNotesIndex === i ? "active" : ""}`}
                  onClick={() => { onSelectNotes(i); setOpen(false); }}
                >
                  <div className="historyContent">
                    <div className="historyTitle">
                      {note.prompt.length > 30
                        ? note.prompt.slice(0, 30) + "…"
                        : note.prompt}
                    </div>
                    <div className="historyPreview">{note.timestamp}</div>
                  </div>
                  <button
                    className="deleteBtn"
                    onClick={(e) => handleDeleteNote(e, i)}
                    title="Delete note"
                  >🗑</button>
                </div>
              ))
            )}
          </div>

        </div>
      </div>

      {open && <div className="overlay" onClick={() => setOpen(false)} />}
    </>
  );
}

export default Sidebar;