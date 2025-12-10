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
  // Tạo yêu cầu – chỉ validate
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

      const images = req.files?.map((file) => file.path);

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

  //  Hủy yêu cầu – gọn hơn
  //  Hủy yêu cầu – gọn hơn + thông báo admin
  async cancelRequest(req, res) {
    try {
      const { request_id, reason } = req.body;
      const userId = req.user.id;

      const result = await RequestModel.cancelRequest({
        request_id,
        user_id: userId,
        reason,
      });

      if (!result.success) {
        return baseResponse(res, {
          code: result.code || 400,
          status: false,
          message: result.message,
        });
      }

      // =============================================
      //  🔔 GỬI NOTIFICATION SAU KHI HỦY THÀNH CÔNG
      // =============================================

      const title = "Khách hàng đã hủy yêu cầu";
      const body = `Yêu cầu #${request_id} đã bị hủy. Lý do: ${
        reason || "Không rõ lý do"
      }`;

      // 1️⃣ Gửi thông báo đến tất cả admin
      await sendNotificationToAdmins({
        title,
        body,
        data: {
          type: "request_cancel",
          request_id: String(request_id),
          url: `/requests/${request_id}`,
        },
      });

      // // 2️⃣ Gửi thông báo tới thợ nếu đơn có thợ
      // if (result.technician_id) {
      //   await sendNotification({
      //     userId: result.technician_id,
      //     title,
      //     body,
      //     data: {
      //       type: "request_cancel",
      //       request_id: String(request_id),
      //       url: `/request/${request_id}`,
      //     },
      //   });
      // }

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
  // Các hàm lấy danh sách – dùng helper
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

  // lấy danh sách yêu cầu bởi khách hàng
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

  // lấy danh sách yêu cầu bởi người thợ
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

  // Chi tiết yêu cầu – thêm check quyền (rất quan trọng!)
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
  // 4. Gán thợ – cần gửi thông báo cho thợ
  async assignRequest(req, res) {
    try {
      const { request_id, technician_id, reason } = req.body;
      const admin_id = req.user.id;

      const result = await RequestModel.assignRequest({
        request_id,
        technician_id,
        admin_id,
        reason,
      });

      // 🟢 Lấy thông tin request để lấy tên, mô tả…
      const request = await RequestModel.getRequestDetail(request_id);

      // ===============================
      // 🎉 Gửi NOTIFICATION CHO THỢ
      // ===============================
      await sendNotification({
        userId: technician_id,
        title: "Bạn được giao một yêu cầu mới",
        body: `Yêu cầu: ${request.name_request}`,
        data: {
          type: "assign_job",
          request_id: String(request_id),
          url: `/assigned/${request_id}`,
        },
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

  // phản hồi khi được gán việc
  async technicianResponse(req, res) {
    try {
      const userId = req.user.id;
      const role = req.user.role; // technician | customer | admin
      const { request_id, action, reason } = req.body;

      if (!["accept", "reject"].includes(action)) {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Hành động không hợp lệ",
        });
      }

      // ===========================================
      // 🔍 Lấy request để kiểm tra quyền
      // ===========================================
      const request = await RequestModel.getRequestDetail(request_id);
      if (!request) {
        return baseResponse(res, {
          code: 404,
          status: false,
          message: "Không tìm thấy yêu cầu",
        });
      }

      const assignedTechnicianId = request?.technician?.id;
      const customerId = request?.customer?.id;

      // ===========================================
      // 🚫 CHECK QUYỀN
      // ===========================================

      // ❌ Khách hàng không được gọi API này
      if (role === "customer") {
        return baseResponse(res, {
          code: 403,
          status: false,
          message: "Bạn không có quyền thao tác",
        });
      }

      // ❌ Thợ phải đúng là thợ được gán vào request
      if (role === "technician" && userId !== assignedTechnicianId) {
        return baseResponse(res, {
          code: 403,
          status: false,
          message: "Bạn không phải thợ được gán vào yêu cầu này",
        });
      }

      // ✔ Admin được phép
      // Nếu không muốn admin có quyền => em sẽ lock lại

      // ===========================================
      // ✔ Xử lý accept / reject
      // ===========================================
      const result = await RequestModel.technicianResponse({
        request_id,
        technician_id: userId,
        action,
        reason,
      });

      const isAccept = action === "accept";

      // ----- TITLE -----
      const title = isAccept
        ? "Thợ đã chấp nhận yêu cầu gán thợ"
        : "Thợ đã từ chối yêu cầu gán thợ";

      // ----- BODY -----
      const body = isAccept
        ? `Một thợ vừa chấp nhận yêu cầu #${request_id}.`
        : reason
        ? `Một thợ đã từ chối yêu cầu #${request_id}. Lý do: ${reason}.`
        : `Một thợ đã từ chối yêu cầu #${request_id}.`;

      // ----- TYPE -----
      const notiType = isAccept
        ? "technician_accept_assign"
        : "technician_reject_assign";

      // ===========================================
      // 🟢 Gửi NOTI ADMIN
      // ===========================================
      await sendNotificationToAdmins({
        title,
        body,
        data: {
          type: notiType,
          request_id: String(request_id),
          action: isAccept ? "accept" : "reject",
          url: `/requests/${request_id}`,
        },
      });

      // ===========================================
      // 🟢 Gửi NOTI CHO KHÁCH (nếu accept)
      // ===========================================
      if (isAccept && customerId) {
        await sendNotification({
          userId: customerId,
          title: "Thợ đã nhận việc",
          body: `Yêu cầu #${request_id} đã có thợ nhận.`,
          data: {
            type: "technician_accept_assign",
            request_id: String(request_id),
            url: `/request/${request_id}`,
          },
        });
      }

      // ===========================================
      // ✔ RESPONSE
      // ===========================================
      return baseResponse(res, {
        code: 200,
        status: true,
        message: isAccept
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
      const images = req.files?.map((file) => file.path);
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

  // Tạo báo giá cho khách hàng
  async createQuotation(req, res) {
    try {
      const userId = req.user.id;
      const role = req.user.role; // technician | customer | admin
      const { request_id, items } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Danh sách báo giá trống",
        });
      }

      // ====================================
      // 🔍 Lấy request để kiểm tra quyền
      // ====================================
      const request = await RequestModel.getRequestDetail(request_id);
      if (!request) {
        return baseResponse(res, {
          code: 404,
          status: false,
          message: "Không tìm thấy yêu cầu",
        });
      }

      const customerId = request?.customer?.id;
      const technicianId = request?.technician?.id;

      // ====================================
      // 🚫 CHECK QUYỀN
      // ====================================
      // ❌ Khách hàng không bao giờ được tạo báo giá
      if (role === "customer") {
        return baseResponse(res, {
          code: 403,
          status: false,
          message: "Bạn không có quyền tạo báo giá",
        });
      }

      // ❌ Thợ chỉ được tạo báo giá cho request thuộc về mình
      if (role === "technician" && userId !== technicianId) {
        return baseResponse(res, {
          code: 403,
          status: false,
          message: "Bạn không phải thợ của yêu cầu này",
        });
      }

      // ✔ Admin thì bỏ qua kiểm tra (admin có quyền tạo báo giá thay thợ)
      // Nếu anh không muốn admin có quyền → em sẽ chỉnh lại

      // ====================================
      // ✔ Tạo báo giá
      // ====================================
      const quotationId = await RequestModel.createQuotation({
        request_id,
        technician_id: userId,
        items,
      });

      const nameRequest = request?.name_request || "";

      // ====================================
      // 🔔 Nội dung NOTIFICATION
      // ====================================
      const title = "Thợ đã gửi báo giá";
      const body = `Báo giá mới cho yêu cầu: ${nameRequest}`;

      // ====================================
      // 🔔 Gửi NOTI CHO ADMIN
      // ====================================
      await sendNotificationToAdmins({
        title,
        body,
        data: {
          type: "quote_from_worker",
          quotation_id: String(quotationId),
          request_id: String(request_id),
          url: `/requests/${request_id}`,
        },
      });

      // ====================================
      // 🔔 Gửi NOTI CHO KHÁCH HÀNG
      // ====================================
      if (customerId) {
        await sendNotification({
          userId: customerId,
          title,
          body,
          data: {
            type: "quote_from_worker",
            request_id: String(request_id),
            url: `/request/${request_id}`,
          },
        });
      }

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
      const role = req.user.role; // customer | technician | admin

      const { request_id, action, reason } = req.body;

      if (!["accept", "reject"].includes(action)) {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Hành động không hợp lệ",
        });
      }

      // ================================
      // 🔍 Lấy request để kiểm tra quyền
      // ================================
      const request = await RequestModel.getRequestDetail(request_id);
      if (!request) {
        return baseResponse(res, {
          code: 404,
          status: false,
          message: "Không tìm thấy yêu cầu",
        });
      }

      const customerId = request?.customer?.id;
      const technicianId = request?.technician?.id;

      // =====================================
      // 🚫 CHECK QUYỀN — chỉ khách hàng hợp lệ được thao tác
      // =====================================
      if (role !== "customer" || userId !== customerId) {
        return baseResponse(res, {
          code: 403,
          status: false,
          message: "Bạn không có quyền thực hiện hành động này",
        });
      }

      // ================================
      // ✔ Cập nhật DB
      // ================================
      const result = await RequestModel.quotationResponse({
        request_id,
        user_id: userId,
        action,
        reason,
      });

      const nameRequest = request?.name_request || "";

      // ================================
      // 🔔 Chuẩn bị nội dung thông báo
      // ================================
      const title =
        action === "accept"
          ? "Khách hàng đã chấp nhận báo giá"
          : "Khách hàng đã từ chối báo giá";

      const body =
        action === "accept"
          ? `Báo giá cho yêu cầu '${nameRequest}' đã được chấp nhận.`
          : reason
          ? `Khách hàng từ chối báo giá yêu cầu '${nameRequest}'. Lý do: ${reason}`
          : `Khách hàng từ chối báo giá yêu cầu '${nameRequest}'.`;

      const notiType =
        action === "accept" ? "quote_approved" : "quote_rejected";

      // ================================
      // 🔔 Gửi thông báo ADMIN
      // ================================
      await sendNotificationToAdmins({
        title,
        body,
        data: {
          type: notiType,
          request_id: String(request_id),
          url: `/requests/${request_id}`,
        },
      });

      // ================================
      // 🔔 Gửi thông báo THỢ
      // ================================
      if (technicianId) {
        await sendNotification({
          userId: technicianId,
          title,
          body,
          data: {
            type: notiType,
            request_id: String(request_id),
            url: `/request/${request_id}`,
          },
        });
      }

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
      const userId = req.user.id;
      const role = req.user.role; // technician | customer | admin
      const { request_id, items = [], reason } = req.body;

      if (!request_id)
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Thiếu request_id",
        });

      if (!Array.isArray(items) || items.length === 0)
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Danh sách items không hợp lệ",
        });

      // === Cập nhật database ===
      const result = await RequestModel.updateItemProgress({
        request_id,
        technician_id: userId,
        items,
      });

      // ===== Lấy thông tin request để gửi noti =====
      const request = await RequestModel.getRequestDetail(request_id);
      const customerId = request?.customer?.id;
      const technicianId = request?.technician?.id;
      // ===== CHECK QUYỀN NGƯỜI DÙNG =====
      // Technician chỉ được update request mà họ được gán
      if (role === "technician" && technicianId !== userId) {
        return baseResponse(res, {
          code: 403,
          status: false,
          message: "Bạn không có quyền cập nhật tiến độ đầu việc này.",
        });
      }

      // Customer chỉ được update request của chính họ
      if (role === "customer" && customerId !== userId) {
        return baseResponse(res, {
          code: 403,
          status: false,
          message: "Bạn không có quyền cập nhật đầu việc của yêu cầu này.",
        });
      }

      // Admin thì bypass, không cần check

      // ===== Chuẩn bị message theo từng item =====
      const updates = items
        .map((it) => {
          if (it.status === "completed")
            return `Đầu việc "${it.name}" đã hoàn thành.`;

          if (it.status === "in_progress")
            return `Đầu việc "${it.name}" đang được tiếp tục.`;

          return `Đầu việc "${it.name}" đã cập nhật trạng thái: ${it.status}`;
        })
        .join(" ");

      // Nếu khách trả lại (completed → in_progress)
      const revertMessage = reason
        ? `Khách hàng yêu cầu làm lại: ${reason}`
        : null;

      const title =
        role === "technician"
          ? "Thợ đã cập nhật tiến độ"
          : role === "customer"
          ? "Khách hàng đã cập nhật tiến độ"
          : "Admin đã cập nhật tiến độ";

      const body = revertMessage ? revertMessage : updates;

      // =============== GỬI NOTI TÙY ROLE ===============

      // 1) Nếu thợ cập nhật → gửi cho khách + admin
      if (role === "technician") {
        console.log("vao 2");
        if (customerId) {
          await sendNotification({
            userId: customerId,
            title,
            body,
            data: {
              type: "report_job",
              request_id: String(request_id),
              url: `/report/${request_id}`,
            },
          });
        }

        await sendNotificationToAdmins({
          title,
          body,
          data: {
            type: "report_job",
            request_id: String(request_id),
            url: `/requests/${request_id}`,
          },
        });
      }

      // 2) Nếu khách cập nhật → gửi cho thợ + admin
      if (role === "customer") {
        console.log("vao 1");

        if (technicianId) {
          await sendNotification({
            userId: technicianId,
            title,
            body,
            data: {
              type: "report_job",
              request_id: String(request_id),
              url: `/report/${request_id}`,
            },
          });
        }

        await sendNotificationToAdmins({
          title,
          body,
          data: {
            type: "report_job",
            request_id: String(request_id),
            url: `/requests/${request_id}`,
          },
        });
      }

      // 3) Nếu admin cập nhật → gửi cho cả 2
      if (role === "admin") {
        if (technicianId) {
          await sendNotification({
            userId: technicianId,
            title,
            body,
            data: {
              type: "report_job",
              request_id: String(request_id),
              url: `/report/${request_id}`,
            },
          });
        }
        if (customerId) {
          await sendNotification({
            userId: customerId,
            title,
            body,
            data: {
              type: "report_job",
              request_id: String(request_id),
              url: `/report/${request_id}`,
            },
          });
        }
      }

      // =============== RESPONSE ===============
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

      // --- Lấy thông tin request để kiểm tra quyền ---
      const request = await RequestModel.getRequestDetail(request_id);

      if (!request) {
        return baseResponse(res, {
          code: 404,
          status: false,
          message: "Không tìm thấy yêu cầu",
        });
      }

      const customerId = request?.customer?.id;

      // ===============================
      // ❌ Kiểm tra quyền
      // ===============================
      if (String(userId) !== String(customerId)) {
        return baseResponse(res, {
          code: 403,
          status: false,
          message: "Bạn không có quyền hoàn thành yêu cầu này",
        });
      }

      // ===============================
      // 🔹 Cập nhật trạng thái completed
      // ===============================
      const result = await RequestModel.setCompleted({
        request_id,
        user_id: userId,
      });

      const technicianId = request?.technician?.id;
      const nameRequest = request?.name_request || "";

      const title = "Yêu cầu đã hoàn thành";
      const body = `Khách hàng đã đánh dấu hoàn thành cho yêu cầu: ${nameRequest}`;

      // ===============================
      // 🟢 NOTI CHO ADMIN
      // ===============================
      await sendNotificationToAdmins({
        title,
        body,
        data: {
          type: "accept_inspection",
          request_id: String(request_id),
          url: `/requests/${request_id}`,
        },
      });

      // ===============================
      // 🟢 NOTI CHO THỢ
      // ===============================
      if (technicianId) {
        await sendNotification({
          userId: technicianId,
          title,
          body,
          data: {
            type: "accept_inspection",
            request_id: String(request_id),
            url: `/request/${request_id}`,
          },
        });
      }

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
