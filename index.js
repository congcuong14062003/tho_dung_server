import express from "express";
import dotenv from "dotenv";
import db from "./src/config/db";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.send("Server is running...");
});

const testDBConnection = async () => {
  try {
    const [rows] = await db.query("SELECT 1 + 1 AS result");
    console.log("✅ Database connected successfully!");
    console.log("Test query result:", rows[0].result);
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
  }
};

app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  await testDBConnection();
});
