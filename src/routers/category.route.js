import express from "express";
import { CategoryController } from "../controllers/category.controller.js";
import { verifyToken, authorizeRoles } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/upload.js";

const router = express.Router();

// Public: lấy danh sách danh mục
router.post("/list-category", CategoryController.getListPaginated);

// Chỉ admin được phép CRUD
router.post(
  "/create-category",
  verifyToken,
  authorizeRoles("admin"),
  upload.single("icon"),
  CategoryController.create
);
router.post(
  "/update-category/:id",
  verifyToken,
  authorizeRoles("admin"),
  upload.single("icon"),
  CategoryController.update
);
router.post(
  "/delete-category/:id",
  verifyToken,
  authorizeRoles("admin"),
  CategoryController.delete
);


export default router;
