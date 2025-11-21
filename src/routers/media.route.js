import UploadController from "../controllers/upload.controller";
import { verifyToken } from "../middlewares/auth.middleware";
import express from "express";
import { upload } from "../middlewares/upload";
import { checkUserStatus } from "../middlewares/checkUserStatus";
const router = express.Router();
router.post(
  "/images",
  verifyToken,
  checkUserStatus,
  upload.array("images", 20), // nhận tối đa 20 ảnh
  UploadController.uploadImages
);
export default router;
