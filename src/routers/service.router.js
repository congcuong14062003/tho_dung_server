import express from "express";
import { upload } from "../middlewares/upload.js";
import { ServiceController } from "../controllers/service.controller.js";
import { authorizeRoles, verifyToken } from "../middlewares/auth.middleware.js";
import { checkUserStatus } from "../middlewares/checkUserStatus.js";

const router = express.Router();

// ===============================
// 🔹 Lấy danh sách service theo danh mục (Customer)
// ===============================
router.get(
  "/category/:categoryId",
  verifyToken,
  checkUserStatus,
  ServiceController.getActiveByCategory
);

// ===============================
// 🔹 Lấy danh sách service (Admin - phân trang, lọc theo category & keySearch)
// ===============================
router.post(
  "/admin/list-services",
  verifyToken,
  checkUserStatus,
  authorizeRoles("admin"),
  ServiceController.getList
);

// ===============================
// 🔹 CRUD admin
// ===============================

// Tạo dịch vụ mới
router.post(
  "/admin/create-service",
  verifyToken,
  checkUserStatus,
  authorizeRoles("admin"),
  ServiceController.create
);

// Cập nhật dịch vụ
router.post(
  "/admin/update-service",
  verifyToken,
  checkUserStatus,
  authorizeRoles("admin"),
  ServiceController.update
);

export default router;
