import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export const generateToken = (user, expiresIn = "7d") => {
  const payload = {
    id: user.id,
    phone: user.phone,
    role: user.role,
    username: user.full_name,
  };

  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};
