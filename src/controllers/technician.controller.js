import { baseResponse } from "../utils/response.helper.js";
import { TechnicianModel } from "../models/technician.model.js";

export const TechnicianController = {
  async getAllTechnicians(req, res) {
    try {
      const { page = 1, size = 10, keySearch = "", status = "all" } = req.body;

      // Ép kiểu số nguyên để tránh lỗi
      const pageNum = parseInt(page, 10);
      const pageSize = parseInt(size, 10);

      // Gọi Model để lấy danh sách có phân trang + tìm kiếm
      const { data, total } = await TechnicianModel.getAllWithUser({
        page: pageNum,
        size: pageSize,
        keySearch,
        status,
      });

      return baseResponse(res, {
        code: 200,
        status: true,
        message: "Lấy danh sách thợ thành công",
        data: {
          data,
          total,
          page: pageNum,
          size: pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
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
