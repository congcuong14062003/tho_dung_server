import express from "express";
import { CategoryController } from "../controllers/category.controller.js";
import { verifyToken, authorizeRoles } from "../middlewares/auth.middleware.js";
import { TechnicianController } from "../controllers/technician.controller.js";
import { checkUserStatus } from "../middlewares/checkUserStatus.js";

const router = express.Router();
// User xem danh sách yêu cầu làm thợ của chính mình
router.get(
  "/my-requests",
  verifyToken,
  checkUserStatus,
  authorizeRoles("customer", "technician"),
  TechnicianController.getMyRequests
);

router.post(
  "/admin/get-all-technicians",
  verifyToken,
  checkUserStatus,
  authorizeRoles("admin"),
  TechnicianController.getAllTechnicians
);
router.post(
  "/admin/get-pending-technicians",
  verifyToken,
  checkUserStatus,
  authorizeRoles("admin"),
  TechnicianController.getPendingTechnicians
);
// User nộp đơn
router.post(
  "/request-technician",
  verifyToken,
  checkUserStatus,
  authorizeRoles("customer"),
  TechnicianController.applyToBecomeTechnician
);

router.post(
  "/admin/approve",
  verifyToken,
  checkUserStatus,
  authorizeRoles("admin"),
  TechnicianController.approveTechnician
);
router.post(
  "/admin/reject",
  verifyToken,
  checkUserStatus,
  authorizeRoles("admin"),
  TechnicianController.rejectTechnician
);

// KHÓA tài khoản thợ (active → inactive/banned)
router.post(
  "/admin/block",
  verifyToken,
  checkUserStatus,
  authorizeRoles("admin"),
  TechnicianController.blockTechnician
);

// MỞ KHÓA tài khoản thợ (inactive → active)
router.post(
  "/admin/unblock",
  verifyToken,
  checkUserStatus,
  authorizeRoles("admin"),
  TechnicianController.unblockTechnician
);
export default router;
