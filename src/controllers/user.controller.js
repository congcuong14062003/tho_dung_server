import { UserModel } from "../models/user.model.js";
import { baseResponse } from "../utils/response.helper.js";
import dotenv from "dotenv";
dotenv.config();

export const UserController = {
  async getProfile(req, res) {
    try {
      const userId = req.user.id;
      const user = await UserModel.getUserById(userId);

      if (!user) {
        return baseResponse(res, {
          code: 404,
          status: false,
          message: "Không tìm thấy người dùng",
        });
      }

      return baseResponse(res, {
        code: 200,
        status: true,
        message: "Lấy thông tin người dùng thành công",
        data: { userInfor: user, workerInfor: null },
      });
    } catch (error) {
      console.error("Lỗi getProfile:", error);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server khi lấy thông tin người dùng",
      });
    }
  },

  async updateAvatar(req, res) {
    try {
      const userId = req.user.id;
      console.log("req.file: ", req.file);

      if (!req.file) {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Không có file được tải lên",
        });
      }

      const avatarPath = `${process.env.URL_SERVER}/uploads/${req.file.filename}`;
      const result = await UserModel.updateAvatar(userId, avatarPath);

      if (!result) {
        return baseResponse(res, {
          code: 404,
          status: false,
          message: "Cập nhật avatar thất bại",
        });
      }

      return baseResponse(res, {
        code: 200,
        status: true,
        message: "Cập nhật avatar thành công",
        data: { avatar_link: avatarPath },
      });
    } catch (error) {
      console.error("Lỗi updateAvatar:", error);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server khi cập nhật avatar",
      });
    }
  },
};
