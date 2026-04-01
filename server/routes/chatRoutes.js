import express from "express";
import { sendMessage, getChats, deleteChat } from "../controllers/chatController.js";

const router = express.Router();

router.post("/", sendMessage);
router.get("/", getChats);
router.delete("/:id", deleteChat);

export default router;