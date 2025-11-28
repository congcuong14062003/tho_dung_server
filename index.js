import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import RouterMain from "./src/routers/router.js";
import logger from "morgan";
import http from "http";
import { initSocket } from "./src/config/socket.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:19006",
  "exp://127.0.0.1:19000",
  "http://192.168.1.5:5173",
  "http://192.168.1.5:8081",
  "http://192.168.100.96:8081",
];

// =====================================================
// 🚀 Bypass CORS cho socket.io để không bị Express chặn
// =====================================================
app.use((req, res, next) => {
  if (req.path.startsWith("/socket.io")) {
    return next();
  }
  next();
});

// =====================================================
// 🔥 CORS cho các route API
// =====================================================
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn("❌ Blocked by CORS:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(logger("dev"));
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// Router
app.use("/apis", RouterMain(express.Router()));

// =====================================================
// 🔥 HTTP server bọc express
// =====================================================
const server = http.createServer(app);

// =====================================================
// 🔥 Khởi tạo socket.io
// =====================================================
initSocket(server);

// =====================================================
// 🚀 Start server
// =====================================================
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server đang chạy tại port ${PORT}`);
});
