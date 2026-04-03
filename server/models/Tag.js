import mongoose from "mongoose";

const tagSchema = new mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    name: { 
      type: String, 
      required: true,
      trim: true
    },
    color: { 
      type: String, 
      default: "#3B82F6" // Default blue color
    },
  },
  { timestamps: true }
);

// Index for faster tag queries by user
tagSchema.index({ userId: 1 });

export default mongoose.model("Tag", tagSchema);
