import express from "express";
import { AuthController } from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/register", AuthController.register);
router.post("/verify-otp", AuthController.verifyOTP);
router.post("/update-role", AuthController.updateRole);
router.post("/login", AuthController.login);

export default router;
