import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { baseResponse } from "../utils/response.helper.js";
import { UserModel } from "../models/user.model.js";

dotenv.config();

/**
 * Middleware kiểm tra token hợp lệ
 */
export function verifyToken(req, res, next) {
  try {
    let token = null;

    // Lấy token từ Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader) {
      token = authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : authHeader;
    }

    // Thử lấy token từ query hoặc body
    if (!token) token = req.query.token;
    if (!token) token = req.body?.token;

    if (!token) {
      return baseResponse(res, {
        code: 401,
        status: false,
        message: "Thiếu token xác thực",
      });
    }

    // Xác minh token (verify sẽ tự throw lỗi nếu token sai)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded; // Chỉ cần gán decoded
    next();
  } catch (error) {
    console.error("Token verify error:", error.message);
    return baseResponse(res, {
      code: 401,
      status: false,
      message: "Token không hợp lệ hoặc đã hết hạn",
    });
  }
}

/**
 * Middleware phân quyền theo role
 * @param {...string} roles - Danh sách role được phép
 */
export function authorizeRoles(...allowedRoles) {
  return async (req, res, next) => {
    try {
      // Chưa có user => chưa verify token
      if (!req.user?.id) {
        return baseResponse(res, {
          code: 401,
          status: false,
          message: "Chưa xác thực",
        });
      }

      // Lấy user từ DB
      const user = await UserModel.getById(req.user.id);

      if (!user) {
        return baseResponse(res, {
          code: 404,
          status: false,
          message: "Tài khoản không tồn tại",
        });
      }

      // Kiểm tra role trong DB
      if (!allowedRoles.includes(user.role)) {
        return baseResponse(res, {
          code: 403,
          status: false,
          message: "Bạn không có quyền truy cập",
        });
      }

      // Lưu thông tin user DB vào req nếu cần sử dụng tiếp
      req.dbUser = user;

      next();
    } catch (error) {
      console.error("Authorize error:", error);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi phân quyền",
      });
    }
  };
}
