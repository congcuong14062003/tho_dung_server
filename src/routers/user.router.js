import express from "express";
import { verifyToken, authorizeRoles } from "../middlewares/auth.middleware.js";
import { UserController } from "../controllers/user.controller.js";
import { upload } from "../middlewares/upload.js";
import { checkUserStatus } from "../middlewares/checkUserStatus.js";

const router = express.Router();

// 🔒 Lấy thông tin người dùng hiện tại (đã đăng nhập)
router.get(
  "/user-profile",
  verifyToken,
  checkUserStatus,
  UserController.getProfile
);
router.post(
  "/update-avatar",
  verifyToken,
  checkUserStatus,
  upload.single("avatar"),
  UserController.updateAvatar
);

// 🔹 Lấy danh sách user (lọc theo keySearch + status)
router.post(
  "/get-all-customers",
  verifyToken,
  checkUserStatus,
  authorizeRoles("admin"),
  UserController.getAllCustomer
);

// 🔥 Cập nhật trạng thái user (customer + technician)
router.post(
  "/update-status",
  verifyToken,
  checkUserStatus,
  authorizeRoles("admin"),
  UserController.updateStatus
);

export default router;
