import { useState, useEffect, useCallback, useRef } from "react";
import { getUserData, addReminder, updateReminder, deleteReminder } from "../api";
import "./RemindersPanel.css";

const CAT_COLORS = {
  exam: "#f59e0b", event: "#38bdf8", task: "#34d399", reminder: "#a78bfa", other: "#94a3b8",
};
const CAT_LABELS = {
  exam: "Exam", event: "Event", task: "Task", reminder: "Reminder", other: "Other",
};

function formatDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function formatDateTime(d) {
  if (!d) return "";
  return new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
function daysUntil(d) {
  if (!d) return null;
  return Math.ceil((new Date(d) - Date.now()) / 86400000);
}

// ── In-App Toast Notification ─────────────────────────────────────────────────
function Toast({ toasts, removeToast }) {
  return (
    <div className="rp-toasts">
      {toasts.map(t => (
        <div key={t.id} className={`rp-toast rp-toast-${t.type || "info"}`}>
          <div className="rp-toast-icon">
            {t.type === "urgent" ? "🔔" : t.type === "warning" ? "⚠" : "i"}
          </div>
          <div className="rp-toast-body">
            <div className="rp-toast-title">{t.title}</div>
            <div className="rp-toast-sub">{t.sub}</div>
          </div>
          <button className="rp-toast-close" onClick={() => removeToast(t.id)}>×</button>
        </div>
      ))}
    </div>
  );
}

function useToasts() {
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((title, sub, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, title, sub, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 6000);
  }, []);
  const removeToast = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);
  return { toasts, addToast, removeToast };
}

