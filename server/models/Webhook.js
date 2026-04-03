import mongoose from "mongoose";

const webhookTriggerSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ["keyword", "tag", "conversation"], 
    required: true 
  },
  value: { 
    type: String, 
    required: true 
  },
}, { _id: false });

const webhookLogSchema = new mongoose.Schema({
  webhookId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Webhook", 
    required: true 
  },
  executedAt: { 
    type: Date, 
    required: true 
  },
  success: { 
    type: Boolean, 
    required: true 
  },
  statusCode: { 
    type: Number 
  },
  responseTime: { 
    type: Number, 
    required: true 
  },
  error: { 
    type: String 
  },
  payload: { 
    type: mongoose.Schema.Types.Mixed 
  },
}, { timestamps: true });

const webhookSchema = new mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    url: { 
      type: String, 
      required: true 
    },
    triggers: [webhookTriggerSchema],
    headers: { 
      type: Map, 
      of: String, 
      default: {} 
    },
    enabled: { 
      type: Boolean, 
      default: true 
    },
  },
  { timestamps: true }
);

// Indexes for performance
webhookSchema.index({ userId: 1, enabled: 1 });
webhookLogSchema.index({ webhookId: 1, executedAt: -1 });
webhookLogSchema.index({ executedAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days TTL

export const Webhook = mongoose.model("Webhook", webhookSchema);
export const WebhookLog = mongoose.model("WebhookLog", webhookLogSchema);
