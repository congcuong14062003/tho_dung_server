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

router.post("/notify-app", async (req, res) => {
  try {
    const { token, title, body, data = {} } = req.body;

    const message = {
      token,
      notification: {
        title: title || "Thông báo",
        body: body || "Bạn có thông báo mới!",
      },
      data: {
        ...Object.keys(data).reduce((acc, key) => {
          acc[key] = String(data[key]); // BẮT BUỘC phải là string cho React Native!
          return acc;
        }, {}),

        // Tránh crash iOS
        click_action: "FLUTTER_NOTIFICATION_CLICK",
      },

      // Giúp iOS hiện thông báo foreground
      apns: {
        payload: {
          aps: {
            sound: "default",
            alert: {
              title: title,
              body: body,
            },
          },
        },
      },

      // Android ưu tiên hiển thị notification
      android: {
        priority: "high",
        notification: {
          channelId: "default",
          sound: "default",
        },
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
