import mongoose from "mongoose";

const reminderSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: "" },
  dueDate: { type: Date },
  category: { type: String, enum: ["exam", "event", "task", "reminder", "other"], default: "reminder" },
  completed: { type: Boolean, default: false },
  notified: { type: Boolean, default: false },
  timetable: [{ // for exams/events with multiple items
    date: { type: Date },
    subject: { type: String },
    time: { type: String },
    notes: { type: String },
  }],
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const userDataEntrySchema = new mongoose.Schema({
  key: { type: String, required: true },   // e.g. "name", "location", "college", "hobby"
  value: { type: String, required: true },
  category: { type: String, enum: ["personal", "academic", "professional", "preferences", "health", "other"], default: "personal" },
  source: { type: String, enum: ["chat", "manual"], default: "manual" },
  updatedAt: { type: Date, default: Date.now },
}, { _id: true });

const userDataSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  profile: [userDataEntrySchema],
  reminders: [reminderSchema],
}, { timestamps: true });

export default mongoose.model("UserData", userDataSchema);
