import db from "../config/db.js";
import { generateId } from "../utils/crypto.js";

export const UserModel = {
  async findByPhone(phone) {
    const [rows] = await db.query("SELECT * FROM users WHERE phone = ?", [phone]);
    return rows[0];
  },

  // 🔹 Tạo user mới
  async createUser({
    fullname,
    phone,
    idcard,
    password,
    role,
    verified,
    otp_code,
    otp_expiry,
  }) {
    // sinh ID ngẫu nhiên
    const userId = generateId("USR_");

    await db.query(
      `INSERT INTO users (id, full_name, id_card, phone, password_hash, role, verified, otp_code, otp_expiry)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, fullname, idcard, phone, password, role, verified, otp_code, otp_expiry]
    );

    return userId;
  },

  async getById(id) {
    const [rows] = await db.query("SELECT * FROM users WHERE id = ?", [id]);
    return rows[0];
  },

  async getUserById(userId) {
    const [rows] = await db.query(
      `SELECT id, full_name, phone, id_card, avatar_link, role
       FROM users
       WHERE id = ?`,
      [userId]
    );
    return rows[0] || null;
  },

  async updateUser(id, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    if (keys.length === 0) return;

    const setClause = keys.map((key) => `${key} = ?`).join(", ");
    await db.query(`UPDATE users SET ${setClause} WHERE id = ?`, [...values, id]);
  },

  async updateAvatar(userId, avatarPath) {
    const [result] = await db.query(
      "UPDATE users SET avatar_link = ?, updated_at = NOW() WHERE id = ?",
      [avatarPath, userId]
    );
    return result.affectedRows > 0;
  },
};
