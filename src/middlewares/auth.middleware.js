import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { baseResponse } from "../utils/response.helper.js";

dotenv.config();

/**
 * Middleware kiểm tra token hợp lệ
 */
export function verifyToken(req, res, next) {
  try {
    let token = null;

    // Lấy token từ header Authorization
    const authHeader = req.headers.authorization;
    if (authHeader) {
      token = authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : authHeader;
    }

    // Nếu không có trong header, thử query hoặc body
    if (!token && req.query.token) token = req.query.token;
    if (!token && req.body?.token) token = req.body.token;

    // Nếu vẫn không có => lỗi
    if (!token) {
      return baseResponse(res, {
        code: 401,
        status: false,
        message: "Thiếu token xác thực",
      });
    }

    // Xác minh token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
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
export function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return baseResponse(res, {
        code: 401,
        status: false,
        message: "Chưa xác thực",
      });
    }

    if (!roles.includes(req.user.role)) {
      return baseResponse(res, {
        code: 403,
        status: false,
        message: "Bạn không có quyền truy cập!",
      });
    }

    next();
  };
}
