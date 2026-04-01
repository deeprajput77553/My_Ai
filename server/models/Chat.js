import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ["user", "ai"], required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const chatSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },        // first user message, used as sidebar label
    messages: [messageSchema],                    // full conversation history
  },
  { timestamps: true }
);

export default mongoose.model("Chat", chatSchema);