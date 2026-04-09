import express from "express";
import { authenticate } from "../middleware/auth.js";
import {
  getUserData,
  addProfileEntry,
  updateProfileEntry,
  deleteProfileEntry,
  addReminder,
  updateReminder,
  deleteReminder,
  getDashboardData
} from "../controllers/userDataController.js";

const router = express.Router();

// All routes require auth
router.use(authenticate);

// Dashboard
router.get("/dashboard", getDashboardData);

// Profile data
router.get("/", getUserData);
router.post("/profile", addProfileEntry);
router.put("/profile/:id", updateProfileEntry);
router.delete("/profile/:id", deleteProfileEntry);

// Reminders
router.post("/reminders", addReminder);
router.put("/reminders/:id", updateReminder);
router.delete("/reminders/:id", deleteReminder);

export default router;
