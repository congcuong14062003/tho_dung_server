import admin from "../config/firebaseAdmin.js";
import { getIO } from "../config/socket.js";
import { DeviceModel } from "../models/device.model.js";
import { NotificationModel } from "../models/notification.model.js";
import { UserModel } from "../models/user.model.js";

export const sendNotification = async ({ title, body, data = {}, userId }) => {
  try {
    const devices = await DeviceModel.findByUserId(userId);

    if (!devices?.length) {
      console.log(`⚠ Không có FCM token cho user ${userId}`);
      return;
    }

    const tokens = devices.map((d) => d.fcm_token).filter(Boolean);

    const results = await Promise.all(
      tokens.map((token) =>
        admin.messaging().send({
          token,
          notification: { title, body },
          data: {
            ...data,
            click_action: "FLUTTER_NOTIFICATION_CLICK",
          },
        })
      )
    );

    console.log("📨 FCM response:", results);
  } catch (err) {
    console.error("🔥 Lỗi gửi thông báo:", err);
  }
};

export const sendNotificationToAdmins = async ({ title, body, data = {} }) => {
  try {
    // Lấy danh sách admin
    const admins = await UserModel.findAdmins();

    if (!admins?.length) {
      console.log("⚠ Không có admin nào");
      return;
    }

    const adminIds = admins.map((a) => a.id);

    // ===============================
    // 1️⃣ Lưu DB cho tất cả admin
    // ===============================
    await NotificationModel.createForUsers(adminIds, {
      title,
      body,
      type: "new_request",
      action_data: data,
    });

    // ===============================
    // 2️⃣ Bắn socket realtime
    // ===============================
    const io = getIO();
    io.to("admin_room").emit("new_notification", {
      title,
      body,
      data,
    });

    console.log("📢 Socket: đã gửi notification realtime tới admin");

    // ===============================
    // 3️⃣ Gửi FCM push notification
    // ===============================
    let tokens = [];

    for (const adminUser of admins) {
      const devices = await DeviceModel.findByUserId(adminUser.id);
      if (devices?.length) {
        tokens.push(...devices.map((d) => d.fcm_token));
      }
    }

    tokens = tokens.filter(Boolean);

    if (!tokens.length) {
      console.log("⚠ Không có token admin");
      return;
    }

    const results = await Promise.all(
      tokens.map((token) =>
        admin.messaging().send({
          token,
          notification: { title, body },
          data: {
            ...data,
            click_action: "FLUTTER_NOTIFICATION_CLICK",
          },
        })
      )
    );

    console.log("📨 Gửi FCM admin:", results);
  } catch (err) {
    console.error("🔥 Lỗi gửi thông báo admin:", err);
  }
};