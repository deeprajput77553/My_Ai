import mongoose from "mongoose";

const chatSchema = new mongoose.Schema({
  userMessage: String,
  aiMessage: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Chat", chatSchema);