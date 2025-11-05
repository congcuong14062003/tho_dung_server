import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

/**
 * Middleware kiểm tra token hợp lệ
 */
export function verifyToken(req, res, next) {
  try {
    let token = null;

    // 1️⃣ Lấy từ header Authorization
    const authHeader = req.headers.authorization;
    console.log("authHeader: ", authHeader);
    
    if (authHeader) {
      // Nếu header có "Bearer " ở đầu thì cắt ra, còn không thì lấy luôn
      token = authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : authHeader;
    }

    // 2️⃣ Nếu không có trong header, thử query hoặc body
    if (!token && req.query.token) token = req.query.token;
    if (!token && req.body?.token) token = req.body.token;

    // 3️⃣ Nếu vẫn không có => lỗi
    if (!token) {
      return res.status(401).json({
        code: 401,
        status: false,
        message: "Thiếu token xác thực",
      });
    }

    // 4️⃣ Xác minh token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Token verify error:", error.message);
    return res.status(401).json({
      code: 401,
      status: false,
      message: "Token không hợp lệ hoặc đã hết hạn",
    });
  }
}

/**
 * Middleware phân quyền theo role
 * @param {...string} roles - Danh sách các role được phép
 */
export function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        code: 401,
        status: false,
        message: "Chưa xác thực",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        code: 403,
        status: false,
        message: "Bạn không có quyền truy cập tài nguyên này",
      });
    }

    next();
  };
}
