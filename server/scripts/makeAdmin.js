/**
 * Make a user an admin by email
 * Usage: node scripts/makeAdmin.js <email>
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const email = process.argv[2];
if (!email) {
  console.log("Usage: node scripts/makeAdmin.js <email>");
  process.exit(1);
}

try {
  await mongoose.connect(process.env.MONGO_URI);
  const result = await mongoose.connection.db.collection("users").updateOne(
    { email: email.toLowerCase() },
    { $set: { role: "admin", status: "active" } }
  );
  if (result.matchedCount === 0) {
    console.log(`❌ No user found with email: ${email}`);
  } else {
    console.log(`✅ User ${email} is now an admin!`);
  }
} catch (e) {
  console.error("Error:", e.message);
}
await mongoose.disconnect();
