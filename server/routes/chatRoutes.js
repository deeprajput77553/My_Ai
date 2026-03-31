import express from "express";
import { sendMessage, getChats } from "../controllers/chatController.js";

const router = express.Router();

router.post("/", sendMessage);
router.get("/", getChats);

export default router;