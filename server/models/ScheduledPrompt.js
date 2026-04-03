import mongoose from "mongoose";

const scheduleExecutionSchema = new mongoose.Schema({
  executedAt: { type: Date, required: true },
  success: { type: Boolean, required: true },
  error: { type: String },
  messageId: { type: String },
}, { _id: true });

const scheduledPromptSchema = new mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    prompt: { 
      type: String, 
      required: true 
    },
    schedule: { 
      type: String, 
      required: true // cron format
    },
    conversationId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Chat" 
    },
    enabled: { 
      type: Boolean, 
      default: true 
    },
    lastExecutedAt: { 
      type: Date 
    },
    nextExecutionAt: { 
      type: Date, 
      required: true 
    },
  },
  { timestamps: true }
);

// Indexes for performance
scheduledPromptSchema.index({ userId: 1, enabled: 1 });
scheduledPromptSchema.index({ nextExecutionAt: 1, enabled: 1 });

export default mongoose.model("ScheduledPrompt", scheduledPromptSchema);
