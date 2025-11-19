import { baseResponse } from "../utils/response.helper.js";
import { TechnicianModel } from "../models/technician.model.js";
import { UserModel } from "../models/user.model.js";

export const TechnicianController = {
  // Lấy danh sách thợ với phân trang và tìm kiếm
  async getAllTechnicians(req, res) {
    try {
      const { page = 1, size = 10, keySearch, status } = req.body;

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

  // ============================
  // 1️⃣ User đăng ký lên làm thợ
  // ============================
  async applyToBecomeTechnician(req, res) {
    try {
      const userId = req.user.id;
      const {
        skill_category_id,
        experience_years,
        working_area,
        description,
        certifications,
      } = req.body;

      // Check user tồn tại & chưa phải technician
      const user = await UserModel.getById(userId);
      if (!user) {
        return baseResponse(res, {
          code: 404,
          status: false,
          message: "User không tồn tại",
        });
      }

      if (user.role === "technician") {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Bạn đã là thợ rồi",
        });
      }

      // Cập nhật trạng thái user -> pending thợ
      await UserModel.update(userId, { role: "technician", status: "pending" });

      // Tạo hồ sơ thợ
      await TechnicianModel.createProfile({
        user_id: userId,
        skill_category_id,
        experience_years,
        working_area,
        description,
        certifications,
      });

      return baseResponse(res, {
        code: 200,
        status: true,
        message: "Đăng ký làm thợ thành công. Đang chờ admin duyệt.",
      });
    } catch (err) {
      console.error(err);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server khi đăng ký làm thợ",
      });
    }
  },

  // ============================
  // 2️⃣ Admin duyệt thợ
  // ============================
  async approveTechnician(req, res) {
    try {
      const { userId } = req.params;

      const user = await UserModel.getById(userId);
      if (!user) {
        return baseResponse(res, {
          code: 404,
          status: false,
          message: "User không tồn tại",
        });
      }

      if (user.status === "active") {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Người này đã là thợ (đã duyệt).",
        });
      }

      // cập nhật trạng thái ACTIVE
      await UserModel.updateUser(userId, { status: "active" });

      return baseResponse(res, {
        code: 200,
        status: true,
        message: "Duyệt thợ thành công!",
      });
    } catch (err) {
      console.error(err);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server khi duyệt thợ",
      });
    }
  },

  // User nộp đơn
  async requestBecomeTechnician(req, res) {
    try {
      const userId = req.user.id;
      const data = req.body;

      await TechnicianModel.requestBecomeTechnician({
        user_id: userId,
        ...data,
      });

      return baseResponse(res, {
        code: 200,
        status: true,
        message: "Đã gửi đơn xin làm thợ thành công! Vui lòng chờ admin duyệt.",
      });
    } catch (error) {
      return baseResponse(res, { code: 500, message: error.message });
    }
  },

  // Admin duyệt
  async approveTechnician(req, res) {
    try {
      const { user_id } = req.body;
      await TechnicianModel.approveTechnician(user_id, req.user.id);
      return baseResponse(res, {
        code: 200,
        status: true,
        message: "Duyệt thợ thành công",
      });
    } catch (error) {
      return baseResponse(res, { code: 500, message: error.message });
    }
  },

  // Admin từ chối
  async rejectTechnician(req, res) {
    try {
      const { user_id, reason } = req.body;
      await TechnicianModel.rejectTechnician(user_id, req.user.id, reason);
      return baseResponse(res, {
        code: 200,
        status: true,
        message: "Từ chối đơn thành công",
      });
    } catch (error) {
      return baseResponse(res, { code: 500, message: error.message });
    }
  },

  // Admin xem danh sách chờ duyệt
  async getPendingTechnicians(req, res) {
    try {
      const { page = 1, size = 10, keySearch = "" } = req.body;
      const result = await TechnicianModel.getPendingTechnicians({
        page,
        size,
        keySearch,
      });
      return baseResponse(res, { code: 200, status: true, data: result });
    } catch (error) {
      return baseResponse(res, { code: 500, message: error.message });
    }
  },
};
