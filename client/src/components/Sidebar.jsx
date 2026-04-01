import { deleteChat } from "../api";   // ✅ one level up from components/ to src/
import "./Sidebar.css";                 // ✅ same folder: src/components/Sidebar.css

function Sidebar({ chats, setChats, onSelect, onNewChat, open, setOpen, activeIndex }) {

  const handleDelete = async (e, id, index) => {
    e.stopPropagation();
    try {
      await deleteChat(id);
      setChats((prev) => prev.filter((_, i) => i !== index));
      if (activeIndex === index) onNewChat();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  return (
    <>
      <div className={`sidebar ${open ? "open" : ""}`}>

        {/* Header */}
        <div className="sidebarHeader">
          <span className="sidebarTitle">Chat History</span>
          <button className="closeBtn" onClick={() => setOpen(false)}>✕</button>
        </div>

        {/* New Chat */}
        <button className="newChatBtn" onClick={() => { onNewChat(); setOpen(false); }}>
          <span>＋</span> New Chat
        </button>

        {/* History List */}
        <div className="historyList">
          {chats.length === 0 ? (
            <div className="emptyState">
              <div className="emptyIcon">💬</div>
              No chats yet. Start a conversation!
            </div>
          ) : (
            chats.map((chat, i) => (
              <div
                key={chat._id || i}
                className={`historyCard ${activeIndex === i ? "active" : ""}`}
                onClick={() => { onSelect(i); setOpen(false); }}
              >
                <div className="historyContent">
                  <div className="historyTitle">
                    {chat.userMessage.length > 35
                      ? chat.userMessage.slice(0, 35) + "…"
                      : chat.userMessage}
                  </div>
                  <div className="historyPreview">
                    {chat.aiMessage?.slice(0, 45)}…
                  </div>
                </div>
                <button
                  className="deleteBtn"
                  onClick={(e) => handleDelete(e, chat._id, i)}
                  title="Delete"
                >
                  🗑
                </button>
              </div>
            ))
          )}
        </div>

      </div>

      {open && <div className="overlay" onClick={() => setOpen(false)} />}
    </>
  );
}

export default Sidebar;