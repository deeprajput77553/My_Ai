import { useState, useEffect, useCallback } from "react";
import {
  getUserData, addProfileEntry, updateProfileEntry,
  deleteProfileEntry,
} from "../api";
import "./UserDataPanel.css";

const CATEGORIES = ["personal", "academic", "professional", "preferences", "health", "other"];
const CATEGORY_ICONS = {
  personal: "👤", academic: "🎓", professional: "💼",
  preferences: "⭐", health: "🏥", other: "📌",
};

function UserDataPanel() {
  const [userData, setUserData] = useState({ profile: [] });
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ key: "", value: "", category: "personal" });
  const [addForm, setAddForm] = useState({ key: "", value: "", category: "personal" });
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState("all");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getUserData();
      setUserData(res.data || { profile: [] });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!addForm.key.trim() || !addForm.value.trim()) return;
    setSaving(true);
    try {
      const res = await addProfileEntry(addForm);
      setUserData(res.data);
      setAddForm({ key: "", value: "", category: "personal" });
      setShowAdd(false);
      showToast("Entry added!");
    } catch (e) { showToast("Failed to add", "error"); }
    setSaving(false);
  };

  const startEdit = (entry) => {
    setEditingId(entry._id);
    setEditForm({ key: entry.key, value: entry.value, category: entry.category });
  };

  const handleUpdate = async (id) => {
    setSaving(true);
    try {
      const res = await updateProfileEntry(id, editForm);
      setUserData(res.data);
      setEditingId(null);
      showToast("Updated!");
    } catch (e) { showToast("Failed to update", "error"); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this entry?")) return;
    try {
      const res = await deleteProfileEntry(id);
      setUserData(res.data);
      showToast("Deleted");
    } catch (e) { showToast("Failed to delete", "error"); }
  };

  const profile = userData.profile || [];
  const filtered = filter === "all" ? profile : profile.filter(p => p.category === filter);

  if (loading) return (
    <div className="udp-loading">
      <div className="dots"><span /><span /><span /></div>
      <p>Loading your data…</p>
    </div>
  );

  return (
    <div className="udp-container">
      {toast && <div className={`udp-toast ${toast.type}`}>{toast.msg}</div>}

      {/* Header */}
      <div className="udp-header">
        <div className="udp-header-title">
          <div>
            <h2>My Profile Data</h2>
            <p>AI learns about you from your chats. Review and edit here.</p>
          </div>
        </div>
        <button className="udp-add-btn" onClick={() => setShowAdd(true)}>+ Add</button>
      </div>

      {/* Filter pills */}
      <div className="udp-filters">
        <button
          className={`udp-filter-pill ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >All ({profile.length})</button>
        {CATEGORIES.map(c => {
          const count = profile.filter(p => p.category === c).length;
          return count > 0 ? (
            <button
              key={c}
              className={`udp-filter-pill ${filter === c ? "active" : ""}`}
              onClick={() => setFilter(c)}
            >
              {CATEGORY_ICONS[c]} {c} ({count})
            </button>
          ) : null;
        })}
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="udp-add-form">
          <div className="udp-add-form-title">Add New Entry</div>
          <div className="udp-form-row">
            <input
              className="udp-input"
              placeholder="Key (e.g. College, Goal...)"
              value={addForm.key}
              onChange={e => setAddForm(p => ({ ...p, key: e.target.value }))}
            />
            <select
              className="udp-select"
              value={addForm.category}
              onChange={e => setAddForm(p => ({ ...p, category: e.target.value }))}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_ICONS[c]} {c}</option>)}
            </select>
          </div>
          <textarea
            className="udp-textarea"
            placeholder="Value / description"
            value={addForm.value}
            onChange={e => setAddForm(p => ({ ...p, value: e.target.value }))}
            rows={2}
          />
          <div className="udp-form-actions">
            <button className="udp-cancel-btn" onClick={() => setShowAdd(false)}>Cancel</button>
            <button className="udp-save-btn" onClick={handleAdd} disabled={saving}>
              {saving ? "Saving…" : "✓ Save"}
            </button>
          </div>
        </div>
      )}

      {/* Entries */}
      {filtered.length === 0 ? (
        <div className="udp-empty">
          <div>✨</div>
          <p>No data yet. Chat with AI naturally — it will learn about you!</p>
        </div>
      ) : (
        <div className="udp-list">
          {filtered.map(entry => (
            <div key={entry._id} className={`udp-card ${editingId === entry._id ? "editing" : ""}`}>
              {editingId === entry._id ? (
                <div className="udp-edit-form">
                  <div className="udp-form-row">
                    <input
                      className="udp-input"
                      value={editForm.key}
                      onChange={e => setEditForm(p => ({ ...p, key: e.target.value }))}
                      placeholder="Key"
                    />
                    <select
                      className="udp-select"
                      value={editForm.category}
                      onChange={e => setEditForm(p => ({ ...p, category: e.target.value }))}
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <textarea
                    className="udp-textarea"
                    value={editForm.value}
                    onChange={e => setEditForm(p => ({ ...p, value: e.target.value }))}
                    rows={2}
                  />
                  <div className="udp-form-actions">
                    <button className="udp-cancel-btn" onClick={() => setEditingId(null)}>Cancel</button>
                    <button className="udp-save-btn" onClick={() => handleUpdate(entry._id)} disabled={saving}>
                      {saving ? "…" : "✓ Save"}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="udp-card-header">
                    <div className="udp-card-key">
                      <span className="udp-cat-badge">{CATEGORY_ICONS[entry.category]} {entry.category}</span>
                      <span className="udp-key">{entry.key}</span>
                    </div>
                    <div className="udp-card-actions">
                      <span className="udp-source-badge">
                        {entry.source === "chat" ? "AI" : "Manual"}
                      </span>
                      <button className="udp-icon-btn" onClick={() => startEdit(entry)} title="Edit">✏️</button>
                      <button className="udp-icon-btn del" onClick={() => handleDelete(entry._id)} title="Delete">
                        <i className="fi fi-sr-trash"></i>
                      </button>
                    </div>
                  </div>
                  <div className="udp-card-value">{entry.value}</div>
                  {entry.updatedAt && (
                    <div className="udp-card-time">
                      Updated {new Date(entry.updatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default UserDataPanel;
