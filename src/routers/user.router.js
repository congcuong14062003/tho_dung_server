import express from "express";
import { verifyToken, authorizeRoles } from "../middlewares/auth.middleware.js";
import { UserController } from "../controllers/user.controller.js";
import { upload } from "../middlewares/upload.js";

const router = express.Router();

// 🔒 Lấy thông tin người dùng hiện tại (đã đăng nhập)
router.get("/user-profile", verifyToken, UserController.getProfile);
router.post(
  "/update-avatar",
  verifyToken,
  upload.single("avatar"),
  UserController.updateAvatar
);

export default router;
