/**
 * Database Index Setup Script
 * 
 * This script ensures all database indexes are created properly.
 * Run this after deploying new models or when setting up a new database.
 * 
 * Usage: node scripts/setupIndexes.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import {
  User,
  Chat,
  Reaction,
  Folder,
  Tag,
  Share,
  ScheduledPrompt,
  Webhook,
  WebhookLog,
  PluginMetadata,
} from "../models/index.js";

dotenv.config();

const setupIndexes = async () => {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    console.log("\nCreating indexes...");

    // User indexes
    console.log("- User indexes");
    await User.createIndexes();

    // Chat indexes
    console.log("- Chat indexes");
    await Chat.createIndexes();

    // Reaction indexes
    console.log("- Reaction indexes");
    await Reaction.createIndexes();

    // Folder indexes
    console.log("- Folder indexes");
    await Folder.createIndexes();

    // Tag indexes
    console.log("- Tag indexes");
    await Tag.createIndexes();

    // Share indexes
    console.log("- Share indexes");
    await Share.createIndexes();

    // ScheduledPrompt indexes
    console.log("- ScheduledPrompt indexes");
    await ScheduledPrompt.createIndexes();

    // Webhook indexes
    console.log("- Webhook indexes");
    await Webhook.createIndexes();

    // WebhookLog indexes
    console.log("- WebhookLog indexes");
    await WebhookLog.createIndexes();

    // PluginMetadata indexes
    console.log("- PluginMetadata indexes");
    await PluginMetadata.createIndexes();

    console.log("\n✓ All indexes created successfully!");

    // List all indexes
    console.log("\nIndex Summary:");
    const collections = [
      { name: "User", model: User },
      { name: "Chat", model: Chat },
      { name: "Reaction", model: Reaction },
      { name: "Folder", model: Folder },
      { name: "Tag", model: Tag },
      { name: "Share", model: Share },
      { name: "ScheduledPrompt", model: ScheduledPrompt },
      { name: "Webhook", model: Webhook },
      { name: "WebhookLog", model: WebhookLog },
      { name: "PluginMetadata", model: PluginMetadata },
    ];

    for (const { name, model } of collections) {
      const indexes = await model.collection.getIndexes();
      console.log(`\n${name}:`);
      Object.keys(indexes).forEach((indexName) => {
        console.log(`  - ${indexName}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error("Error setting up indexes:", error);
    process.exit(1);
  }
};

setupIndexes();
