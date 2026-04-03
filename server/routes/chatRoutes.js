import express from "express";
import {
  sendMessage,
  getChats,
  getConversation,
  deleteChat,
} from "../controllers/chatController.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// All chat routes require authentication
router.use(authenticate);

router.post("/",        sendMessage);       // send message (with optional conversationId)
router.get("/",         getChats);          // get all conversations for sidebar
router.get("/:id",      getConversation);   // get full messages of one conversation
router.delete("/:id",   deleteChat);        // delete a conversation

export default router;