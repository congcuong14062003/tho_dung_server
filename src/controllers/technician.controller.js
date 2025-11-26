import { baseResponse } from "../utils/response.helper.js";
import { TechnicianModel } from "../models/technician.model.js";
import { UserModel } from "../models/user.model.js";

export const TechnicianController = {
  async getMyRequests(req, res) {
    try {
      const userId = req.user.id;

      const requests = await TechnicianModel.getRequestsByUserId(userId);

      return baseResponse(res, {
        code: 200,
        status: true,
        message: "Lấy danh sách yêu cầu làm thợ của bạn thành công",
        data: requests,
      });
    } catch (error) {
      console.error("Lỗi lấy yêu cầu của user:", error);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server khi lấy danh sách yêu cầu",
      });
    }
  },
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
          totalRecord: total,
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
  // Admin xem danh sách các yêu cầu muốn làm thợ
  async getPendingTechnicians(req, res) {
    try {
      const { page = 1, size = 10, keySearch = "", status = "all" } = req.body;

      // Ép kiểu số nguyên để tránh lỗi
      const pageNum = parseInt(page, 10);
      const pageSize = parseInt(size, 10);
      const { data, total } = await TechnicianModel.getPendingRequests({
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
          totalRecord: total,
          page: pageNum,
          size: pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      });
    } catch (error) {
      return baseResponse(res, { code: 500, message: error.message });
    }
  },

  // 1. User nộp đơn làm thợ → chỉ tạo request, KHÔNG ĐỔI role/status
  async applyToBecomeTechnician(req, res) {
    try {
      const userId = req.user.id;
      const {
        skill_category_ids,
        experience_years,
        working_area,
        description,
        certifications,
      } = req.body;

      if (
        !Array.isArray(skill_category_ids) ||
        skill_category_ids.length === 0
      ) {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Cần chọn ít nhất 1 kỹ năng!",
        });
      }

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

      // Kiểm tra đã có đơn đang pending chưa
      const existingRequest = await TechnicianModel.getPendingRequestByUser(
        userId
      );
      if (existingRequest) {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Bạn đã nộp đơn rồi, đang chờ duyệt!",
        });
      }

      // Tạo request mới
      await TechnicianModel.createRequest({
        user_id: userId,
        skill_category_ids,
        experience_years,
        working_area,
        description,
        certifications,
      });

      return baseResponse(res, {
        code: 200,
        status: true,
        message: "Gửi yêu cầu làm thợ thành công! Đang chờ admin duyệt.",
      });
    } catch (err) {
      console.error(err);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server",
      });
    }
  },

  // DUYỆT THỢ THEO DB MỚI (MULTI SKILLS)
  async approveTechnician(req, res) {
    try {
      const { request_id } = req.body;
      const adminId = req.user.id;

      const request = await TechnicianModel.getRequestById(request_id);

      if (!request || request.status !== "pending") {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Yêu cầu không hợp lệ hoặc đã xử lý",
        });
      }

      const userId = request.user_id;

      // 1️⃣ LẤY MULTI SKILLS từ bảng technician_request_skills
      const skills = await TechnicianModel.getRequestSkills(request_id);

      // 2️⃣ CẬP NHẬT ROLE + ACTIVE
      await UserModel.updateUser(userId, {
        role: "technician",
        status: "active",
      });

      // 3️⃣ TẠO PROFILE + GÁN MULTI SKILLS
      await TechnicianModel.createProfileFromRequest(request, skills);

      // 4️⃣ CẬP NHẬT REQUEST STATUS
      await TechnicianModel.updateRequestStatus(
        request_id,
        "approved",
        adminId
      );

      return baseResponse(res, {
        code: 200,
        status: true,
        message: `Đã duyệt thợ "${request.full_name}" thành công`,
      });
    } catch (err) {
      console.error(err);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi duyệt thợ",
      });
    }
  },
  // 3. Admin từ chối
  // TỪ CHỐI YÊU CẦU LÀM THỢ
  async rejectTechnician(req, res) {
    try {
      const { request_id, reason } = req.body;
      const adminId = req.user.id;

      const request = await TechnicianModel.getRequestById(request_id);

      if (!request || request.status !== "pending") {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Không thể từ chối yêu cầu này",
        });
      }

      // ❌ CHỈ cập nhật trạng thái request
      await TechnicianModel.updateRequestStatus(
        request_id,
        "rejected",
        adminId,
        reason
      );

      // ❌ User không được set về customer — vẫn giữ nguyên role customer hiện tại

      return baseResponse(res, {
        code: 200,
        status: true,
        message: "Đã từ chối yêu cầu làm thợ",
      });
    } catch (err) {
      console.error(err);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi từ chối yêu cầu",
      });
    }
  },
  // ==================== KHÓA THỢ ====================
  async blockTechnician(req, res) {
    try {
      const { user_id } = req.body;
      const adminId = req.user.id;

      if (!user_id) {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Thiếu user_id",
        });
      }

      const user = await UserModel.getById(user_id);
      if (!user) {
        return baseResponse(res, {
          code: 404,
          status: false,
          message: "Không tìm thấy người dùng",
        });
      }

      if (user.role !== "technician") {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Đây không phải tài khoản thợ",
        });
      }

      if (user.status !== "active") {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Tài khoản đã bị khóa hoặc đang chờ duyệt",
        });
      }

      // Khóa: chuyển status = 'inactive' (hoặc 'banned' tùy anh muốn)
      await UserModel.updateUser(user_id, { status: "inactive" });

      // (Tùy chọn) Ghi log hành động admin
      // await AdminLogModel.create({ admin_id: adminId, action: "block_technician", target_id: user_id });

      return baseResponse(res, {
        code: 200,
        status: true,
        message: `Đã khóa tài khoản thợ "${user.full_name}" thành công`,
      });
    } catch (error) {
      console.error("Lỗi khóa thợ:", error);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server",
      });
    }
  },

  // ==================== MỞ KHÓA THỢ ====================
  async unblockTechnician(req, res) {
    try {
      const { user_id } = req.body;
      const adminId = req.user.id;

      if (!user_id) {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Thiếu user_id",
        });
      }

      const user = await UserModel.getById(user_id);
      if (!user) {
        return baseResponse(res, {
          code: 404,
          status: false,
          message: "Không tìm thấy người dùng",
        });
      }

      if (user.role !== "technician") {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Đây không phải tài khoản thợ",
        });
      }

      if (user.status !== "inactive") {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Tài khoản đang hoạt động hoặc chờ duyệt",
        });
      }

      // Mở khóa: chuyển lại status = 'active'
      await UserModel.updateUser(user_id, { status: "active" });

      return baseResponse(res, {
        code: 200,
        status: true,
        message: `Đã mở khóa thành công cho thợ "${user.full_name}"`,
      });
    } catch (error) {
      console.error("Lỗi mở khóa thợ:", error);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server",
      });
    }
  },
};
