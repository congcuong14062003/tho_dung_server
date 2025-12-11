import { PaymentModel } from "../models/payment.model.js";
import { RequestModel } from "../models/request.model.js";
import { baseResponse } from "../utils/response.helper.js";
import dotenv from "dotenv";
import {
  sendNotification,
  sendNotificationToAdmins,
} from "../utils/sendNotification.js";
dotenv.config();
export const PaymentController = {
  async getPaymentDetail(req, res) {
    try {
      const { request_id } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role; // admin / customer / technician

      // --- Lấy thông tin request ---
      const request = await RequestModel.getRequestDetail(request_id);

      if (!request?.id) {
        return baseResponse(res, {
          code: 404,
          status: false,
          message: "Không tìm thấy yêu cầu",
        });
      }

      const customerId = request?.customer?.id;
      const technicianId = request?.technician?.id;

      // ======================================================
      // 🔐 KIỂM TRA QUYỀN TRUY CẬP
      // ======================================================
      const isAdmin = userRole === "admin";
      const isCustomer = String(userId) === String(customerId);
      const isTechnician = String(userId) === String(technicianId);

      if (!isAdmin && !isCustomer && !isTechnician) {
        return baseResponse(res, {
          code: 403,
          status: false,
          message:
            "Bạn không có quyền xem thông tin thanh toán của yêu cầu này",
        });
      }

      // ======================================================
      // 🔵 LẤY PAYMENT DETAIL
      // ======================================================
      const data = await PaymentModel.getPaymentDetailByRequest(request_id);

      if (!data) {
        return baseResponse(res, {
          code: 404,
          status: false,
          message: "Chưa có thông tin thanh toán",
        });
      }

      return baseResponse(res, {
        code: 200,
        status: true,
        data,
      });
    } catch (error) {
      console.error("getPaymentDetail:", error.message);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server",
      });
    }
  },
  // ===============================
  // 🔹 Upload bill thanh toán
  // ===============================
  async uploadProof(req, res) {
    try {
      const { payment_id } = req.body;
      console.log("payment_id: ", payment_id);

      const userId = req.user.id;
      const role = req.user.role; // customer | technician | admin
      const files = req.files || [];

      if (!payment_id) {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Thiếu payment_id",
        });
      }

      // Lấy payment + request detail
      const payment = await PaymentModel.getPaymentDetail(payment_id);
      if (!payment) {
        return baseResponse(res, {
          code: 404,
          status: false,
          message: "Không tìm thấy payment",
        });
      }

      if (files.length === 0) {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Không có ảnh nào được upload",
        });
      }

      // ======================================================
      // 🔍 Lấy thông tin request để kiểm tra quyền
      // ======================================================
      const request = await RequestModel.getRequestDetail(payment.request_id);
      if (!request?.id) {
        return baseResponse(res, {
          code: 404,
          status: false,
          message: "Không tìm thấy yêu cầu",
        });
      }

      const customerId = request?.customer?.id;
      const technicianId = request?.technician?.id;
      const requestId = request?.id;

      // ======================================================
      // 🔐 Chỉ khách hoặc thợ của request được phép upload bill
      // ======================================================
      const isCustomer = String(userId) === String(customerId);
      const isTechnician = String(userId) === String(technicianId);

      if (!isCustomer && !isTechnician && role !== "admin") {
        return baseResponse(res, {
          code: 403,
          status: false,
          message: "Bạn không có quyền upload bill cho yêu cầu này",
        });
      }

      // ======================================================
      // 📸 Xử lý upload ảnh
      // ======================================================
      const images = files.map((file) => file.path);

      const result = await PaymentModel.uploadProof({
        payment_id,
        user_id: userId,
        images,
        request_id: requestId,
      });

      // ======================================================
      // 🔔 Gửi NOTI theo role
      // ======================================================
      const title =
        role === "customer"
          ? "Khách hàng đã upload bill thanh toán"
          : role === "technician"
          ? "Thợ đã upload bill thanh toán"
          : "Admin đã upload bill thanh toán";

      const body = `Yêu cầu #${requestId} đã được tải lên bill thanh toán.`;

      // ----------- 🔵 Nếu khách upload → gửi thợ + admin -----------
      if (role === "customer") {
        if (technicianId) {
          await sendNotification({
            userId: technicianId,
            title,
            body,
            data: {
              type: "payment",
              request_id: String(requestId),
              url: `/request/${requestId}`,
            },
          });
        }

        await sendNotificationToAdmins({
          title,
          body,
          data: {
            type: "payment",
            request_id: String(requestId),
            url: `/requests/${requestId}`,
          },
        });
      }

      // ----------- 🟢 Nếu thợ upload → gửi khách + admin -----------
      if (role === "technician") {
        if (customerId) {
          await sendNotification({
            userId: customerId,
            title,
            body,
            data: {
              type: "payment",
              request_id: String(requestId),
              url: `/request/${requestId}`,
            },
          });
        }

        await sendNotificationToAdmins({
          title,
          body,
          data: {
            type: "payment",
            request_id: String(requestId),
            url: `/requests/${requestId}`,
          },
        });
      }

      // ----------- 🔴 Nếu admin upload → gửi cả thợ + khách -----------
      if (role === "admin") {
        if (technicianId) {
          await sendNotification({
            userId: technicianId,
            title,
            body,
            data: {
              type: "payment",
              request_id: String(requestId),
              url: `/request/${requestId}`,
            },
          });
        }

        if (customerId) {
          await sendNotification({
            userId: customerId,
            title,
            body,
            data: {
              type: "payment",
              request_id: String(requestId),
              url: `/request/${requestId}`,
            },
          });
        }
      }

      // ======================================================
      // RESPONSE
      // ======================================================
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
      console.log("payment_id: ", payment_id);
      console.log("action: ", action);
      console.log("reason: ", reason);

      const adminId = req.user.id;

      if (!payment_id || !["approve"].includes(action)) {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Thiếu payment_id hoặc action không hợp lệ",
        });
      }

      // Lấy payment + request detail
      const payment = await PaymentModel.getPaymentDetail(payment_id);
      if (!payment) {
        return baseResponse(res, {
          code: 404,
          status: false,
          message: "Không tìm thấy payment",
        });
      }

      const request = await RequestModel.getRequestDetail(payment.request_id);

      const customerId = request?.customer?.id;
      const technicianId = request?.technician?.id;

      // Update status
      const result = await PaymentModel.verifyPayment({
        payment_id,
        action,
        adminId,
        reason,
      });

      // ================================
      // 🔥 Gửi thông báo
      // ================================
      const title = "Cập nhật thanh toán";
      const body =
        action === "approve"
          ? "Hóa đơn của bạn đã được admin duyệt."
          : "Hóa đơn của bạn đã bị từ chối.";

      const request_id = payment.request_id;

      // Gửi thông báo cho khách
      await sendNotification({
        userId: customerId,
        title,
        body,
        data: {
          type: "payment_approved",
          request_id: String(request_id),
          url: `/request/${request_id}`,
        },
      });

      // Gửi thông báo cho thợ
      await sendNotification({
        userId: technicianId,
        title,
        body,
        data: {
          type: "payment_approved",
          request_id: String(request_id),
          url: `/request/${request_id}`,
        },
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
