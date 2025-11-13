import express from "express";
import { RequestController } from "../controllers/request.controller.js";
import { convertHeicToJpg, upload } from "../middlewares/upload.js";
import { authorizeRoles, verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

// POST /api/requests
router.post(
  "/",
  verifyToken,
  authorizeRoles("customer"),
  upload.array("images", 5), // ✅ đổi từ icon sang images (tối đa 5 ảnh)
  // convertHeicToJpg, // ✅ thêm bước chuyển HEIC sang JPG
  RequestController.create
);
// Lấy tất cả yêu cầu (dành cho admin)
router.post(
  "/get-all-request",
  verifyToken,
  authorizeRoles("admin"),
  RequestController.getAll
);
// Lấy danh sách yêu cầu của khách hàng
router.post(
  "/get-requests-by-user",
  verifyToken,
  RequestController.getRequestsByUser
);

// Lấy danh sách yêu cầu được gán cho thợ
router.post(
  "/get-requests-by-technician",
  verifyToken,
  authorizeRoles("technician"),
  RequestController.getRequestsByTechnician
);

// chi tiết yêu cầu
router.get(
  "/:id/detail-request",
  verifyToken,
  RequestController.getRequestDetail
);

// Admin gán yêu cầu cho thợ
router.post(
  "/assign",
  verifyToken,
  authorizeRoles("admin"),
  RequestController.assignRequest
);

// Thợ chấp nhận hoặc từ chối yêu cầu
router.post(
  "/technician-response",
  verifyToken,
  authorizeRoles("technician"),
  RequestController.technicianResponse
);

// Khảo sát
router.post(
  "/survey/upload",
  verifyToken,
  authorizeRoles("technician"),
  upload.array("images", 5),
  RequestController.uploadSurveyImages
);

// Thợ gửi báo giá
router.post(
  "/quotation/send",
  verifyToken,
  authorizeRoles("technician"),
  RequestController.createQuotation
);

export default router;
