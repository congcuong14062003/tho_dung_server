import express from "express";
import { CategoryController } from "../controllers/category.controller.js";
import { verifyToken, authorizeRoles } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/upload.js";

const router = express.Router();

// Public: lấy danh sách danh mục
router.get("/", CategoryController.getAll);

// Chỉ admin được phép CRUD
router.post(
  "/",
  verifyToken,
  authorizeRoles("admin"),
  upload.single("icon"),
  CategoryController.create
);
router.post(
  "/:id",
  verifyToken,
  authorizeRoles("admin"),
  upload.single("icon"),
  CategoryController.update
);
router.delete(
  "/:id",
  verifyToken,
  authorizeRoles("admin"),
  CategoryController.delete
);


export default router;
