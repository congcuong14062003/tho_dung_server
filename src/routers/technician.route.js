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
// User nộp đơn
router.post(
  "/technician/request",
  verifyToken,
  authorizeRoles("customer"),
  TechnicianController.requestBecomeTechnician
);

// Admin
router.get(
  "/admin/technician/pending",
  verifyToken,
  authorizeRoles("admin"),
  TechnicianController.getPendingTechnicians
);
router.post(
  "/admin/technician/approve",
  verifyToken,
  authorizeRoles("admin"),
  TechnicianController.approveTechnician
);
router.post(
  "/admin/technician/reject",
  verifyToken,
  authorizeRoles("admin"),
  TechnicianController.rejectTechnician
);
export default router;
