import express from "express";
import multer from "multer";
import { transcribeAudio } from "../controllers/audioController.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" }); // Temp storage

router.post("/transcribe", authenticate, upload.single("audio"), transcribeAudio);

export default router;
