import UploadController from "../controllers/upload.controller";
import { verifyToken } from "../middlewares/auth.middleware";
import express from "express";
import { upload } from "../middlewares/upload";
const router = express.Router();
router.post(
  "/images",
  verifyToken,
  upload.array("images", 20), // nhận tối đa 20 ảnh
  UploadController.uploadImages
);
export default router;