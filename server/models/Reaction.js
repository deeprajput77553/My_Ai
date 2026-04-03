import mongoose from "mongoose";

const reactionSchema = new mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    messageId: { 
      type: String, 
      required: true 
    },
    conversationId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Chat", 
      required: true 
    },
    type: { 
      type: String, 
      enum: ["like", "dislike"], 
      required: true 
    },
  },
  { timestamps: true }
);

// Indexes for performance
reactionSchema.index({ conversationId: 1, messageId: 1 });
reactionSchema.index({ userId: 1, messageId: 1 }, { unique: true });

export default mongoose.model("Reaction", reactionSchema);
