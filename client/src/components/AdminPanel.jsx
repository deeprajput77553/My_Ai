import { useState, useEffect, useCallback } from "react";
import { adminGetUsers, adminUpdateUser, adminDeleteUser, adminCreateUser } from "../api";
import { useAuth } from "../contexts/AuthContext";
import "./AdminPanel.css";

const STATUS_COLORS = {
  active:  { bg: "rgba(52,211,153,0.1)",  color: "#34d399", border: "rgba(52,211,153,0.3)" },
  pending: { bg: "rgba(245,158,11,0.1)",  color: "#fbbf24", border: "rgba(245,158,11,0.3)" },
  blocked: { bg: "rgba(239,68,68,0.1)",   color: "#ef4444", border: "rgba(239,68,68,0.3)" },
};

function AdminPanel() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", email: "", password: "", role: "user" });
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState("all");

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminGetUsers();
      setUsers(res.data.users || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (userId, status) => {
    try {
      const res = await adminUpdateUser(userId, { status });
      setUsers(prev => prev.map(u => u._id === userId ? res.data.user : u));
      showToast(`User ${status === "active" ? "approved" : status}`);
    } catch { showToast("Failed to update", "error"); }
  };

  const handleRoleChange = async (userId, role) => {
    try {
      const res = await adminUpdateUser(userId, { role });
      setUsers(prev => prev.map(u => u._id === userId ? res.data.user : u));
      showToast(`Role changed to ${role}`);
    } catch { showToast("Failed to update", "error"); }
  };

  const handleDelete = async (userId, email) => {
    if (!window.confirm(`Delete user ${email}? This removes ALL their data.`)) return;
    try {
      await adminDeleteUser(userId);
      setUsers(prev => prev.filter(u => u._id !== userId));
      showToast("User deleted");
    } catch { showToast("Failed to delete", "error"); }
  };

  const handleCreate = async () => {
    setCreateError("");
    if (!createForm.name || !createForm.email || !createForm.password) {
      setCreateError("All fields are required"); return;
    }
    setCreating(true);
    try {
      const res = await adminCreateUser(createForm);
      setUsers(prev => [res.data.user, ...prev]);
      setShowCreate(false);
      setCreateForm({ name: "", email: "", password: "", role: "user" });
      showToast("User created!");
    } catch (e) {
      setCreateError(e.response?.data?.error?.message || "Failed to create user");
    }
    setCreating(false);
  };

  const filtered = filter === "all" ? users : users.filter(u => u.status === filter);
  const pendingCount = users.filter(u => u.status === "pending").length;

  if (loading) return (
    <div className="adm-loading">
      <div className="dots"><span/><span/><span/></div>
      <p>Loading users…</p>
    </div>
  );

  return (
    <div className="adm-container">
      {toast && <div className={`adm-toast ${toast.type}`}>{toast.msg}</div>}
      
      {/* Header */}
      <div className="adm-header">
        <div>
          <h2>Admin Panel</h2>
          <p>{users.length} total users{pendingCount > 0 && <span className="adm-pending-badge"> · {pendingCount} pending</span>}</p>
        </div>
        <button className="adm-create-btn" onClick={() => setShowCreate(true)}>+ Create User</button>
      </div>

      {/* Filters */}
      <div className="adm-filters">
        {["all", "active", "pending", "blocked"].map(f => (
          <button
            key={f}
            className={`adm-filter-pill ${filter === f ? "active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? `All (${users.length})` : `${f} (${users.filter(u => u.status === f).length})`}
          </button>
        ))}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="adm-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <h3>Create New User</h3>
            <div className="adm-form-group">
              <label>Name</label>
              <input className="adm-input" value={createForm.name} onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))} placeholder="Full Name" />
            </div>
            <div className="adm-form-group">
              <label>Email</label>
              <input className="adm-input" type="email" value={createForm.email} onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))} placeholder="email@example.com" />
            </div>
            <div className="adm-form-group">
              <label>Password</label>
              <input className="adm-input" type="password" value={createForm.password} onChange={e => setCreateForm(p => ({ ...p, password: e.target.value }))} placeholder="Min 8 chars, 1 uppercase, 1 number" />
            </div>
            <div className="adm-form-group">
              <label>Role</label>
              <select className="adm-select" value={createForm.role} onChange={e => setCreateForm(p => ({ ...p, role: e.target.value }))}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {createError && <div className="adm-error">{createError}</div>}
            <div className="adm-modal-actions">
              <button className="adm-cancel-btn" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="adm-save-btn" onClick={handleCreate} disabled={creating}>{creating ? "Creating…" : "Create"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Users table */}
      {filtered.length === 0 ? (
        <div className="adm-empty">No users found</div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const isMe = u._id === currentUser?._id;
                const sc = STATUS_COLORS[u.status] || STATUS_COLORS.active;
                return (
                  <tr key={u._id} className={isMe ? "adm-row-me" : ""}>
                    <td>
                      <div className="adm-user-cell">
                        <div className="adm-user-avatar">{u.name?.[0]?.toUpperCase() || "U"}</div>
                        <div>
                          <div className="adm-user-name">{u.name} {isMe && <span className="adm-you-badge">You</span>}</div>
                          <div className="adm-user-email">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {isMe ? (
                        <span className="adm-role-badge admin">admin</span>
                      ) : (
                        <select
                          className="adm-role-select"
                          value={u.role}
                          onChange={e => handleRoleChange(u._id, e.target.value)}
                        >
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                        </select>
                      )}
                    </td>
                    <td>
                      <span className="adm-status-badge" style={{ background: sc.bg, color: sc.color, borderColor: sc.border }}>
                        {u.status}
                      </span>
                    </td>
                    <td className="adm-date-cell">
                      {new Date(u.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td>
                      <div className="adm-action-btns">
                        {u.status === "pending" && (
                          <>
                            <button className="adm-approve-btn" onClick={() => handleStatusChange(u._id, "active")} title="Approve">✓</button>
                            <button className="adm-block-btn" onClick={() => handleStatusChange(u._id, "blocked")} title="Reject">✗</button>
                          </>
                        )}
                        {u.status === "active" && !isMe && (
                          <button className="adm-block-btn" onClick={() => handleStatusChange(u._id, "blocked")} title="Block">🚫</button>
                        )}
                        {u.status === "blocked" && (
                          <button className="adm-approve-btn" onClick={() => handleStatusChange(u._id, "active")} title="Unblock">✓</button>
                        )}
                        {!isMe && (
                          <button className="adm-delete-btn" onClick={() => handleDelete(u._id, u.email)} title="Delete"><i className="fi fi-sr-trash"></i></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminPanel;
