import { deleteChat } from "../api";
import "./Sidebar.css";

function Sidebar({
  chats, setChats, onSelectChat, onNewChat, activeChatIndex,
  notesHistory, onSelectNotes, activeNotesIndex,
  open, setOpen,
}) {

  const handleDeleteChat = async (e, id, index) => {
    e.stopPropagation();
    try {
      await deleteChat(id);
      setChats((prev) => prev.filter((_, i) => i !== index));
      if (activeChatIndex === index) onNewChat();
    } catch (err) {
      console.error("Delete failed:", err);
    }
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

        {/* Scrollable body */}
        <div className="sidebarBody">

          {/* ── Chat History ── */}
          <div className="sectionLabel">💬 Chats</div>
          <div className="historyList">
            {chats.length === 0 ? (
              <div className="emptyState">No chats yet</div>
            ) : (
              chats.map((chat, i) => (
                <div
                  key={chat._id || i}
                  className={`historyCard ${activeChatIndex === i ? "active" : ""}`}
                  onClick={() => { onSelectChat(i); setOpen(false); }}
                >
                  <div className="historyContent">
                    <div className="historyTitle">
                      {chat.userMessage.length > 32
                        ? chat.userMessage.slice(0, 32) + "…"
                        : chat.userMessage}
                    </div>
                    <div className="historyPreview">
                      {chat.aiMessage?.slice(0, 42)}…
                    </div>
                  </div>
                  <button
                    className="deleteBtn"
                    onClick={(e) => handleDeleteChat(e, chat._id, i)}
                    title="Delete"
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
                      {note.prompt.length > 32
                        ? note.prompt.slice(0, 32) + "…"
                        : note.prompt}
                    </div>
                    <div className="historyPreview">{note.timestamp}</div>
                  </div>
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