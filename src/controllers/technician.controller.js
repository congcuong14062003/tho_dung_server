import { baseResponse } from "../utils/response.helper.js";
import { TechnicianModel } from "../models/technician.model.js";
import { UserModel } from "../models/user.model.js";
import {
  sendNotification,
  sendNotificationToAdmins,
} from "../utils/sendNotification.js";

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

  async getRequestDetail(req, res) {
    try {
      const requestId = req.params.id;

      if (!requestId) {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Thiếu request_id",
        });
      }

      const data = await TechnicianModel.getRequestDetailFull(requestId);

      if (!data) {
        return baseResponse(res, {
          code: 404,
          status: false,
          message: "Không tìm thấy yêu cầu",
        });
      }

      return baseResponse(res, {
        code: 200,
        status: true,
        message: "Lấy chi tiết yêu cầu thành công",
        data: data,
      });
    } catch (error) {
      console.error(error);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: error.message,
      });
    }
  },

  // User nộp đơn làm thợ hoặc chỉnh sửa thông tin thợ
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

      // Kiểm tra có request pending chưa
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

      // 👉 Xác định loại (new hoặc update)
      const type = user.role === "technician" ? "update" : "new";

      // Tạo request
      const requestId = await TechnicianModel.createRequest({
        user_id: userId,
        skill_category_ids,
        experience_years,
        working_area,
        description,
        certifications,
        type,
      });

      // ================================
      // 🎉 Gửi thông báo cho admin CMS
      // ================================
      const notifyData = {
        title:
          type === "update"
            ? "Yêu cầu cập nhật thông tin thợ"
            : "Yêu cầu làm thợ mới",

        body:
          type === "update"
            ? `${user.full_name} đã gửi yêu cầu chỉnh sửa thông tin`
            : `${user.full_name} đã gửi yêu cầu trở thành thợ`,

        data: {
          request_id: String(requestId),
          type,
          url: `/technicians/requests/${requestId}`,
        },
      };

      await sendNotificationToAdmins(notifyData);

      return baseResponse(res, {
        code: 200,
        status: true,
        message:
          type === "update"
            ? "Gửi yêu cầu chỉnh sửa thông tin thành công, vui lòng chờ admin duyệt."
            : "Gửi yêu cầu làm thợ thành công, vui lòng chờ admin duyệt.",
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

      const user = await UserModel.getById(request.user_id);
      const skills = await TechnicianModel.getRequestSkills(request_id);

      if (user.role === "technician") {
        // 🟢 TH 2 — USER ĐÃ LÀ THỢ → CHỈ UPDATE PROFILE
        await TechnicianModel.updateProfileFromRequest(request, skills);

        // Chỉ cần đảm bảo user đang active
        await UserModel.updateUser(user.id, { status: "active" });
      } else {
        // 🟢 TH 1 — USER LẦN ĐẦU → TẠO PROFILE
        await UserModel.updateUser(user.id, {
          role: "technician",
          status: "active",
        });

        await TechnicianModel.createProfileFromRequest(request, skills);
      }

      // Cập nhật trạng thái request
      await TechnicianModel.updateRequestStatus(
        request_id,
        "approved",
        adminId
      );

      // 🎉 Gửi NOTIFICATION CHO THỢ
      await sendNotification({
        userId: user.id,
        title: "Yêu cầu làm thợ được duyệt",
        body:
          user.role === "technician"
            ? "Yêu cầu chỉnh sửa thông tin thợ của bạn đã được duyệt."
            : "Bạn đã trở thành thợ chính thức trên hệ thống!",
        // type: "technician_approved",
        data: {
          request_id: String(request_id),
          status: "approved",
          url: `/technicians/profile/${user.id}`,
        },
      });
      return baseResponse(res, {
        code: 200,
        status: true,
        message: "Duyệt thành công",
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

      // ⚠️ Kiểm tra user có tồn tại không
      const user = await UserModel.getById(request.user_id);
      if (!user) {
        return baseResponse(res, {
          code: 404,
          status: false,
          message: "User không tồn tại",
        });
      }

      // ❌ 1. Chỉ cập nhật trạng thái request
      await TechnicianModel.updateRequestStatus(
        request_id,
        "rejected",
        adminId,
        reason
      );
      // ❌ Gửi thông báo tới thợ khi bị từ chối
      await sendNotification({
        userId: user.id,
        title: "Yêu cầu bị từ chối",
        body:
          user.role === "technician"
            ? `Yêu cầu cập nhật thông tin của bạn bị từ chối. Lý do: ${
                reason || "Không rõ"
              }`
            : `Yêu cầu trở thành thợ của bạn bị từ chối. Lý do: ${
                reason || "Không rõ"
              }`,
        // type: "technician_rejected",
        data: {
          request_id: String(request_id),
          status: "rejected",
          reason: reason || "",
        },
      });

      // ❌ 2. KHÔNG làm gì với technician_profiles
      // ❌ 3. KHÔNG đổi role
      // ❌ 4. KHÔNG xóa skill
      // => Đúng nghiệp vụ: từ chối chỉ áp dụng cho request

      return baseResponse(res, {
        code: 200,
        status: true,
        message:
          user.role === "technician"
            ? "Đã từ chối yêu cầu cập nhật thông tin thợ"
            : "Đã từ chối yêu cầu làm thợ",
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
