import express from "express";
import { RequestController } from "../controllers/request.controller.js";
import { convertHeicToJpg, upload } from "../middlewares/upload.js";
import { authorizeRoles, verifyToken } from "../middlewares/auth.middleware.js";
import { PaymentController } from "../controllers/payment.controller.js";
import { canViewRequestDetail } from "../middlewares/request.middleware.js";
import { checkUserStatus } from "../middlewares/checkUserStatus.js";

const router = express.Router();

// POST /api/requests
router.post(
  "/",
  verifyToken,
  checkUserStatus,
  authorizeRoles("customer", "technician"),
  upload.array("images", 5), // ✅ đổi từ icon sang images (tối đa 5 ảnh)
  // convertHeicToJpg, // ✅ thêm bước chuyển HEIC sang JPG
  RequestController.create
);

// Khách hàng hủy yêu cầu
router.post(
  "/cancel",
  verifyToken,
  checkUserStatus,
  authorizeRoles("customer", "technician"),
  RequestController.cancelRequest
);

// Lấy tất cả yêu cầu (dành cho admin)
router.post(
  "/get-all-request",
  verifyToken,
  checkUserStatus,
  authorizeRoles("admin"),
  RequestController.getAll
);
// Lấy danh sách yêu cầu của khách hàng
router.post(
  "/get-requests-by-user",
  verifyToken,
  checkUserStatus,
  RequestController.getRequestsByUser
);

// Lấy danh sách yêu cầu được gán cho thợ
router.post(
  "/get-requests-by-technician",
  verifyToken,
  checkUserStatus,
  authorizeRoles("technician"),
  RequestController.getRequestsByTechnician
);

// chi tiết yêu cầu
router.get(
  "/:id/detail-request",
  verifyToken,
  checkUserStatus,
  canViewRequestDetail,
  RequestController.getRequestDetail
);

// Admin gán yêu cầu cho thợ
router.post(
  "/assign",
  verifyToken,
  checkUserStatus,
  authorizeRoles("admin"),
  RequestController.assignRequest
);

// Thợ chấp nhận hoặc từ chối yêu cầu
router.post(
  "/technician-response",
  verifyToken,
  checkUserStatus,
  authorizeRoles("technician"),
  RequestController.technicianResponse
);

// Khảo sát
router.post(
  "/survey/upload",
  verifyToken,
  checkUserStatus,
  authorizeRoles("technician"),
  upload.array("images", 5),
  RequestController.uploadSurveyImages
);

// Thợ gửi báo giá
router.post(
  "/quotation/send",
  verifyToken,
  checkUserStatus,
  authorizeRoles("technician"),
  RequestController.createQuotation
);

// Khách hàng chấp nhận hoặc từ chối báo giá
router.post(
  "/quotation/response",
  verifyToken,
  checkUserStatus,
  authorizeRoles("customer", "technician"),
  RequestController.quotationResponse
);

// Thợ và khách cập nhật tiến độ công việc
router.post(
  "/quotation/update-progress",
  verifyToken,
  checkUserStatus,
  authorizeRoles("customer", "technician"),
  RequestController.updateItemProgress
);

// Khách hoàn tất yêu cầu (set completed)
router.post(
  "/set-completed",
  verifyToken,
  checkUserStatus,
  authorizeRoles("customer"),
  RequestController.setCompleted
);

export default router;
