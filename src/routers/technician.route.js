import express from "express";
import { CategoryController } from "../controllers/category.controller.js";
import { verifyToken, authorizeRoles } from "../middlewares/auth.middleware.js";
import { TechnicianController } from "../controllers/technician.controller.js";

const router = express.Router();
router.post(
  "/admin/get-all-technicians",
  verifyToken,
  authorizeRoles("admin"),
  TechnicianController.getAllTechnicians
);
router.post(
  "/admin/get-pending-technicians",
  verifyToken,
  authorizeRoles("admin"),
  TechnicianController.getPendingTechnicians
);
// User nộp đơn
router.post(
  "/request",
  verifyToken,
  authorizeRoles("customer"),
  TechnicianController.applyToBecomeTechnician
);

router.post(
  "/admin/approve",
  verifyToken,
  authorizeRoles("admin"),
  TechnicianController.approveTechnician
);
router.post(
  "/admin/reject",
  verifyToken,
  authorizeRoles("admin"),
  TechnicianController.rejectTechnician
);

// KHÓA tài khoản thợ (active → inactive/banned)
router.post(
  "/admin/block",
  verifyToken,
  authorizeRoles("admin"),
  TechnicianController.blockTechnician
);

// MỞ KHÓA tài khoản thợ (inactive → active)
router.post(
  "/admin/unblock",
  verifyToken,
  authorizeRoles("admin"),
  TechnicianController.unblockTechnician
);
export default router;
