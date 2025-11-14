import express from "express";
import { CategoryController } from "../controllers/category.controller.js";
import { verifyToken, authorizeRoles } from "../middlewares/auth.middleware.js";
import { TechnicianController } from "../controllers/technician.controller.js";

const router = express.Router();
router.post(
  "/get-all-woker",
  verifyToken,
  authorizeRoles("admin"),
  TechnicianController.getAllTechnicians
);
// User đăng ký lên làm thợ
router.post(
  "/apply",
  verifyToken,
  authorizeRoles("customer"),
  TechnicianController.applyToBecomeTechnician
);

// Admin duyệt thợ
router.put(
  "/approve/:userId",
  verifyToken,
  authorizeRoles("admin"),
  TechnicianController.approveTechnician
);

export default router;
