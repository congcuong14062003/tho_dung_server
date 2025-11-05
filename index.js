import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import db from "./src/config/db.js";
import RouterMain from "./src/routers/router.js";
import logger from "morgan";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware cơ bản

app.use(logger("dev"));
app.use(cors());
app.use(express.json());

// Kết nối DB test
const testDBConnection = async () => {
  try {
    const [rows] = await db.query("SELECT 1 + 1 AS result");
    console.log("✅ Database connected successfully!");
    console.log("Test query result:", rows[0].result);
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
  }
};

// Gắn route chính
app.use("/apis", RouterMain(express.Router()));

app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  await testDBConnection();
});
