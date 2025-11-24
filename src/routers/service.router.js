import express from "express";
import { upload } from "../middlewares/upload.js";
import { ServiceController } from "../controllers/service.controller.js";
import { authorizeRoles, verifyToken } from "../middlewares/auth.middleware.js";
import { checkUserStatus } from "../middlewares/checkUserStatus.js";

const router = express.Router();

// ===============================
// 🔹 Lấy danh sách service theo danh mục (Admin & Customer)
// ===============================
router.get(
  "/category/:categoryId",
  verifyToken,
  checkUserStatus,
  ServiceController.getByCategory
);

// ===============================
// 🔹 Lấy danh sách service (Admin - phân trang, lọc theo category & keySearch)
// ===============================
router.post(
  "/list-services",
  verifyToken,
  checkUserStatus,
  ServiceController.getList
);

// ===============================
// 🔹 CRUD admin
// ===============================

// Tạo dịch vụ mới
router.post(
  "/",
  verifyToken,
  checkUserStatus,
  authorizeRoles("admin"),
  ServiceController.create
);

// Cập nhật dịch vụ
router.post(
  "/:id",
  verifyToken,
  checkUserStatus,
  authorizeRoles("admin"),
  ServiceController.update
);

// Xóa dịch vụ (status = 0)
router.delete(
  "/:id",
  verifyToken,
  checkUserStatus,
  authorizeRoles("admin"),
  ServiceController.delete
);

export default router;
