import express from "express";
import { upload } from "../middlewares/upload.js";
import { ServiceController } from "../controllers/service.controller.js";
import { authorizeRoles, verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Lấy danh sách service theo danh mục
router.get("/category/:categoryId", ServiceController.getByCategory);

// Thêm service mới
router.post(
  "/",
  verifyToken,
  authorizeRoles("admin"),
  ServiceController.create
);

// Cập nhật service
router.post(
  "/:id",
  verifyToken,
  authorizeRoles("admin"),
  ServiceController.update
);

// Xóa service
router.delete(
  "/:id",
  verifyToken,
  authorizeRoles("admin"),
  ServiceController.delete
);

export default router;
