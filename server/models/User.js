import mongoose from "mongoose";

const userPreferencesSchema = new mongoose.Schema({
  locationEnabled: { type: Boolean, default: false },
  manualLocation: { type: String },
  timezone: { type: String, default: "UTC" },
  theme: { type: String, enum: ["light", "dark"], default: "light" },
  voiceEnabled: { type: Boolean, default: false },
  ttsEnabled: { type: Boolean, default: false },
}, { _id: false });

const userSchema = new mongoose.Schema(
  {
    email: { 
      type: String, 
      required: true, 
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: { 
      type: String, 
      required: true 
    },
    name: { 
      type: String, 
      required: true,
      trim: true
    },
    preferences: { 
      type: userPreferencesSchema, 
      default: () => ({}) 
    },
  },
  { timestamps: true }
);

// Index for faster email lookups during login
userSchema.index({ email: 1 });

export default mongoose.model("User", userSchema);
