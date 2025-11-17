import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import db from "./src/config/db.js";
import RouterMain from "./src/routers/router.js";
import logger from "morgan";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Danh sách các client được phép truy cập (web + app)
const allowedOrigins = [
  "http://localhost:5173", // web (Vite React)
  "http://localhost:19006", // Expo app (dev)
  "exp://127.0.0.1:19000", // React Native Expo
  "http://192.168.1.5:5173", // nếu test trên LAN
  "http://192.168.1.5:8081", // app React Native debug trên LAN
  "http://192.168.100.96:8081", // thêm vào
];

// ✅ Cấu hình CORS động
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // Cho phép Postman, server-side
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn("❌ CORS bị chặn từ:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true, // cho phép gửi cookie / header Authorization
  })
);

app.use(logger("dev"));
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// ✅ Kiểm tra DB (tùy chọn)
const testDBConnection = async () => {
  try {
    console.log("✅ Database connected successfully!");
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
  }
};

// ✅ Gắn route chính
app.use("/apis", RouterMain(express.Router()));

app.listen(PORT, "0.0.0.0", async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  await testDBConnection();
});
