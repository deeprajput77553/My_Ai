import React, { useEffect, useState, useCallback, useRef } from "react";
import { getUserData } from "../api";
import "./GlobalNotification.css";

// Check every 30 seconds
const CHECK_INTERVAL = 30000;

export default function GlobalNotification() {
  const [toasts, setToasts] = useState([]);
  const displayedRefs = useRef(new Set());
  
  const formatTime = (d) => new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  
  const addToast = useCallback((id, reminder, type = "info") => {
    if (displayedRefs.current.has(id)) return;
    displayedRefs.current.add(id);
    
    // Ensure we trigger standard browser notification if allowed
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(type === "urgent" ? "⏰ Time's up!" : "Upcoming Reminder", {
        body: `${reminder.title} - ${formatTime(reminder.dueDate)}`,
        icon: "/favicon.ico",
        requireInteraction: type === "urgent"
      });
    }
    
    const newToast = { id, reminder, type };
    setToasts(prev => [...prev, newToast]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 12000);
  }, []);

  const dismissToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  useEffect(() => {
    let interval;
    const checkReminders = async () => {
      try {
        const res = await getUserData();
        if (!res.data || !res.data.reminders) return;
        
        const now = Date.now();
        const pending = res.data.reminders.filter(r => !r.completed && r.dueDate);
        
        pending.forEach(r => {
          const due = new Date(r.dueDate).getTime();
          const msUntil = due - now;
          
          if (msUntil <= 0 && msUntil > -CHECK_INTERVAL * 2) {
            // Due NOW (within the last 60s)
            addToast(`exact_${r._id}`, r, "urgent");
          } else if (msUntil > 0 && msUntil <= 5 * 60 * 1000) {
            // Due in <= 5 mins
            addToast(`5m_${r._id}`, r, "warning");
          } else if (msUntil > 0 && msUntil <= 60 * 60 * 1000 && msUntil > (60 * 60 * 1000 - CHECK_INTERVAL)) {
            // Exact 1 hour warning
            addToast(`1h_${r._id}`, r, "info");
          }
        });
      } catch (err) {
        console.error("Failed to check reminders", err);
      }
    };
    
    checkReminders(); // Check immediately on mount
    interval = setInterval(checkReminders, CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="global-toast-container">
      {toasts.map(toast => (
        <div key={toast.id} className={`global-toast ${toast.type}`}>
          <div className="gt-icon-wrap">
            {toast.type === "urgent" && <i className="fi fi-sr-bell-ring gt-icon bounce"></i>}
            {toast.type === "warning" && <i className="fi fi-sr-time-fast gt-icon pulse"></i>}
            {toast.type === "info" && <i className="fi fi-sr-info gt-icon"></i>}
          </div>
          <div className="gt-content">
            <div className="gt-title">
              {toast.type === "urgent" ? "Due Now!" : 
               toast.type === "warning" ? "Starting Soon" : "Upcoming Reminder"}
            </div>
            <div className="gt-body">{toast.reminder.title}</div>
            <div className="gt-time">{formatTime(toast.reminder.dueDate)}</div>
          </div>
          <button className="gt-close" onClick={() => dismissToast(toast.id)}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