// ── Add Reminder Modal ────────────────────────────────────────────────────────
function AddReminderModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    title: "", description: "", dueDate: "", category: "reminder", timetable: [],
  });
  const [timetableRow, setTimetableRow] = useState({ subject: "", date: "", time: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const res = await addReminder({ ...form, dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null });
      onSaved(res.data);
      onClose();
    } catch { alert("Failed to save reminder"); }
    setSaving(false);
  };

  const addTimetableRow = () => {
    if (!timetableRow.subject && !timetableRow.date) return;
    setForm(prev => ({
      ...prev,
      timetable: [...prev.timetable, { ...timetableRow, date: timetableRow.date ? new Date(timetableRow.date).toISOString() : null }],
    }));
    setTimetableRow({ subject: "", date: "", time: "", notes: "" });
  };

  return (
    <div className="rp-modal-overlay" onClick={onClose}>
      <div className="rp-modal" onClick={e => e.stopPropagation()}>
        <div className="rp-modal-header">
          <h3>New Reminder</h3>
          <button className="rp-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="rp-modal-body">
          <div className="rp-form-group">
            <label>Title *</label>
            <input className="rp-input" placeholder="e.g. Math Exam" value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          </div>
          <div className="rp-form-row-2">
            <div className="rp-form-group">
              <label>Category</label>
              <select className="rp-select" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                <option value="exam">Exam</option>
                <option value="event">Event</option>
                <option value="task">Task</option>
                <option value="reminder">Reminder</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="rp-form-group">
              <label>Due Date & Time</label>
              <input type="datetime-local" className="rp-input" value={form.dueDate}
                onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} />
            </div>
          </div>
          <div className="rp-form-group">
            <label>Description</label>
            <textarea className="rp-textarea" placeholder="Details, topics, etc." value={form.description} rows={2}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>

          <div className="rp-timetable-section">
            <div className="rp-section-label">Timetable (optional)</div>
            <div className="rp-timetable-add">
              <input className="rp-input" placeholder="Subject" value={timetableRow.subject}
                onChange={e => setTimetableRow(p => ({ ...p, subject: e.target.value }))} />
              <input type="date" className="rp-input" value={timetableRow.date}
                onChange={e => setTimetableRow(p => ({ ...p, date: e.target.value }))} />
              <input className="rp-input" placeholder="Time (e.g. 9 AM)" value={timetableRow.time}
                onChange={e => setTimetableRow(p => ({ ...p, time: e.target.value }))} />
              <button className="rp-add-row-btn" onClick={addTimetableRow}>+</button>
            </div>
            {form.timetable.length > 0 && (
              <div className="rp-timetable-list">
                {form.timetable.map((row, i) => (
                  <div key={i} className="rp-timetable-row">
                    <span>{row.subject}</span>
                    <span>{row.date ? formatDate(row.date) : ""}</span>
                    <span>{row.time}</span>
                    <button className="rp-del-row"
                      onClick={() => setForm(p => ({ ...p, timetable: p.timetable.filter((_, idx) => idx !== i) }))}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="rp-modal-footer">
          <button className="rp-cancel-btn" onClick={onClose}>Cancel</button>
          <button className="rp-save-btn" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Set Reminder"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────
function RemindersPanel() {
  const [userData, setUserData]     = useState({ reminders: [] });
  const [loadingData, setLoadingData] = useState(true);
  const [showAdd, setShowAdd]       = useState(false);
  const [filter, setFilter]         = useState("upcoming");
  const [expanded, setExpanded]     = useState(null);
  const [notifPermission, setNotifPermission] = useState(
    "Notification" in window ? Notification.permission : "unsupported"
  );
  const notifTimers = useRef([]);
  const { toasts, addToast, removeToast } = useToasts();

  // ── Load reminders ──────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      setLoadingData(true);
      const res = await getUserData();
      setUserData(res.data || { reminders: [] });
    } catch { void 0; }
    finally { setLoadingData(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Auto-request permission on mount if not decided yet ─────────────────────
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then(p => setNotifPermission(p));
    }
  }, []);

  // ── Schedule both browser + in-app notifications ────────────────────────────
  useEffect(() => {
    notifTimers.current.forEach(clearTimeout);
    notifTimers.current = [];

    const reminders = (userData.reminders || []).filter(r => !r.completed && r.dueDate);
    const now = Date.now();
    const granted = notifPermission === "granted";
    const MAX_SCHEDULE = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

    reminders.forEach(r => {
      const due = new Date(r.dueDate).getTime();
      const msUntil = due - now;
      const days = Math.ceil(msUntil / 86400000);

      // ── In-app toast for VERY SOON reminders (within next 24h when panel loads) ──
      if (msUntil > 0 && msUntil < 24 * 60 * 60 * 1000) {
        const hoursLeft = Math.max(1, Math.floor(msUntil / 3600000));
        addToast(
          `Coming up: ${r.title}`,
          `Due in ~${hoursLeft}h — ${formatDateTime(r.dueDate)}`,
          "urgent"
        );
      } else if (msUntil > 0 && days <= 3) {
        addToast(
          `Reminder: ${r.title}`,
          `Due in ${days} day${days !== 1 ? "s" : ""} — ${formatDate(r.dueDate)}`,
          "warning"
        );
      }

      // ── Browser notifications (scheduled) ──────────────────────────────────
      if (!granted) return;

      // 1 day before
      const msBefore = msUntil - 24 * 60 * 60 * 1000;
      if (msBefore > 0 && msBefore < MAX_SCHEDULE) {
        notifTimers.current.push(setTimeout(() => {
          new Notification(`Reminder Tomorrow: ${r.title}`, {
            body: `${CAT_LABELS[r.category] || "Reminder"} • Due: ${formatDateTime(r.dueDate)}`,
            icon: "/favicon.ico",
            badge: "/favicon.ico",
          });
        }, msBefore));
      }

      // 1 hour before
      const msOneHour = msUntil - 60 * 60 * 1000;
      if (msOneHour > 0 && msOneHour < MAX_SCHEDULE) {
        notifTimers.current.push(setTimeout(() => {
          new Notification(`1 hour left: ${r.title}`, {
            body: `Due at ${formatDateTime(r.dueDate)}`,
            icon: "/favicon.ico",
          });
        }, msOneHour));
      }

      // At exact time
      if (msUntil > 0 && msUntil < MAX_SCHEDULE) {
        notifTimers.current.push(setTimeout(() => {
          new Notification(`Due now: ${r.title}`, {
            body: r.description || "Time's up!",
            icon: "/favicon.ico",
            requireInteraction: true,
          });
        }, msUntil));
      }
    });

    return () => notifTimers.current.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData.reminders, notifPermission]);

  const handleToggleComplete = async (r) => {
    try {
      const res = await updateReminder(r._id, { completed: !r.completed });
      setUserData(res.data);
    } catch { void 0; }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this reminder?")) return;
    try {
      const res = await deleteReminder(id);
      setUserData(res.data);
    } catch { void 0; }
  };

  const reminders = userData.reminders || [];
  const filtered = reminders.filter(r => {
    const days = daysUntil(r.dueDate);
    if (filter === "upcoming")  return !r.completed && (days === null || days >= 0);
    if (filter === "completed") return r.completed;
    if (filter === "overdue")   return !r.completed && days !== null && days < 0;
    return true;
  }).sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate) - new Date(b.dueDate);
  });

  if (loadingData) return (
    <div className="rp-loading">
      <div className="dots"><span/><span/><span/></div>
      <p>Loading reminders…</p>
    </div>
  );

  return (
    <div className="rp-container">
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* Header */}
      <div className="rp-header">
        <div>
          <h2>Reminders</h2>
          <p>AI auto-detects exams & events from your chats</p>
        </div>
        <div className="rp-header-actions">
          {notifPermission === "denied" && (
            <span className="rp-notif-denied" title="Notifications blocked in browser settings">
              Notifications blocked
            </span>
          )}
          {notifPermission === "granted" && (
            <span className="rp-notif-on" title="Browser notifications enabled">
              Notifications on
            </span>
          )}
          <button className="rp-add-btn" onClick={() => setShowAdd(true)}>+ Add</button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="rp-filters">
        {[
          { key: "upcoming",  label: "Upcoming" },
          { key: "overdue",   label: "Overdue" },
          { key: "completed", label: "Done" },
          { key: "all",       label: "All" },
        ].map(f => (
          <button
            key={f.key}
            className={`rp-filter-tab ${filter === f.key ? "active" : ""}`}
            onClick={() => setFilter(f.key)}
          >{f.label}</button>
        ))}
        <div className="rp-filter-count">{filtered.length}</div>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="rp-empty">
          <div className="rp-empty-icon">&#x23F0;</div>
          <p>No {filter} reminders.<br />Add one or chat about an upcoming event!</p>
        </div>
      ) : (
        <div className="rp-list">
          {filtered.map(r => {
            const days = daysUntil(r.dueDate);
            const isExpanded = expanded === r._id;
            const urgency = days !== null && days <= 0 ? "urgent" : days !== null && days <= 3 ? "soon" : "";
            const catColor = CAT_COLORS[r.category] || "#94a3b8";
            return (
              <div key={r._id} className={`rp-card ${urgency} ${r.completed ? "done" : ""}`}
                style={{ "--cat-color": catColor }}>
                
                {/* Urgency bar */}
                {urgency && !r.completed && (
                  <div className="rp-urgency-bar" />
                )}

                <div className="rp-card-main">
                  <button
                    className={`rp-check-btn ${r.completed ? "checked" : ""}`}
                    onClick={() => handleToggleComplete(r)}
                    title={r.completed ? "Mark incomplete" : "Mark complete"}
                  >
                    {r.completed ? "✓" : ""}
                  </button>

                  <div className="rp-card-info">
                    <div className="rp-card-title-row">
                      <span className="rp-cat-badge" style={{ background: `${catColor}20`, color: catColor, borderColor: `${catColor}30` }}>
                        {CAT_LABELS[r.category]}
                      </span>
                      <span className="rp-card-title">{r.title}</span>
                    </div>

                    <div className="rp-card-meta">
                      {r.dueDate && (
                        <span className={`rp-due ${days !== null && days < 0 ? "overdue" : days !== null && days <= 1 ? "urgent-text" : ""}`}>
                          {formatDateTime(r.dueDate)}
                          {days !== null && (
                            <span className={`rp-days-badge ${days < 0 ? "past" : days === 0 ? "today" : days <= 3 ? "soon" : ""}`}>
                              {days < 0 ? `${Math.abs(days)}d ago` : days === 0 ? "Today!" : `${days}d left`}
                            </span>
                          )}
                        </span>
                      )}
                      {r.description && (
                        <span className="rp-desc-preview">
                          {r.description.slice(0, 60)}{r.description.length > 60 ? "…" : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="rp-card-actions">
                    {r.timetable?.length > 0 && (
                      <button className="rp-expand-btn" onClick={() => setExpanded(isExpanded ? null : r._id)}>
                        {isExpanded ? "▲" : "▼"}
                      </button>
                    )}
                    <button className="rp-del-btn" onClick={() => handleDelete(r._id)}><i className="fi fi-sr-trash"></i></button>
                  </div>
                </div>

                {isExpanded && r.timetable?.length > 0 && (
                  <div className="rp-timetable">
                    <div className="rp-timetable-title">Timetable</div>
                    <table className="rp-table">
                      <thead><tr><th>Subject</th><th>Date</th><th>Time</th><th>Notes</th></tr></thead>
                      <tbody>
                        {r.timetable.map((row, i) => (
                          <tr key={i}>
                            <td>{row.subject || "—"}</td>
                            <td>{row.date ? formatDate(row.date) : "—"}</td>
                            <td>{row.time || "—"}</td>
                            <td>{row.notes || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <AddReminderModal
          onClose={() => setShowAdd(false)}
          onSaved={(data) => setUserData(data)}
        />
      )}
    </div>
  );
}

export default RemindersPanel;
