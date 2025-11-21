import express from "express";
import { verifyToken, authorizeRoles } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/upload.js";
import { PaymentController } from "../controllers/payment.controller.js";
import { checkUserStatus } from "../middlewares/checkUserStatus.js";

const router = express.Router();
router.get(
  "/detail/:request_id",
  verifyToken,
  checkUserStatus,
  PaymentController.getPaymentDetail
);

// Upload hóa đơn thanh toán (customer)
router.post(
  "/upload-proof",
  verifyToken,
  checkUserStatus,
  authorizeRoles("customer", "technician"),
  upload.array("images", 5),
  PaymentController.uploadProof
);

// Admin duyệt hoặc từ chối hóa đơn
router.post(
  "/admin/verify-payment",
  verifyToken,
  checkUserStatus,
  authorizeRoles("admin"),
  PaymentController.verifyPayment
);

export default router;
