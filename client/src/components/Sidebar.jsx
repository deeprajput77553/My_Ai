import "./Sidebar.css";

function Sidebar({ chats, onSelect, open, setOpen }) {
  return (
    <>
      <div className={`sidebar ${open ? "open" : ""}`}>
        <h3>History</h3>

        <div className="historyList">
          {chats.map((chat, i) => (
            <div
              key={i}
              className="historyItem"
              onClick={() => {
                onSelect(i);
                setOpen(false);
              }}
            >
              {chat.userMessage.slice(0, 30)}...
            </div>
          ))}
        </div>
      </div>

      {open && (
        <div className="overlay" onClick={() => setOpen(false)} />
      )}
    </>
  );
}

export default Sidebar;