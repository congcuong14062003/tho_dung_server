import express from "express";
import admin from "../config/firebaseAdmin.js";

const router = express.Router();

router.post("/notify", async (req, res) => {
  try {
    const { token, title, body } = req.body;

    const message = {
      token,
      notification: {
        title: title || "Test Notification",
        body: body || "Thông báo từ server!",
      },
    };

    const result = await admin.messaging().send(message);

    res.json({ success: true, messageId: result });
  } catch (err) {
    console.error("FCM error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
