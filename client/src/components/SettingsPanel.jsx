import { useState } from "react";
import { useSettings } from "../contexts/SettingsContext";
import { useAuth } from "../contexts/AuthContext";
import "./SettingsPanel.css";

function ToggleSwitch({ value, onChange }) {
  return (
    <button className={`sp-toggle ${value ? "on" : ""}`} onClick={() => onChange(!value)}>
      <span className="sp-toggle-knob" />
    </button>
  );
}

function SettingRow({ icon, label, description, children }) {
  return (
    <div className="sp-row">
      <div className="sp-row-left">
        <span className="sp-row-icon">{icon}</span>
        <div>
          <div className="sp-row-label">{label}</div>
          {description && <div className="sp-row-desc">{description}</div>}
        </div>
      </div>
      <div className="sp-row-control">{children}</div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="sp-section">
      <div className="sp-section-title">{title}</div>
      <div className="sp-section-body">{children}</div>
    </div>
  );
}

function SettingsPanel() {
  const { settings, updateSetting, resetSettings } = useSettings();
  const { user, logout, deleteAccount, updateProfile, updateEmail, changePassword } = useAuth();
  const [showReset, setShowReset] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Edit Profile
  const [editName, setEditName] = useState(false);
  const [newName, setNewName] = useState("");
  const [nameMsg, setNameMsg] = useState(null);

  // Change Email
  const [editEmail, setEditEmail] = useState(false);
  const [emailForm, setEmailForm] = useState({ email: "", password: "" });
  const [emailMsg, setEmailMsg] = useState(null);

  // Change Password
  const [editPwd, setEditPwd] = useState(false);
  const [pwdForm, setPwdForm] = useState({ current: "", newPwd: "" });
  const [pwdMsg, setPwdMsg] = useState(null);

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) { setDeleteError("Password is required"); return; }
    setDeleting(true);
    setDeleteError("");
    const result = await deleteAccount(deletePassword);
    if (!result.success) { setDeleteError(result.error); setDeleting(false); }
  };

  const handleUpdateName = async () => {
    if (!newName.trim()) return;
    const r = await updateProfile(newName.trim());
    if (r.success) { setEditName(false); setNameMsg({ t: "success", m: "Name updated!" }); }
    else setNameMsg({ t: "error", m: r.error });
    setTimeout(() => setNameMsg(null), 3000);
  };

  const handleUpdateEmail = async () => {
    if (!emailForm.email.trim() || !emailForm.password) return;
    const r = await updateEmail(emailForm.email.trim(), emailForm.password);
    if (r.success) { setEditEmail(false); setEmailForm({ email: "", password: "" }); setEmailMsg({ t: "success", m: "Email updated!" }); }
    else setEmailMsg({ t: "error", m: r.error });
    setTimeout(() => setEmailMsg(null), 3000);
  };

  const handleChangePwd = async () => {
    if (!pwdForm.current || !pwdForm.newPwd) return;
    const r = await changePassword(pwdForm.current, pwdForm.newPwd);
    if (r.success) { setEditPwd(false); setPwdForm({ current: "", newPwd: "" }); setPwdMsg({ t: "success", m: "Password changed!" }); }
    else setPwdMsg({ t: "error", m: r.error });
    setTimeout(() => setPwdMsg(null), 3000);
  };

  const handleCustomRingtone = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check size (limit to 2MB for localStorage)
    if (file.size > 2 * 1024 * 1024) {
      alert("File is too large. Please select a clip under 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result;
      updateSetting("customRingtone", base64);
      updateSetting("ringtone", "custom");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="sp-container">
      <div className="sp-header">
        <span className="sp-header-main-icon"><i className="fi fi-sr-settings"></i></span>
        <div>
          <h2>Settings</h2>
          <p>Customize your AI experience</p>
        </div>
      </div>

      {/* === Account === */}
      <Section title="Account">
        <div className="sp-account-card">
          <div className="sp-avatar">
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="sp-account-info">
            <div className="sp-account-name">{user?.name || "User"} {user?.role === "admin" && <span className="sp-admin-badge">Admin</span>}</div>
            <div className="sp-account-email">{user?.email || ""}</div>
          </div>
        </div>

        {/* Edit Name */}
        <SettingRow icon={<i className="fi fi-rr-user"></i>} label="Edit Name" description="Change your display name">
          {editName ? (
            <div className="sp-inline-form">
              <input className="sp-inline-input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="New name" autoFocus />
              <button className="sp-save-btn-sm" onClick={handleUpdateName}>Save</button>
              <button className="sp-cancel-btn-sm" onClick={() => setEditName(false)}>✗</button>
            </div>
          ) : (
            <button className="sp-secondary-btn" onClick={() => { setEditName(true); setNewName(user?.name || ""); }}>Edit</button>
          )}
        </SettingRow>
        {nameMsg && <div className={`sp-inline-msg ${nameMsg.t}`}>{nameMsg.m}</div>}

        {/* Change Email */}
        <SettingRow icon={<i className="fi fi-rr-envelope"></i>} label="Change Email" description="Update your email address">
          {editEmail ? (
            <div className="sp-inline-form sp-inline-form-col">
              <input className="sp-inline-input" value={emailForm.email} onChange={e => setEmailForm(p => ({ ...p, email: e.target.value }))} placeholder="New email" />
              <input className="sp-inline-input" type="password" value={emailForm.password} onChange={e => setEmailForm(p => ({ ...p, password: e.target.value }))} placeholder="Confirm password" />
              <div className="sp-inline-btns">
                <button className="sp-save-btn-sm" onClick={handleUpdateEmail}>Save</button>
                <button className="sp-cancel-btn-sm" onClick={() => setEditEmail(false)}>✗</button>
              </div>
            </div>
          ) : (
            <button className="sp-secondary-btn" onClick={() => setEditEmail(true)}>Change</button>
          )}
        </SettingRow>
        {emailMsg && <div className={`sp-inline-msg ${emailMsg.t}`}>{emailMsg.m}</div>}

        {/* Change Password */}
        <SettingRow icon={<i className="fi fi-rr-lock"></i>} label="Change Password" description="Update your password">
          {editPwd ? (
            <div className="sp-inline-form sp-inline-form-col">
              <input className="sp-inline-input" type="password" value={pwdForm.current} onChange={e => setPwdForm(p => ({ ...p, current: e.target.value }))} placeholder="Current password" />
              <input className="sp-inline-input" type="password" value={pwdForm.newPwd} onChange={e => setPwdForm(p => ({ ...p, newPwd: e.target.value }))} placeholder="New password" />
              <div className="sp-inline-btns">
                <button className="sp-save-btn-sm" onClick={handleChangePwd}>Save</button>
                <button className="sp-cancel-btn-sm" onClick={() => setEditPwd(false)}>✗</button>
              </div>
            </div>
          ) : (
            <button className="sp-secondary-btn" onClick={() => setEditPwd(true)}>Change</button>
          )}
        </SettingRow>
        {pwdMsg && <div className={`sp-inline-msg ${pwdMsg.t}`}>{pwdMsg.m}</div>}

        <SettingRow icon={<i className="fi fi-rr-exit"></i>} label="Logout" description="Sign out of your account">
          <button className="sp-danger-btn" onClick={() => setShowLogout(true)}>Logout</button>
        </SettingRow>
      </Section>


      {/* === Display === */}
      <Section title="Display">
        <SettingRow icon={<i className="fi fi-rr-brightness"></i>} label="Theme" description="Choose between dark and light mode">
          <div className="sp-theme-toggle">
            <button
              className={`sp-theme-btn ${settings.theme === "dark" ? "active" : ""}`}
              onClick={() => updateSetting("theme", "dark")}
            ><i className="fi fi-rr-moon"></i> Dark</button>
            <button
              className={`sp-theme-btn ${settings.theme === "light" ? "active" : ""}`}
              onClick={() => updateSetting("theme", "light")}
            ><i className="fi fi-rr-sun"></i> Light</button>
          </div>
        </SettingRow>

        <SettingRow icon={<i className="fi fi-rr-text"></i>} label="Font Size" description="Adjust text size throughout the app">
          <div className="sp-font-group">
            {["small", "medium", "large"].map(size => (
              <button
                key={size}
                className={`sp-font-btn ${settings.fontSize === size ? "active" : ""}`}
                onClick={() => updateSetting("fontSize", size)}
              >{size === "small" ? "A" : size === "medium" ? "A" : "A"}
                <span className="sp-font-label">{size}</span>
              </button>
            ))}
          </div>
        </SettingRow>

        <SettingRow icon={<i className="fi fi-rr-magic-wand"></i>} label="Animations" description="Enable smooth transitions and effects">
          <ToggleSwitch value={settings.animations} onChange={v => updateSetting("animations", v)} />
        </SettingRow>

        <SettingRow icon={<i className="fi fi-rr-expand"></i>} label="Compact Mode" description="Reduce spacing for more content">
          <ToggleSwitch value={settings.compactMode} onChange={v => updateSetting("compactMode", v)} />
        </SettingRow>
      </Section>

      {/* === AI & Chat === */}
      <Section title="AI & Chat">
        <SettingRow icon={<i className="fi fi-rr-bell"></i>} label="Notifications" description="Get browser notifications for reminders">
          <ToggleSwitch value={settings.notificationsEnabled} onChange={v => updateSetting("notificationsEnabled", v)} />
        </SettingRow>

        {settings.notificationsEnabled && (
          <SettingRow icon={<i className="fi fi-rr-music-alt"></i>} label="Ringtone" description="Sound played when a reminder triggers">
            <div className="sp-ringtone-group">
              <select
                className="sp-select"
                value={settings.ringtone}
                onChange={e => updateSetting("ringtone", e.target.value)}
              >
                <option value="chime">Soft Chime</option>
                <option value="bell">Bell Ring</option>
                <option value="digital">Digital Beep</option>
                {settings.customRingtone && <option value="custom">Custom Audio</option>}
              </select>

              <div className="sp-custom-manage">
                {!settings.customRingtone ? (
                  <label className="sp-add-custom">
                    <i className="fi fi-rr-plus"></i>
                    Add Custom
                    <input type="file" accept="audio/*" onChange={handleCustomRingtone} style={{ display: "none" }} />
                  </label>
                ) : (
                  <div className="sp-custom-actions">
                    <button className="sp-action-mini" title="Preview" onClick={() => {
                      const a = new Audio(settings.customRingtone); a.play();
                    }}>
                      <i className="fi fi-rr-play"></i>
                    </button>
                    <label className="sp-action-mini" title="Change">
                      <i className="fi fi-rr-refresh"></i>
                      <input type="file" accept="audio/*" onChange={handleCustomRingtone} style={{ display: "none" }} />
                    </label>
                    <button className="sp-action-mini sp-danger-mini" title="Remove" onClick={() => {
                      updateSetting("customRingtone", null);
                      if (settings.ringtone === "custom") updateSetting("ringtone", "chime");
                    }}>
                      <i className="fi fi-rr-trash"></i>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </SettingRow>
        )}

        <SettingRow icon={<i className="fi fi-rr-volume-up"></i>} label="Voice Auto-Play" description="Automatically speak AI responses">
          <ToggleSwitch value={settings.ttsAutoPlay} onChange={v => updateSetting("ttsAutoPlay", v)} />
        </SettingRow>

        <SettingRow icon={<i className="fi fi-rr-globe"></i>} label="Language" description="Preferred response language">
          <select
            className="sp-select"
            value={settings.language}
            onChange={e => updateSetting("language", e.target.value)}
          >
            <option value="en">🇬🇧 English</option>
            <option value="hi">🇮🇳 Hindi</option>
            <option value="mr">🇮🇳 Marathi</option>
            <option value="gu">🇮🇳 Gujarati</option>
            <option value="es">🇪🇸 Spanish</option>
            <option value="fr">🇫🇷 French</option>
            <option value="de">🇩🇪 German</option>
            <option value="ja">🇯🇵 Japanese</option>
          </select>
        </SettingRow>
      </Section>

      {/* === Privacy === */}
      <Section title="Privacy & Data">
        <SettingRow icon={<i className="fi fi-rr-database"></i>} label="User Data Learning" description="Allow AI to learn from your messages">
          <ToggleSwitch value={settings.userDataLearning} onChange={v => updateSetting("userDataLearning", v)} />
        </SettingRow>
        <SettingRow icon={<i className="fi fi-rr-stats"></i>} label="Usage Analytics" description="Help improve the app (anonymous)">
          <ToggleSwitch value={settings.usageAnalytics} onChange={v => updateSetting("usageAnalytics", v)} />
        </SettingRow>
      </Section>

      {/* === Danger Zone === */}
      <Section title={<><i className="fi fi-sr-triangle-warning"></i> Danger Zone</>}>
        <SettingRow icon={<i className="fi fi-sr-trash"></i>} label="Delete Account" description="Permanently delete your account and all data">
          <button className="sp-danger-btn" onClick={() => setShowDeleteAccount(true)}>
            <i className="fi fi-sr-trash"></i> Delete Account
          </button>
        </SettingRow>
      </Section>

      {/* === About === */}
      <Section title="About">
        <div className="sp-about-card">
          <div className="sp-app-logo">✨</div>
          <div className="sp-app-name">OLLAMA AI</div>
          <div className="sp-app-version">Version 2.1.0</div>
          <div className="sp-app-desc">Powered by Llama 3, CodeLlama & Local AI</div>
        </div>
      </Section>

      {/* Reset button */}
      <button className="sp-reset-btn" onClick={() => setShowReset(true)}>
        <i className="fi fi-rr-refresh"></i> Reset All Settings to Default
      </button>

      {/* Confirm Logout Modal */}
      {showLogout && (
        <div className="sp-confirm-overlay" onClick={() => setShowLogout(false)}>
          <div className="sp-confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="sp-confirm-icon"><i className="fi fi-rr-smile"></i></div>
            <h3>Logging out?</h3>
            <p>You'll need to sign in again to access your chats and data.</p>
            <div className="sp-confirm-actions">
              <button className="sp-cancel-btn" onClick={() => setShowLogout(false)}>Cancel</button>
              <button className="sp-danger-confirm-btn" onClick={logout}>Logout</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Reset Modal */}
      {showReset && (
        <div className="sp-confirm-overlay" onClick={() => setShowReset(false)}>
          <div className="sp-confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="sp-confirm-icon"><i className="fi fi-rr-triangle-warning"></i></div>
            <h3>Reset Settings?</h3>
            <p>This will restore all settings to their default values.</p>
            <div className="sp-confirm-actions">
              <button className="sp-cancel-btn" onClick={() => setShowReset(false)}>Cancel</button>
              <button className="sp-danger-confirm-btn" onClick={() => { resetSettings(); setShowReset(false); }}>Reset</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteAccount && (
        <div className="sp-confirm-overlay" onClick={() => { setShowDeleteAccount(false); setDeleteError(""); setDeletePassword(""); }}>
          <div className="sp-confirm-modal sp-delete-modal" onClick={e => e.stopPropagation()}>
            <div className="sp-confirm-icon"><i className="fi fi-rr-shield-exclamation" style={{ color: '#ef4444' }}></i></div>
            <h3>Delete Your Account?</h3>
            <p>This will <strong>permanently</strong> delete your account, all chats, notes, reminders, and personal data. This action <strong>cannot be undone</strong>.</p>
            <div className="sp-delete-input-group">
              <label className="sp-delete-label">Enter your password to confirm:</label>
              <input
                type="password"
                className="sp-delete-input"
                placeholder="Your password"
                value={deletePassword}
                onChange={e => { setDeletePassword(e.target.value); setDeleteError(""); }}
                autoFocus
              />
              {deleteError && <div className="sp-delete-error">{deleteError}</div>}
            </div>
            <div className="sp-confirm-actions">
              <button className="sp-cancel-btn" onClick={() => { setShowDeleteAccount(false); setDeleteError(""); setDeletePassword(""); }}>Cancel</button>
              <button className="sp-danger-confirm-btn" onClick={handleDeleteAccount} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete Forever"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsPanel;
