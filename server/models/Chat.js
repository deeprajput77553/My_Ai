import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ["user", "ai"], required: true },
  content: { type: String, required: true },
  originalPrompt: { type: String }, // NEW: for regeneration
  version: { type: Number, default: 1 }, // NEW: for regeneration history
  incomplete: { type: Boolean, default: false }, // NEW: for stopped generation
  branchId: { type: String }, // NEW: which branch this belongs to
  createdAt: { type: Date, default: Date.now },
});

const branchSchema = new mongoose.Schema({
  name: { type: String, required: true },
  parentBranchId: { type: String },
  branchFromMessageIndex: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

const chatSchema = new mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    }, // NEW: owner of conversation
    title: { type: String, default: "" },        // first user message, used as sidebar label
    messages: [messageSchema],                    // full conversation history
    branches: [branchSchema],                     // NEW: conversation branches
    folderId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Folder" 
    }, // NEW: organization
    tags: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Tag" 
    }], // NEW: organization
    sharedWith: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Share" 
    }], // NEW: sharing
  },
  { timestamps: true }
);

// Indexes for performance
chatSchema.index({ userId: 1, updatedAt: -1 });
chatSchema.index({ userId: 1, folderId: 1 });
chatSchema.index({ userId: 1, tags: 1 });
chatSchema.index({ "messages.content": "text" }); // Full-text search

export default mongoose.model("Chat", chatSchema);