import express from "express";
import { CategoryController } from "../controllers/category.controller.js";
import { verifyToken, authorizeRoles } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/upload.js";
import { checkUserStatus } from "../middlewares/checkUserStatus.js";

const router = express.Router();

// ===============================
// 🔹 Lấy danh sách danh mục (Admin - phân trang)
// ===============================
router.post(
  "/admin/list-category",
  verifyToken,
  checkUserStatus,
  authorizeRoles("admin"),
  CategoryController.getListPaginated
);

// ===============================
// 🔹 Lấy danh mục active cho khách hàng
// ===============================
router.post(
  "/list-category",
  verifyToken,
  CategoryController.getListForCustomer
);

// ===============================
// 🔹 CRUD admin
// ===============================

// Tạo danh mục mới
router.post(
  "/admin/create-category",
  verifyToken,
  checkUserStatus,
  authorizeRoles("admin"),
  upload.single("icon"),
  CategoryController.create
);

// Cập nhật danh mục (có thể thay đổi trạng thái)
router.post(
  "/admin/update-category/:id",
  verifyToken,
  checkUserStatus,
  authorizeRoles("admin"),
  upload.single("icon"),
  CategoryController.update
);

export default router;
