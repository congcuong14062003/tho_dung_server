import { RequestModel } from "../models/request.model.js";
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
};
