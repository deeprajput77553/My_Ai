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
  const { user, logout } = useAuth();
  const [showReset, setShowReset] = useState(false);
  const [showLogout, setShowLogout] = useState(false);

  return (
    <div className="sp-container">
      <div className="sp-header">
        <span>⚙️</span>
        <div>
          <h2>Settings</h2>
          <p>Customize your AI experience</p>
        </div>
      </div>

      {/* === Account === */}
      <Section title="👤 Account">
        <div className="sp-account-card">
          <div className="sp-avatar">
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="sp-account-info">
            <div className="sp-account-name">{user?.name || "User"}</div>
            <div className="sp-account-email">{user?.email || ""}</div>
          </div>
        </div>
        <SettingRow icon="🔒" label="Logout" description="Sign out of your account">
          <button className="sp-danger-btn" onClick={() => setShowLogout(true)}>
            Logout
          </button>
        </SettingRow>
        <SettingRow icon="🔄" label="Switch Account" description="Log in with a different account">
          <button className="sp-secondary-btn" onClick={() => setShowLogout(true)}>
            Switch
          </button>
        </SettingRow>
      </Section>

      {/* === Display === */}
      <Section title="🎨 Display">
        <SettingRow icon="🌙" label="Theme" description="Choose between dark and light mode">
          <div className="sp-theme-toggle">
            <button
              className={`sp-theme-btn ${settings.theme === "dark" ? "active" : ""}`}
              onClick={() => updateSetting("theme", "dark")}
            >🌙 Dark</button>
            <button
              className={`sp-theme-btn ${settings.theme === "light" ? "active" : ""}`}
              onClick={() => updateSetting("theme", "light")}
            >☀️ Light</button>
          </div>
        </SettingRow>

        <SettingRow icon="🔤" label="Font Size" description="Adjust text size throughout the app">
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

        <SettingRow icon="✨" label="Animations" description="Enable smooth transitions and effects">
          <ToggleSwitch value={settings.animations} onChange={v => updateSetting("animations", v)} />
        </SettingRow>

        <SettingRow icon="📐" label="Compact Mode" description="Reduce spacing for more content">
          <ToggleSwitch value={settings.compactMode} onChange={v => updateSetting("compactMode", v)} />
        </SettingRow>
      </Section>

      {/* === AI & Chat === */}
      <Section title="🤖 AI & Chat">
        <SettingRow icon="🔔" label="Notifications" description="Get browser notifications for reminders">
          <ToggleSwitch value={settings.notificationsEnabled} onChange={v => updateSetting("notificationsEnabled", v)} />
        </SettingRow>

        <SettingRow icon="🔊" label="Voice Auto-Play" description="Automatically speak AI responses">
          <ToggleSwitch value={settings.ttsAutoPlay} onChange={v => updateSetting("ttsAutoPlay", v)} />
        </SettingRow>

        <SettingRow icon="🌍" label="Language" description="Preferred response language">
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
      <Section title="🔐 Privacy & Data">
        <SettingRow icon="🗂️" label="User Data Learning" description="Allow AI to learn from your messages">
          <ToggleSwitch value={true} onChange={() => {}} />
        </SettingRow>
        <SettingRow icon="📊" label="Usage Analytics" description="Help improve the app (anonymous)">
          <ToggleSwitch value={false} onChange={() => {}} />
        </SettingRow>
      </Section>

      {/* === About === */}
      <Section title="ℹ️ About">
        <div className="sp-about-card">
          <div className="sp-app-logo">✨</div>
          <div className="sp-app-name">OLLAMA AI</div>
          <div className="sp-app-version">Version 2.0.0</div>
          <div className="sp-app-desc">Powered by Llama 3, CodeLlama & Local AI</div>
        </div>
      </Section>

      {/* Reset button */}
      <button className="sp-reset-btn" onClick={() => setShowReset(true)}>
        ↺ Reset All Settings to Default
      </button>

      {/* Confirm Logout Modal */}
      {showLogout && (
        <div className="sp-confirm-overlay" onClick={() => setShowLogout(false)}>
          <div className="sp-confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="sp-confirm-icon">👋</div>
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
            <div className="sp-confirm-icon">⚠️</div>
            <h3>Reset Settings?</h3>
            <p>This will restore all settings to their default values.</p>
            <div className="sp-confirm-actions">
              <button className="sp-cancel-btn" onClick={() => setShowReset(false)}>Cancel</button>
              <button className="sp-danger-confirm-btn" onClick={() => { resetSettings(); setShowReset(false); }}>Reset</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsPanel;
