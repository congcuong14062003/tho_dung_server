import express from "express";
import { upload } from "../middlewares/upload.js";
import { ServiceController } from "../controllers/service.controller.js";
import { authorizeRoles, verifyToken } from "../middlewares/auth.middleware.js";
import { checkUserStatus } from "../middlewares/checkUserStatus.js";

const router = express.Router();

// Lấy danh sách service theo danh mục
router.get(
  "/category/:categoryId",
  verifyToken,
  checkUserStatus,
  ServiceController.getByCategory
);

// Thêm service mới
router.post(
  "/",
  verifyToken,
  checkUserStatus,
  authorizeRoles("admin"),
  ServiceController.create
);

// Cập nhật service
router.post(
  "/:id",
  verifyToken,
  checkUserStatus,
  authorizeRoles("admin"),
  ServiceController.update
);

// Xóa service
router.delete(
  "/:id",
  verifyToken,
  checkUserStatus,
  authorizeRoles("admin"),
  ServiceController.delete
);

export default router;
