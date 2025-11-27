import express from "express";
import { NotificationController } from "../controllers/notification.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/list-notifications", verifyToken, NotificationController.list);
router.put("/mark-read/:id", verifyToken, NotificationController.markRead);

export default router;
