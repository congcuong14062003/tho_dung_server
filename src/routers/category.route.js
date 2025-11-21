import express from "express";
import { CategoryController } from "../controllers/category.controller.js";
import { verifyToken, authorizeRoles } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/upload.js";
import { checkUserStatus } from "../middlewares/checkUserStatus.js";

const router = express.Router();

// Public: lấy danh sách danh mục
router.post(
  "/list-category",
  verifyToken,
  checkUserStatus,
  CategoryController.getListPaginated
);

// Chỉ admin được phép CRUD
router.post(
  "/create-category",
  verifyToken,
  checkUserStatus,
  authorizeRoles("admin"),
  upload.single("icon"),
  CategoryController.create
);
router.post(
  "/update-category/:id",
  verifyToken,
  checkUserStatus,
  authorizeRoles("admin"),
  upload.single("icon"),
  CategoryController.update
);
router.post(
  "/delete-category/:id",
  verifyToken,
  checkUserStatus,
  authorizeRoles("admin"),
  CategoryController.delete
);

export default router;
