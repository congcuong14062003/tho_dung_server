import express from "express";
import { verifyToken, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Chỉ cho phép admin truy cập
router.get("/admin-only", verifyToken, authorizeRoles("admin"), (req, res) => {
  res.json({ message: "Admin truy cập thành công" });
});

// Cho phép worker và admin
router.get("/worker-or-admin", verifyToken, authorizeRoles("worker", "admin"), (req, res) => {
  res.json({ message: "Worker hoặc Admin truy cập được" });
});

// Cho phép customer
router.get("/customer-info", verifyToken, authorizeRoles("customer"), (req, res) => {
  res.json({ message: "Customer truy cập thành công" });
});

export default router;
