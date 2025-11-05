import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "secret_key";
const JWT_EXPIRES = "7d"; // Token sống 7 ngày

// 🧩 Tạo token sau khi đăng nhập / đăng ký
export const generateToken = (user) => {
  const payload = {
    id: user.id,
    phone: user.phone,
    role: user.role,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
};

// 🧠 Xác thực token (middleware dùng trong route bảo vệ)
export const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (err) {
    return null;
  }
};

// 🔒 Middleware xác thực token trong request
export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // "Bearer <token>"

  if (!token) {
    return res.status(401).json({ message: "Không có token, vui lòng đăng nhập." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // lưu thông tin user vào req
    next();
  } catch (err) {
    return res.status(403).json({ message: "Token không hợp lệ hoặc đã hết hạn." });
  }
};

// 🧩 Middleware phân quyền theo role
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Bạn không có quyền truy cập." });
    }
    next();
  };
};
