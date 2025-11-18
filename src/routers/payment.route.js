import express from "express";
import { verifyToken, authorizeRoles } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/upload.js";
import { PaymentController } from "../controllers/payment.controller.js";

const router = express.Router();
router.get(
  "/detail/:request_id",
  verifyToken,
  PaymentController.getPaymentDetail
);

// Upload hóa đơn thanh toán (customer)
router.post(
  "/upload-proof",
  verifyToken,
  authorizeRoles("customer"),
  upload.array("images", 5),
  PaymentController.uploadProof
);

// Admin duyệt hoặc từ chối hóa đơn
router.post(
  "/admin/verify-payment",
  verifyToken,
  authorizeRoles("admin"),
  PaymentController.verifyPayment
);

export default router;
