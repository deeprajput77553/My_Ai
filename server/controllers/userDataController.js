import UserData from "../models/UserData.js";
import { generateResponse } from "../services/ollamaService.js";

// ── Regex-based personal info extraction (fast, reliable) ─────────────────────
// Catches common patterns users say about themselves
const PERSONAL_PATTERNS = [
  // Name
  { regex: /my name is ([A-Za-z\s]+)/i,               key: "name",        category: "personal" },
  { regex: /i(?:'m| am) ([A-Za-z]+(?:\s[A-Za-z]+)?)/i, key: "name",      category: "personal" },
  { regex: /call me ([A-Za-z\s]+)/i,                  key: "name",        category: "personal" },
  // Age
  { regex: /i(?:'m| am) (\d{1,2}) years?(?: old)?/i, key: "age",          category: "personal" },
  { regex: /my age is (\d{1,2})/i,                    key: "age",          category: "personal" },
  // Location / city
  { regex: /i(?:'m| am) from ([A-Za-z\s,]+?)(?:\.|,|$)/i, key: "from",   category: "personal" },
  { regex: /i live in ([A-Za-z\s,]+?)(?:\.|,|\sand\s|$)/i, key: "city",  category: "personal" },
  { regex: /(?:based|located) in ([A-Za-z\s,]+?)(?:\.|,|$)/i, key: "city", category: "personal" },
  // College / school
  { regex: /(?:i study|studying) at ([A-Za-z\s]+(?:college|university|institute|iit|nit|school)[A-Za-z\s]*)/i, key: "college", category: "academic" },
  { regex: /(?:i'm|i am|i'm a) student (?:at|of) ([A-Za-z\s]+)/i, key: "college", category: "academic" },
  { regex: /my college is ([A-Za-z\s]+)/i,            key: "college",      category: "academic" },
  { regex: /i(?:'m| am) in ([A-Za-z\s]+(?:college|university|institute|iit|nit))/i, key: "college", category: "academic" },
  // Course / degree
  { regex: /i(?:'m| am) (?:doing|studying|pursuing) ([A-Za-z\s]+(?:engineering|science|arts|commerce|btech|mtech|bsc|msc|bca|mca|ba|ma|mbbs|mba)[A-Za-z\s]*)/i, key: "course", category: "academic" },
  { regex: /my (?:course|degree|major|stream) is ([A-Za-z\s]+)/i, key: "course", category: "academic" },
  // Job / profession
  { regex: /i(?:'m| am) (?:a |an )?([A-Za-z\s]+(?:developer|engineer|designer|teacher|doctor|manager|analyst|student|intern))/i, key: "job", category: "professional" },
  { regex: /i work (?:as|at) ([A-Za-z\s]+)/i,       key: "job",           category: "professional" },
  { regex: /my job is ([A-Za-z\s]+)/i,               key: "job",           category: "professional" },
  // Hobbies
  { regex: /i (?:love|enjoy|like|do) ([A-Za-z\s]+?) (?:in my free time|as a hobby|for fun)/i, key: "hobby", category: "personal" },
  { regex: /my (?:hobby|hobbies|interest) (?:is|are|include) ([A-Za-z\s,]+)/i, key: "hobby", category: "personal" },
  // Language
  { regex: /i speak ([A-Za-z\s,]+)/i,                key: "language",      category: "personal" },
  // Goal
  { regex: /my goal is (?:to )?([A-Za-z\s]+)/i,     key: "goal",          category: "personal" },
  { regex: /i want to (?:become|be) (?:a |an )?([A-Za-z\s]+)/i, key: "goal", category: "personal" },
];

const extractByRegex = (message) => {
  const results = [];
  for (const { regex, key, category } of PERSONAL_PATTERNS) {
    const match = message.match(regex);
    if (match && match[1]) {
      const value = match[1].trim().replace(/\s+/g, " ");
      if (value.length > 1 && value.length < 100) {
        results.push({ key, value, category });
      }
    }
  }
  return results;
};

// ── Regex-based reminder/event extraction ────────────────────────────────────
const REMINDER_PATTERNS = [
  { regex: /(?:exam|test|quiz|assessment) (?:on|at|next|this)? ?([A-Za-z0-9\s,]+)/i, category: "exam", titlePrefix: "Exam" },
  { regex: /(?:assignment|homework|project|submission) (?:due|on|by)? ?([A-Za-z0-9\s,]+)/i, category: "task", titlePrefix: "Assignment" },
  { regex: /(?:meeting|interview|presentation) (?:on|at|next|this)? ?([A-Za-z0-9\s,]+)/i, category: "event", titlePrefix: "Meeting" },
  { regex: /remind me (?:to|about)? (.+?) (?:on|at|by|in|next)/i, category: "reminder", titlePrefix: "Reminder" },
];

const extractRemindersRegex = (message) => {
  const results = [];
  for (const { regex, category, titlePrefix } of REMINDER_PATTERNS) {
    const match = message.match(regex);
    if (match && match[1]) {
      const desc = match[1].trim().slice(0, 80);
      if (desc.length > 2) {
        results.push({
          title: `${titlePrefix}: ${desc}`,
          description: message.slice(0, 200),
          category,
          dueDate: null,
          timetable: [],
        });
      }
    }
  }
  return results;
};

// ── Save extracted data to DB ─────────────────────────────────────────────────
const saveProfileItems = async (userId, items) => {
  if (!items.length) return;
  let userData = await UserData.findOne({ userId });
  if (!userData) userData = new UserData({ userId, profile: [], reminders: [] });
  
  for (const item of items) {
    if (!item.key || !item.value) continue;
    const existingIdx = userData.profile.findIndex(
      (p) => p.key.toLowerCase() === item.key.toLowerCase()
    );
    if (existingIdx >= 0) {
      userData.profile[existingIdx].value = item.value;
      userData.profile[existingIdx].source = "chat";
      userData.profile[existingIdx].updatedAt = new Date();
    } else {
      userData.profile.push({
        key: item.key,
        value: item.value,
        category: item.category || "personal",
        source: "chat",
      });
    }
  }
  await userData.save();
};

// ── Try AI-based extraction as enhancement (if message looks informative) ──────
const AI_TRIGGER_PHRASES = [
  "my name", "i am", "i'm", "i live", "i study", "i work", "my college",
  "my course", "my job", "my goal", "i enjoy", "my hobby", "i speak", "i'm from"
];
const looksPersonal = (msg) => AI_TRIGGER_PHRASES.some(p => msg.toLowerCase().includes(p));

const parseJsonFromText = (text) => {
  try {
    // Try direct parse
    const parsed = JSON.parse(text.trim());
    if (Array.isArray(parsed)) return parsed;
  } catch (_) {}
  try {
    // Extract array from text
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    if (start !== -1 && end > start) {
      const parsed = JSON.parse(text.slice(start, end + 1));
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (_) {}
  return null;
};

// ── Main extraction function ───────────────────────────────────────────────────
export const extractUserDataFromMessage = async (message, userId) => {
  try {
    // Step 1: Fast regex extraction
    const regexItems = extractByRegex(message);
    
    // Step 2: Only call AI if message looks personal AND is worth it
    let aiItems = [];
    if (looksPersonal(message)) {
      try {
        const prompt = `Extract user's personal info from this message as JSON array.
Format: [{"key":"name","value":"John","category":"personal"}]
Categories: personal, academic, professional, preferences, health, other
Return [] if nothing found. JSON array ONLY, no markdown, no explanation.
Message: "${message.slice(0, 300)}"`;
        
        const response = await generateResponse(prompt, "chat");
        const parsed = parseJsonFromText(response.replace(/```json|```/g, "").trim());
        if (parsed && Array.isArray(parsed)) {
          aiItems = parsed.filter(item => item.key && item.value && typeof item.value === "string" && item.value.length < 200);
        }
      } catch (_) {
        // AI failed — regex results are enough
      }
    }
    
    // Merge: AI items enhance regex items (AI wins on conflict)
    const merged = [...regexItems];
    for (const ai of aiItems) {
      const existingIdx = merged.findIndex(r => r.key.toLowerCase() === ai.key.toLowerCase());
      if (existingIdx >= 0) {
        merged[existingIdx] = ai; // prefer AI version
      } else {
        merged.push(ai);
      }
    }
    
    await saveProfileItems(userId, merged);
    return merged;
  } catch (err) {
    console.error("extractUserDataFromMessage error:", err.message);
    return [];
  }
};

// ── Extract reminders from message ────────────────────────────────────────────
export const extractRemindersFromMessage = async (message, userId) => {
  try {
    // Fast regex check first
    const regexReminders = extractRemindersRegex(message);
    
    // Only try AI for reminder extraction if message mentions time-sensitive stuff
    const TIME_WORDS = ["exam", "test", "quiz", "deadline", "due", "submit", "assignment", "project", "remind", "schedule", "next week", "tomorrow", "tonight", "meeting", "interview"];
    const hasTimeContext = TIME_WORDS.some(w => message.toLowerCase().includes(w));
    
    let aiReminders = [];
    if (hasTimeContext) {
      try {
        const now = new Date().toISOString().split("T")[0];
        const prompt = `Today: ${now}. Extract any reminders/events/exams from this message.
Return JSON array ONLY: [{"title":"Math Exam","description":"","dueDate":"2026-04-10","category":"exam"}]
Categories: exam, event, task, reminder, other
Return [] if none found. JSON ONLY.
Message: "${message.slice(0, 300)}"`;
        
        const response = await generateResponse(prompt, "chat");
        const parsed = parseJsonFromText(response.replace(/```json|```/g, "").trim());
        if (parsed && Array.isArray(parsed)) {
          aiReminders = parsed.filter(r => r.title && r.title.length > 2);
        }
      } catch (_) {}
    }
    
    const toSave = aiReminders.length > 0 ? aiReminders : regexReminders;
    if (!toSave.length) return [];
    
    let userData = await UserData.findOne({ userId });
    if (!userData) userData = new UserData({ userId, profile: [], reminders: [] });
    
    for (const item of toSave) {
      // Avoid duplicates by title
      const exists = userData.reminders.some(r => r.title.toLowerCase() === item.title.toLowerCase());
      if (exists) continue;
      
      userData.reminders.push({
        title: item.title,
        description: item.description || "",
        dueDate: item.dueDate ? new Date(item.dueDate) : null,
        category: item.category || "reminder",
        timetable: (item.timetable || []).map(t => ({
          date: t.date ? new Date(t.date) : null,
          subject: t.subject || "",
          time: t.time || "",
          notes: t.notes || "",
        })),
      });
    }
    
    await userData.save();
    return toSave;
  } catch (err) {
    console.error("extractRemindersFromMessage error:", err.message);
    return [];
  }
};

// ── REST API handlers ─────────────────────────────────────────────────────────
export const getUserData = async (req, res) => {
  try {
    const userId = req.userId;
    let userData = await UserData.findOne({ userId });
    if (!userData) userData = { profile: [], reminders: [] };
    res.json(userData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateProfileEntry = async (req, res) => {
  try {
    const userId = req.userId;
    const { key, value, category } = req.body;
    let userData = await UserData.findOne({ userId });
    if (!userData) userData = new UserData({ userId, profile: [], reminders: [] });
    const idx = userData.profile.findIndex(p => p._id.toString() === req.params.id);
    if (idx >= 0) {
      if (key)      userData.profile[idx].key      = key;
      if (value)    userData.profile[idx].value    = value;
      if (category) userData.profile[idx].category = category;
      userData.profile[idx].updatedAt = new Date();
      userData.profile[idx].source    = "manual";
    } else {
      return res.status(404).json({ error: "Entry not found" });
    }
    await userData.save();
    res.json(userData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const addProfileEntry = async (req, res) => {
  try {
    const userId = req.userId;
    const { key, value, category } = req.body;
    if (!key || !value) return res.status(400).json({ error: "key and value required" });
    let userData = await UserData.findOne({ userId });
    if (!userData) userData = new UserData({ userId, profile: [], reminders: [] });
    // Check duplicate
    const existingIdx = userData.profile.findIndex(p => p.key.toLowerCase() === key.toLowerCase());
    if (existingIdx >= 0) {
      userData.profile[existingIdx].value    = value;
      userData.profile[existingIdx].category = category || userData.profile[existingIdx].category;
      userData.profile[existingIdx].updatedAt= new Date();
    } else {
      userData.profile.push({ key, value, category: category || "personal", source: "manual" });
    }
    await userData.save();
    res.json(userData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteProfileEntry = async (req, res) => {
  try {
    const userId = req.userId;
    let userData = await UserData.findOne({ userId });
    if (!userData) return res.status(404).json({ error: "Not found" });
    userData.profile = userData.profile.filter(p => p._id.toString() !== req.params.id);
    await userData.save();
    res.json(userData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const addReminder = async (req, res) => {
  try {
    const userId = req.userId;
    const { title, description, dueDate, category, timetable } = req.body;
    if (!title) return res.status(400).json({ error: "title required" });
    let userData = await UserData.findOne({ userId });
    if (!userData) userData = new UserData({ userId, profile: [], reminders: [] });
    userData.reminders.push({ title, description, dueDate: dueDate ? new Date(dueDate) : null, category, timetable: timetable || [] });
    await userData.save();
    res.json(userData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateReminder = async (req, res) => {
  try {
    const userId = req.userId;
    let userData = await UserData.findOne({ userId });
    if (!userData) return res.status(404).json({ error: "Not found" });
    const idx = userData.reminders.findIndex(r => r._id.toString() === req.params.id);
    if (idx < 0) return res.status(404).json({ error: "Reminder not found" });
    Object.assign(userData.reminders[idx], req.body);
    await userData.save();
    res.json(userData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteReminder = async (req, res) => {
  try {
    const userId = req.userId;
    let userData = await UserData.findOne({ userId });
    if (!userData) return res.status(404).json({ error: "Not found" });
    userData.reminders = userData.reminders.filter(r => r._id.toString() !== req.params.id);
    await userData.save();
    res.json(userData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
