import express from "express";
import { CategoryController } from "../controllers/category.controller.js";
import { verifyToken, authorizeRoles } from "../middlewares/auth.middleware.js";
import { TechnicianController } from "../controllers/technician.controller.js";

const router = express.Router();
router.post(
  "/get-all-technicians",
  verifyToken,
  authorizeRoles("admin"),
  TechnicianController.getAllTechnicians
);
// User nộp đơn
router.post(
  "/request",
  verifyToken,
  authorizeRoles("customer"),
  TechnicianController.requestBecomeTechnician
);

// // Admin
// router.post(
//   "/admin/pending",
//   verifyToken,
//   authorizeRoles("admin"),
//   TechnicianController.getAllTechnicians
// );
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
export default router;
