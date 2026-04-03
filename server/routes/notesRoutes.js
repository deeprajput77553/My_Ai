import express from "express";
import {
  generateNotes,
  parseQuestions,
  answerQuestion,
} from "../controllers/notesController.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// All notes routes require authentication
router.use(authenticate);

router.post("/generate",         generateNotes);   // POST /api/notes/generate
router.post("/parse-questions",  parseQuestions);  // POST /api/notes/parse-questions
router.post("/answer",           answerQuestion);  // POST /api/notes/answer

export default router;