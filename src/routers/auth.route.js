import express from "express";
import { AuthController } from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/register", AuthController.register);
router.post("/verify-otp", AuthController.verifyOTP);
router.post("/update-role", AuthController.updateRole);
router.post("/login", AuthController.login);
// 👉 API gửi lại mã OTP
router.post("/resend-otp", AuthController.resendOTP);
export default router;
