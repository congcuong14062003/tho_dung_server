import { RequestModel } from "../models/request.model.js";
import { generateId } from "../utils/crypto.js";
import { baseResponse } from "../utils/response.helper.js";

export const RequestController = {
  // ===============================
  // 🔹 Khách tạo yêu cầu mới
  // ===============================
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

      const user_id = req.user.id; // ✅ lấy từ token

      console.log("req.user:", req.user);
      console.log("req.files: ", req.files);

      const images =
        req.files?.map(
          (file) => `${process.env.URL_SERVER}/uploads/${file.filename}`
        ) || [];

      if (!images || images.length < 1) {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Vui lòng tải lên hình ảnh minh họa",
        });
      }

      // ⚠️ Kiểm tra bắt buộc
      if (
        !name_request ||
        !description ||
        !address ||
        !requested_time ||
        !requested_date
      ) {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Vui lòng cung cấp đầy đủ thông tin bắt buộc",
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
        message: "Lỗi server khi tạo yêu cầu",
      });
    }
  },

  // ===============================
  // 🔹 Lấy danh sách tất cả yêu cầu
  // ===============================
  async getAll(req, res) {
    try {
      const { page = 1, size = 10, keySearch = "", status = "all" } = req.body;
      const limit = parseInt(size);
      const offset = (parseInt(page) - 1) * limit;

      const { data, total } = await RequestModel.getAll({
        keySearch,
        status,
        limit,
        offset,
      });

      return baseResponse(res, {
        code: 200,
        status: true,
        message: "Lấy danh sách yêu cầu thành công",
        data: {
          total,
          page: parseInt(page),
          size: parseInt(size),
          data: data,
        },
      });
    } catch (error) {
      console.error("GetAllRequests:", error);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server khi lấy danh sách yêu cầu",
      });
    }
  },

  // ===============================
  // 🔹 Lấy danh sách yêu cầu của khách hàng
  // ===============================
  async getRequestsByUser(req, res) {
    try {
      const userId = req.user.id; // ✅ lấy từ token
      const { page = 1, size = 10, keySearch = "", status = "all" } = req.body;

      const limit = parseInt(size);
      const offset = (parseInt(page) - 1) * limit;

      const { data, total } = await RequestModel.getRequestsByUser({
        userId,
        keySearch,
        status,
        limit,
        offset,
      });

      return baseResponse(res, {
        code: 200,
        status: true,
        message: "Lấy danh sách yêu cầu theo người dùng thành công",
        data: {
          total,
          page: parseInt(page),
          size: parseInt(size),
          data,
        },
      });
    } catch (error) {
      console.error("getRequestsByUser:", error);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server khi lấy danh sách yêu cầu theo người dùng",
      });
    }
  },

  // ===============================
  // 🔹 Lấy danh sách yêu cầu được gán cho thợ
  // ===============================
  async getRequestsByTechnician(req, res) {
    try {
      const technicianId = req.user.id; // ✅ lấy từ token
      const { page = 1, size = 10, keySearch = "", status = "all" } = req.body;

      const limit = parseInt(size);
      const offset = (parseInt(page) - 1) * limit;

      const { data, total } = await RequestModel.getRequestsByTechnician({
        technicianId,
        keySearch,
        status,
        limit,
        offset,
      });

      return baseResponse(res, {
        code: 200,
        status: true,
        message: "Lấy danh sách yêu cầu được gán cho thợ thành công",
        data: {
          total,
          page: parseInt(page),
          size: parseInt(size),
          data,
        },
      });
    } catch (error) {
      console.error("getRequestsByTechnician:", error);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server khi lấy danh sách yêu cầu được gán cho thợ",
      });
    }
  },

  // ===============================
  // 🔹 Lấy chi tiết 1 yêu cầu
  // ===============================
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

      return baseResponse(res, {
        code: 200,
        status: true,
        message: "Lấy chi tiết yêu cầu thành công",
        data: request,
      });
    } catch (error) {
      console.error("getRequestDetail:", error);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server khi lấy chi tiết yêu cầu",
      });
    }
  },

  // ===============================
  // 🔹 Admin gán yêu cầu cho thợ
  // ===============================
  async assignRequest(req, res) {
    try {
      const { request_id, technician_id, reason } = req.body;
      const admin_id = req.user.id;

      if (!request_id || !technician_id) {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Thiếu thông tin yêu cầu hoặc thợ",
        });
      }

      const result = await RequestModel.assignRequest({
        request_id,
        technician_id,
        admin_id,
        reason,
      });

      return baseResponse(res, {
        code: 200,
        status: true,
        message: "Gán yêu cầu cho thợ thành công",
        data: result,
      });
    } catch (error) {
      console.error("assignRequest:", error);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server khi gán yêu cầu cho thợ",
      });
    }
  },

  // ===============================
  // 🔹 Thợ chấp nhận hoặc từ chối yêu cầu
  // ===============================
  async technicianResponse(req, res) {
    try {
      const { request_id, action, reason } = req.body; // action: "accept" hoặc "reject"
      const technician_id = req.user.id;

      if (!["accept", "reject"].includes(action)) {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Hành động không hợp lệ",
        });
      }

      const result = await RequestModel.technicianResponse({
        request_id,
        technician_id,
        action,
        reason,
      });

      return baseResponse(res, {
        code: 200,
        status: true,
        message:
          action === "accept"
            ? "Thợ đã chấp nhận yêu cầu"
            : "Thợ đã từ chối yêu cầu",
        data: result,
      });
    } catch (error) {
      console.error("technicianResponse:", error);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server khi thợ phản hồi yêu cầu",
      });
    }
  },

  // ===============================
  // 🔹 Thợ tải lên hình ảnh khảo sát
  // ===============================
  async uploadSurveyImages(req, res) {
    try {
      const technicianId = req.user.id;
      const { request_id } = req.body;
      const images =
        req.files?.map(
          (file) => `${process.env.URL_SERVER}/uploads/${file.filename}`
        ) || [];

      if (images.length === 0)
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Chưa có ảnh khảo sát",
        });

      const values = images.map((url) => [
        generateId("IMG"),
        request_id,
        technicianId,
        url,
        "survey",
      ]);
      await db.query(
        `INSERT INTO request_images (id, request_id, uploaded_by, image_url, type) VALUES ?`,
        [values]
      );

      return baseResponse(res, {
        code: 200,
        status: true,
        message: "Đã tải ảnh khảo sát thành công",
      });
    } catch (error) {
      console.error("uploadSurveyImages:", error);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server khi upload ảnh khảo sát",
      });
    }
  },

  // Thợ tải ảnh khảo sát
  async uploadSurveyImages(req, res) {
    try {
      const technicianId = req.user.id;
      const { request_id } = req.body;
      const images =
        req.files?.map(
          (file) => `${process.env.URL_SERVER}/uploads/${file.filename}`
        ) || [];

      if (images.length === 0)
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Chưa có ảnh khảo sát",
        });

      await RequestModel.insertSurveyImages(request_id, technicianId, images);

      return baseResponse(res, {
        code: 200,
        status: true,
        message: "Đã tải ảnh khảo sát",
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

  // ===============================
  // 🔹 Thợ gửi báo giá
  // ===============================
  async createQuotation(req, res) {
    try {
      const technicianId = req.user.id;
      const { request_id, items } = req.body;

      console.log("req.body: ", req.body);
      

      if (!items || !Array.isArray(items) || items.length === 0)
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Chưa có mục báo giá",
        });

      // Tạo báo giá
      const quotationId = await RequestModel.createQuotation({
        request_id,
        technician_id: technicianId,
        items,
      });

      // Cập nhật trạng thái yêu cầu
      await RequestModel.updateStatus(request_id, "quoted");

      // Ghi log thay đổi trạng thái
      await RequestModel.insertStatusLog({
        id: generateId("LOG"),
        requestId: request_id,
        oldStatus: "assigned",
        newStatus: "quoted",
        changedBy: technicianId,
        reason: "Thợ gửi báo giá",
      });

      return baseResponse(res, {
        code: 200,
        status: true,
        message: "Đã gửi báo giá thành công",
        data: { quotation_id: quotationId },
      });
    } catch (error) {
      console.error("createQuotation:", error);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server khi gửi báo giá",
      });
    }
  },
};
