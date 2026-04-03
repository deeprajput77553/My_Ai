import mongoose from "mongoose";

const shareSchema = new mongoose.Schema(
  {
    conversationId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Chat", 
      required: true 
    },
    ownerId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    shareId: { 
      type: String, 
      required: true, 
      unique: true 
    },
    permission: { 
      type: String, 
      enum: ["view", "comment", "edit"], 
      required: true 
    },
    expiresAt: { 
      type: Date 
    },
    accessCount: { 
      type: Number, 
      default: 0 
    },
    lastAccessedAt: { 
      type: Date 
    },
  },
  { timestamps: true }
);

// Indexes for performance
shareSchema.index({ shareId: 1 }, { unique: true });
shareSchema.index({ conversationId: 1 });
shareSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for auto-deletion

export default mongoose.model("Share", shareSchema);
