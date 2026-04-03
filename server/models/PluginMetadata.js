import mongoose from "mongoose";

const pluginMetadataSchema = new mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    name: { 
      type: String, 
      required: true 
    },
    version: { 
      type: String, 
      required: true 
    },
    description: { 
      type: String 
    },
    author: { 
      type: String 
    },
    enabled: { 
      type: Boolean, 
      default: true 
    },
    config: { 
      type: mongoose.Schema.Types.Mixed, 
      default: {} 
    },
    installedAt: { 
      type: Date, 
      default: Date.now 
    },
  },
  { timestamps: true }
);

// Index for faster plugin queries by user
pluginMetadataSchema.index({ userId: 1 });

export default mongoose.model("PluginMetadata", pluginMetadataSchema);
