import { baseResponse } from "../utils/response.helper.js";
import dotenv from "dotenv";
dotenv.config();
export const PaymentController = {
  // ===============================
  // 🔹 Upload bill thanh toán
  // ===============================
  async uploadProof(req, res) {
    try {
      const { payment_id } = req.body;
      const userId = req.user.id;
      const files = req.files || [];

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

      const result = await PaymentModel.uploadProof({
        payment_id,
        user_id: userId,
        files,
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

      if (!payment_id || !["approve", "reject"].includes(action)) {
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
