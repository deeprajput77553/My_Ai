import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import notesRoutes from "./routes/notesRoutes.js";
import userDataRoutes from "./routes/userDataRoutes.js";
const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth",      authRoutes);
app.use("/api/chat",      chatRoutes);
app.use("/api/notes",     notesRoutes);
app.use("/api/userdata",  userDataRoutes);

export default app;