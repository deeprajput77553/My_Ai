import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
});

// Add token to all requests if it exists
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ── Chat ──────────────────────────────────────────
export const sendMessage = (message, conversationId, apiProvider) =>
  API.post("/chat", { message, conversationId, apiProvider });

export const getChats          = ()     => API.get("/chat");
export const getConversation   = (id)   => API.get(`/chat/${id}`);
export const deleteChat        = (id)   => API.delete(`/chat/${id}`);

// ── Notes ─────────────────────────────────────────
export const generateNotes          = (prompt)   => API.post("/notes/generate", { prompt });
export const parseQuestionsFromFile = (text)     => API.post("/notes/parse-questions", { text });
export const answerQuestion         = (question) => API.post("/notes/answer", { question });

// ── User Data ──────────────────────────────────────
export const getUserData        = ()         => API.get("/userdata");
export const addProfileEntry    = (entry)    => API.post("/userdata/profile", entry);
export const updateProfileEntry = (id, data) => API.put(`/userdata/profile/${id}`, data);
export const deleteProfileEntry = (id)       => API.delete(`/userdata/profile/${id}`);

// ── Reminders ─────────────────────────────────────
export const addReminder    = (data) => API.post("/userdata/reminders", data);
export const updateReminder = (id, data) => API.put(`/userdata/reminders/${id}`, data);
export const deleteReminder = (id)   => API.delete(`/userdata/reminders/${id}`);

// ── Account ───────────────────────────────────────
export const deleteAccount    = (password) => API.delete("/auth/account", { data: { password } });
export const updateProfile    = (data) => API.put("/auth/profile", data);
export const updateEmail      = (data) => API.put("/auth/email", data);
export const changePassword   = (data) => API.put("/auth/password", data);

// ── Admin ─────────────────────────────────────────
export const adminGetUsers    = () => API.get("/auth/admin/users");
export const adminUpdateUser  = (id, data) => API.put(`/auth/admin/users/${id}`, data);
export const adminDeleteUser  = (id) => API.delete(`/auth/admin/users/${id}`);
export const adminCreateUser  = (data) => API.post("/auth/admin/users", data);