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
  convertHeicToJpg, // ✅ thêm bước chuyển HEIC sang JPG 
  RequestController.create
);
router.post(
  "/get-all-request",
  verifyToken,
  authorizeRoles("admin"),
  RequestController.getAll
);
router.post(
  "/get-requests-by-user",
  verifyToken,
  RequestController.getRequestsByUser
)

router.get("/:id/detail-request", verifyToken, RequestController.getRequestDetail);
export default router;
