import mongoose from "mongoose";

const folderSchema = new mongoose.Schema(
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
    parentId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Folder" 
    },
  },
  { timestamps: true }
);

// Index for faster folder queries by user
folderSchema.index({ userId: 1 });

export default mongoose.model("Folder", folderSchema);
