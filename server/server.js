import dotenv from "dotenv";
import app from "./app.js";
import { connectDB } from "./config/db.js";

dotenv.config();

connectDB();

const PORT = process.env.PORT || 5000;
console.log("MONGO_URI:", process.env.MONGO_URI);
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});