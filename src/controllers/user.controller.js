import { UserModel } from "../models/user.model.js";

export const UserController = {
  // Lấy thông tin người dùng hiện tại
  async getProfile(req, res) {
    try {
      console.log("req.user: ", req.user);

      const userId = req.user.id;
      const user = await UserModel.getUserById(userId);

      if (!user) {
        return res.status(404).json({ message: "Không tìm thấy người dùng" });
      }

      res.json({ user });
    } catch (error) {
      console.error("Lỗi getProfile:", error);
      res.status(500).json({ message: "Lỗi server" });
    }
  },

  async updateAvatar(req, res) {
    try {
      const userId = req.user.id;

      if (!req.file) {
        return res.status(400).json({ message: "Không có file được tải lên" });
      }

      // Đường dẫn lưu trong DB (ví dụ lưu trong /uploads/images/)
      const avatarPath = `/uploads/${req.file.filename}`;

      const result = await UserModel.updateAvatar(userId, avatarPath);

      if (!result) {
        return res.status(404).json({ message: "Cập nhật thất bại" });
      }

      res.json({
        message: "Cập nhật avatar thành công",
        avatar_link: avatarPath,
      });
    } catch (error) {
      console.error("Lỗi updateAvatar:", error);
      res.status(500).json({ message: "Lỗi server" });
    }
  },
};
