import { log } from "console";
import admin from "../config/firebaseAdmin.js";
import { getIO } from "../config/socket.js";
import { DeviceModel } from "../models/device.model.js";
import { NotificationModel } from "../models/notification.model.js";
import { UserModel } from "../models/user.model.js";

export const sendNotification = async ({ title, body, data = {}, userId }) => {
  try {
    if (!userId) {
      console.log("⚠ Thiếu userId để gửi thông báo");
      return;
    }

    // 1️⃣ Lưu DB và lấy lại FULL object
    const notification = await NotificationModel.create({
      user_id: userId,
      title,
      body,
      type: data?.type || "system",
      action_data: data,
    });

    console.log("data: ", {
      ...notification,
      message: notification.body,
      time: notification.created_at,
    });

    // 2) Gửi realtime đến tất cả socket của user
    const io = getIO();
    io.to(userId).emit("new_notification", {
      ...notification,
      message: notification.body,
      time: notification.created_at,
    });

    console.log(`📢 Socket: đã gửi notification realtime tới user ${userId}`);

    // ===============================
    // 3️⃣ Gửi FCM push
    // ===============================
    const devices = await DeviceModel.findByUserId(userId);

    if (!devices?.length) {
      console.log(`⚠ User ${userId} không có thiết bị / token FCM`);
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

    console.log(`📨 Đã gửi FCM đến user ${userId}:`, results);
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

    // 1️⃣ Lưu DB và lấy lại danh sách FULL notification
    const notifications = await NotificationModel.createForUsers(adminIds, {
      title,
      body,
      type: data?.type || "system",
      action_data: data,
    });

    // 2️⃣ Emit realtime đúng format
    const io = getIO();
    io.to("admin_room").emit("new_notification", notifications);

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
