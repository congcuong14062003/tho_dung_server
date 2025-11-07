import { baseResponse } from "../utils/response.helper.js";
import { TechnicianModel } from "../models/technician.model.js";
import { UserModel } from "../models/user.model.js";

export const TechnicianController = {
  async getAllTechnicians(req, res) {
    try {
      // Lấy danh sách kỹ thuật viên + thông tin user
      const technicians = await TechnicianModel.getAllWithUser();

      return baseResponse(res, {
        code: 200,
        status: true,
        message: "Lấy danh sách thợ thành công",
        data: technicians,
      });
    } catch (error) {
      console.error("Lỗi lấy danh sách thợ:", error);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server khi lấy danh sách thợ",
      });
    }
  },
};
