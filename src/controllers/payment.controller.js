import { PaymentModel } from "../models/payment.model.js";
import { RequestModel } from "../models/request.model.js";
import { baseResponse } from "../utils/response.helper.js";
import dotenv from "dotenv";
dotenv.config();
export const PaymentController = {
  async getPaymentDetail(req, res) {
    try {
      const { request_id } = req.params;

      const request = await RequestModel.getRequestDetail(request_id); // lấy user_id để check quyền
      if (!request.id)
        return baseResponse(res, {
          code: 404,
          message: "Không tìm thấy yêu cầu",
        });

      // Chỉ chủ yêu cầu hoặc admin được xem
      // if (
      //   request.customer.id !== req.user.id ||
      //   request.technician.id !== req.user.id
      // ) {
      //   return baseResponse(res, {
      //     code: 403,
      //     message: "Không có quyền xem thông tin thanh toán",
      //   });
      // }

      const data = await PaymentModel.getPaymentDetail(request_id);
      if (!data)
        return baseResponse(res, {
          code: 404,
          message: "Chưa có thông tin thanh toán",
        });

      return baseResponse(res, { code: 200, status: true, data });
    } catch (error) {
      console.error("getPaymentDetail:", error.message);
      return baseResponse(res, { code: 500, message: "Lỗi server" });
    }
  },

  // ===============================
  // 🔹 Upload bill thanh toán
  // ===============================
  async uploadProof(req, res) {
    try {
      const { payment_id, request_id } = req.body;
      const userId = req.user.id;
      const files = req.files || [];

      console.log("req.file: ", req.files);

      if (!payment_id) {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Thiếu payment_id",
        });
      }

      if (files.length === 0) {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Không có ảnh nào được upload",
        });
      }

      // ===============================
      // 🔥 Giống createRequest – convert URL
      // ===============================
      const images = files.map((file) => file.path);

      const result = await PaymentModel.uploadProof({
        payment_id,
        user_id: userId,
        images, // ⬅ gửi URLs xuống DB
        request_id,
      });

      return baseResponse(res, {
        code: 200,
        status: true,
        message: "Upload ảnh bill thành công, chờ admin duyệt",
        data: result,
      });
    } catch (error) {
      console.error("uploadProof:", error);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server khi upload bill",
      });
    }
  },
  // ===============================
  // 🔹 Admin verify payment proof
  // ===============================
  async verifyPayment(req, res) {
    try {
      const { payment_id, action, reason } = req.body;
      const adminId = req.user.id;

      if (!payment_id || !["approve"].includes(action)) {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Thiếu payment_id hoặc action không hợp lệ",
        });
      }

      const result = await PaymentModel.verifyPayment({
        payment_id,
        action,
        adminId,
        reason,
      });

      return baseResponse(res, {
        code: 200,
        status: true,
        message:
          action === "approve"
            ? "Duyệt hóa đơn thành công"
            : "Từ chối hóa đơn thành công",
        data: result,
      });
    } catch (error) {
      console.error("verifyPayment:", error);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: error.message || "Lỗi server khi duyệt hóa đơn",
      });
    }
  },
};
