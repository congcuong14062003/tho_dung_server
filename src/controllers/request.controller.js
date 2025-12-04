import { RequestModel } from "../models/request.model.js";
import { baseResponse } from "../utils/response.helper.js";
import {
  sendNotification,
  sendNotificationToAdmins,
} from "../utils/sendNotification.js";
// Helper chung cho phân trang (dùng lại ở mọi list)
const handlePagination = (req) => {
  const page = parseInt(req.body.page) || 1;
  const size = parseInt(req.body.size) || 10;
  const keySearch = req.body.keySearch || "";
  const status = req.body.status || "all";
  const offset = (page - 1) * size;

  return { page, size, keySearch, status, limit: size, offset };
};
export const RequestController = {
  // 1. Tạo yêu cầu – chỉ validate
  async create(req, res) {
    try {
      const {
        service_id,
        name_request,
        description,
        address,
        requested_date,
        requested_time,
      } = req.body;
      const user_id = req.user.id;

      const images =
        req.files?.map(
          (file) => `${process.env.URL_SERVER}/uploads/${file.filename}`
        ) || [];

      if (images.length === 0) {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Vui lòng tải lên ít nhất 1 hình ảnh",
        });
      }
      if (
        !service_id ||
        !name_request ||
        !description ||
        !address ||
        !requested_date ||
        !requested_time
      ) {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Thiếu thông tin bắt buộc",
        });
      }

      const requestId = await RequestModel.create({
        user_id,
        service_id,
        name_request,
        description,
        address,
        requested_date,
        requested_time,
        images,
      });
      // ================================
      // 🎉 Gửi thông báo cho admin CMS
      // ================================
      await sendNotificationToAdmins({
        title: "Yêu cầu mới",
        body: `Khách đã tạo yêu cầu: ${name_request}`,
        data: {
          type: "new_request",
          request_id: String(requestId),
          url: `/requests/${requestId}`, // 👈 thêm link vào đây
        },
      });

      return baseResponse(res, {
        code: 200,
        status: true,
        message: "Tạo yêu cầu thành công",
        data: { id: requestId },
      });
    } catch (error) {
      console.error("CreateRequest:", error);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server",
      });
    }
  },

  // 2. Hủy yêu cầu – gọn hơn
  async cancelRequest(req, res) {
    try {
      const result = await RequestModel.cancelRequest({
        request_id: req.body.request_id,
        user_id: req.user.id,
        reason: req.body.reason,
      });

      if (!result.success) {
        return baseResponse(res, {
          code: result.code || 400,
          status: false,
          message: result.message,
        });
      }

      return baseResponse(res, {
        code: 200,
        status: true,
        message: "Hủy yêu cầu thành công",
      });
    } catch (error) {
      console.error("cancelRequest:", error);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server",
      });
    }
  },

  // 3. Các hàm lấy danh sách – dùng helper
  async getAll(req, res) {
    try {
      const { data, total } = await RequestModel.getAll(handlePagination(req));
      return baseResponse(res, {
        code: 200,
        status: true,
        data: { totalRecord: total, data },
      });
    } catch (error) {
      console.error("getAll:", error);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server",
      });
    }
  },

  async getRequestsByUser(req, res) {
    try {
      const params = { ...handlePagination(req), userId: req.user.id };
      const { data, total } = await RequestModel.getRequestsByUser(params);
      return baseResponse(res, {
        code: 200,
        status: true,
        data: { total, ...handlePagination(req), data },
      });
    } catch (error) {
      console.error("getRequestsByUser:", error);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server",
      });
    }
  },

  async getRequestsByTechnician(req, res) {
    try {
      const params = { ...handlePagination(req), technicianId: req.user.id };
      const { data, total } = await RequestModel.getRequestsByTechnician(
        params
      );
      return baseResponse(res, {
        code: 200,
        status: true,
        data: { total, ...handlePagination(req), data },
      });
    } catch (error) {
      console.error("getRequestsByTechnician:", error);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server",
      });
    }
  },

  // 4. Chi tiết yêu cầu – thêm check quyền (rất quan trọng!)
  async getRequestDetail(req, res) {
    try {
      const { id } = req.params;
      const request = await RequestModel.getRequestDetail(id);
      if (!request) {
        return baseResponse(res, {
          code: 404,
          status: false,
          message: "Không tìm thấy yêu cầu",
        });
      }

      // Check quyền: chỉ chủ, thợ được gán, hoặc admin mới được xem
      const allowed =
        req.user.role === "admin" ||
        request.customer.id === req.user.id ||
        request.technician?.id === req.user.id;

      if (!allowed) {
        return baseResponse(res, {
          code: 403,
          status: false,
          message: "Bạn không có quyền xem yêu cầu này",
        });
      }

      return baseResponse(res, { code: 200, status: true, data: request });
    } catch (error) {
      console.error("getRequestDetail:", error);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server",
      });
    }
  },

  // Các hàm còn lại – chỉ gọi Model (đã xử lý hết logic + transaction)
  async assignRequest(req, res) {
    try {
      const result = await RequestModel.assignRequest({
        request_id: req.body.request_id,
        technician_id: req.body.technician_id,
        admin_id: req.user.id,
        reason: req.body.reason,
      });
      return baseResponse(res, {
        code: 200,
        status: true,
        message: "Gán thợ thành công",
        data: result,
      });
    } catch (error) {
      console.error("assignRequest:", error);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server",
      });
    }
  },

  async technicianResponse(req, res) {
    try {
      const result = await RequestModel.technicianResponse({
        request_id: req.body.request_id,
        technician_id: req.user.id,
        action: req.body.action,
        reason: req.body.reason,
      });

      const isAccept = req.body.action === "accept";
      const requestId = req.body.request_id;

      const title = isAccept
        ? "Thợ đã chấp nhận yêu cầu"
        : "Thợ đã từ chối yêu cầu";

      const body = isAccept
        ? `Một thợ vừa chấp nhận yêu cầu #${requestId}. Vui lòng kiểm tra chi tiết.`
        : req.body.reason
        ? `Một thợ đã từ chối yêu cầu #${requestId}. Lý do: ${req.body.reason}.`
        : `Một thợ đã từ chối yêu cầu #${requestId}.`;

      // ================================
      // 🎉 Gửi thông báo cho admin CMS
      // ================================
      await sendNotificationToAdmins({
        title,
        body,
        data: {
          request_id: String(requestId),
          url: `/requests/${requestId}`,
        },
      });

      return baseResponse(res, {
        code: 200,
        status: true,
        message:
          req.body.action === "accept"
            ? "Chấp nhận yêu cầu thành công"
            : "Từ chối yêu cầu thành công",
        data: result,
      });
    } catch (error) {
      console.error("technicianResponse:", error);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server",
      });
    }
  },

  // Thay bằng hàm mới (nếu vẫn muốn riêng route up ảnh khảo sát)
  async uploadSurveyImages(req, res) {
    try {
      const images =
        req.files?.map(
          (f) => `${process.env.URL_SERVER}/uploads/${f.filename}`
        ) || [];
      if (images.length === 0)
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Chưa tải ảnh",
        });

      await RequestModel.insertRequestImages(
        // gọi hàm chung trong Model
        req.body.request_id,
        req.user.id,
        images,
        "survey"
      );

      return baseResponse(res, {
        code: 200,
        status: true,
        message: "Tải ảnh khảo sát thành công",
      });
    } catch (error) {
      console.error("uploadSurveyImages:", error);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server",
      });
    }
  },

  async createQuotation(req, res) {
    try {
      const { request_id, items } = req.body;
      if (!Array.isArray(items) || items.length === 0) {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Danh sách báo giá trống",
        });
      }

      const quotationId = await RequestModel.createQuotation({
        request_id,
        technician_id: req.user.id,
        items,
      });

      return baseResponse(res, {
        code: 200,
        status: true,
        message: "Gửi báo giá thành công",
        data: { quotation_id: quotationId },
      });
    } catch (error) {
      console.error("createQuotation:", error);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server",
      });
    }
  },
  // ===============================
  // 🔹 Khách hàng chấp nhận hoặc từ chối báo giá
  // ===============================
  async quotationResponse(req, res) {
    try {
      const userId = req.user.id;
      const { request_id, action, reason } = req.body;
      // action = "accept" | "reject"

      if (!["accept", "reject"].includes(action)) {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Hành động không hợp lệ",
        });
      }

      const result = await RequestModel.quotationResponse({
        request_id,
        user_id: userId,
        action,
        reason,
      });

      return baseResponse(res, {
        code: 200,
        status: true,
        message:
          action === "accept"
            ? "Bạn đã chấp nhận báo giá"
            : "Bạn đã từ chối báo giá",
        data: result,
      });
    } catch (error) {
      console.error("quotationResponse:", error);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server khi cập nhật trạng thái báo giá",
      });
    }
  },

  // ===========================================
  // 🔹 Cập nhật tiến độ đầu việc theo mảng items
  // ===========================================
  async updateItemProgress(req, res) {
    try {
      const technicianId = req.user.id;
      const { request_id, items = [] } = req.body;

      console.log("request_id: ", request_id);
      console.log("items: ", items);

      if (!request_id) {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Thiếu request_id",
        });
      }

      if (!Array.isArray(items) || items.length === 0) {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Danh sách items không hợp lệ",
        });
      }

      // Gọi Model xử lý chính
      const result = await RequestModel.updateItemProgress({
        request_id,
        technician_id: technicianId,
        items,
      });

      return baseResponse(res, {
        code: 200,
        status: true,
        message: "Cập nhật tiến độ thành công",
        data: result,
      });
    } catch (error) {
      console.error("updateItemProgress:", error);

      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server khi cập nhật tiến độ đầu việc",
      });
    }
  },
  // ===============================
  // 🔹 Cập nhật status request => completed
  // ===============================
  async setCompleted(req, res) {
    try {
      const { request_id } = req.body;
      const userId = req.user.id;

      if (!request_id) {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Thiếu request_id",
        });
      }

      // Gọi model update status
      const result = await RequestModel.setCompleted({
        request_id,
        user_id: userId,
      });

      return baseResponse(res, {
        code: 200,
        status: true,
        message: "Cập nhật yêu cầu thành completed thành công",
        data: result,
      });
    } catch (error) {
      console.error("setCompleted:", error);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server khi cập nhật completed",
      });
    }
  },
};
