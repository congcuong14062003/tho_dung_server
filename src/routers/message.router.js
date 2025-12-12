import express from "express";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { MessageController } from "../controllers/message.controller.js";

const router = express.Router();


router.post("/send", verifyToken, MessageController.sendMessage);
router.get("/:room_id", verifyToken, MessageController.getMessages);

export default router;
