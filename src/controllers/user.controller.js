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

  async getAllCustomer(req, res) {
    try {
      const { keySearch = "", status = "all", page = 1, size = 10 } = req.body;

      const result = await UserModel.getAllCustomer({
        keySearch,
        status,
        page,
        size,
      });

      console.log("result: ", result);

      return baseResponse(res, {
        code: 200,
        status: true,
        message: "Lấy danh sách user thành công",
        data: result, // page, size, totalRecord, totalPages, data
      });
    } catch (error) {
      console.error("Lỗi getAllUsers:", error);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server khi lấy danh sách user",
      });
    }
  },
  async updateStatus(req, res) {
    try {
      const { userId, status } = req.body;

      if (!userId || !status) {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Thiếu tham số id hoặc status",
        });
      }

      const user = await UserModel.getUserById(userId);

      if (!user) {
        return baseResponse(res, {
          code: 404,
          status: false,
          message: "Không tìm thấy người dùng",
        });
      }

      // cập nhật status user
      const result = await UserModel.updateStatus(userId, status);

      if (!result) {
        return baseResponse(res, {
          code: 404,
          status: false,
          message: "Không tìm thấy user cần cập nhật",
        });
      }

      return baseResponse(res, {
        code: 200,
        status: true,
        message: "Cập nhật trạng thái user thành công",
      });
    } catch (error) {
      console.error("Lỗi updateStatus:", error);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server khi cập nhật trạng thái",
      });
    }
  },
};
