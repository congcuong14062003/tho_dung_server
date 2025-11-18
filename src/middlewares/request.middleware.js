// src/middlewares/request.middleware.js
import { RequestModel } from "../models/request.model.js";

export const canViewRequestDetail = async (req, res, next) => {
  try {
    const request = await RequestModel.getRequestDetail(req.params.id);
    if (!request) {
      return res.status(404).json({ status: false, message: "Không tìm thấy yêu cầu" });
    }

    const allowed =
      req.user.role === "admin" ||
      request.customer.id === req.user.id ||
      request.technician?.id === req.user.id;

    if (!allowed) {
      return res.status(403).json({ status: false, message: "Bạn không có quyền xem yêu cầu này" });
    }

    // Gắn vào req để controller dùng lại (nếu cần)
    req.requestDetail = request;
    next();
  } catch (error) {
    return res.status(500).json({ status: false, message: "Lỗi server" });
  }
};