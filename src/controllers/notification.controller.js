import { NotificationModel } from "../models/notification.model.js";

export const NotificationController = {
  // Lấy danh sách thông báo của user
  async list(req, res) {
    try {
      const userId = req.user.id;

      const notifications = await NotificationModel.getByUser(userId);

      return res.json({
        status: true,
        code: 200,
        data: notifications,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        status: false,
        message: "Lỗi lấy thông báo",
      });
    }
  },

  // Đánh dấu đã đọc
  async markRead(req, res) {
    try {
      const id = req.params.id;
      const userId = req.user.id;

      await NotificationModel.markAsRead(id, userId);

      return res.json({
        status: true,
        code: 200,
        message: "Đã đánh dấu đã đọc",
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        status: false,
        message: "Lỗi mark read",
      });
    }
  },
};
