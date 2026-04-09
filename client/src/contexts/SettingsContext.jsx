import { createContext, useContext, useState, useEffect } from "react";

const SettingsContext = createContext(null);

const DEFAULTS = {
  theme: "dark",        // "dark" | "light"
  fontSize: "medium",   // "small" | "medium" | "large"
  compactMode: false,
  animations: true,
  notificationsEnabled: true,
  ringtone: "chime",    // "chime" | "bell" | "digital"
  ttsAutoPlay: false,
  userDataLearning: true,
  usageAnalytics: false,
  language: "en",
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("ai_settings");
      return saved ? { ...DEFAULTS, ...JSON.parse(saved) } : DEFAULTS;
    } catch {
      return DEFAULTS;
    }
  });

  // Persist on change
  useEffect(() => {
    localStorage.setItem("ai_settings", JSON.stringify(settings));
  }, [settings]);

  // Apply CSS variables for theme & font size
  useEffect(() => {
    const root = document.documentElement;
    
    if (settings.theme === "light") {
      root.style.setProperty("--bg-primary",    "#f1f5f9");
      root.style.setProperty("--bg-secondary",  "#e2e8f0");
      root.style.setProperty("--bg-card",       "#ffffff");
      root.style.setProperty("--bg-input",      "#f8fafc");
      root.style.setProperty("--text-primary",  "#0f172a");
      root.style.setProperty("--text-secondary","#475569");
      root.style.setProperty("--text-muted",    "#94a3b8");
      root.style.setProperty("--border-color",  "rgba(0,0,0,0.09)");
      root.style.setProperty("--sidebar-bg",    "#ffffff");
      root.style.setProperty("--topbar-bg",     "rgba(255,255,255,0.97)");
      root.style.setProperty("--msg-ai-bg",     "rgba(226,232,240,0.8)");
      root.style.setProperty("--msg-ai-color",  "#1e293b");
      root.style.setProperty("--input-bg",      "#f8fafc");
      root.style.setProperty("--input-border",  "rgba(0,0,0,0.12)");
    } else {
      root.style.setProperty("--bg-primary",    "#0b0f1a");
      root.style.setProperty("--bg-secondary",  "#020617");
      root.style.setProperty("--bg-card",       "rgba(15,23,42,0.9)");
      root.style.setProperty("--bg-input",      "rgba(15,23,42,0.8)");
      root.style.setProperty("--text-primary",  "#e2e8f0");
      root.style.setProperty("--text-secondary","#94a3b8");
      root.style.setProperty("--text-muted",    "#475569");
      root.style.setProperty("--border-color",  "rgba(255,255,255,0.06)");
      root.style.setProperty("--sidebar-bg",    "#080c15");
      root.style.setProperty("--topbar-bg",     "rgba(11,15,26,0.97)");
      root.style.setProperty("--msg-ai-bg",     "rgba(30,41,59,0.7)");
      root.style.setProperty("--msg-ai-color",  "#e2e8f0");
      root.style.setProperty("--input-bg",      "rgba(15,23,42,0.8)");
      root.style.setProperty("--input-border",  "rgba(255,255,255,0.07)");
    }

    const fontSizeMap = { small: "13px", medium: "14px", large: "16px" };
    root.style.setProperty("--font-size-base", fontSizeMap[settings.fontSize] || "14px");
    root.style.setProperty("--font-size-sm",   settings.fontSize === "large" ? "14px" : settings.fontSize === "small" ? "11px" : "12px");
    
    document.body.setAttribute("data-theme", settings.theme);
  }, [settings.theme, settings.fontSize]);

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const resetSettings = () => setSettings(DEFAULTS);

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
};
