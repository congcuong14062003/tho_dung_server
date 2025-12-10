import db from "../config/db.js";
import { generateId } from "../utils/crypto.js";

export const UserModel = {
  async findByPhone(phone) {
    const [rows] = await db.query("SELECT * FROM users WHERE phone = ?", [
      phone,
    ]);
    return rows[0];
  },

  // 🔹 Tạo user mới
  async createUser({
    fullname,
    phone,
    idcard,
    password,
    verified,
    otp_code,
    otp_expiry,
  }) {
    // sinh ID ngẫu nhiên
    const userId = generateId("USR_");

    await db.query(
      `INSERT INTO users (id, full_name, id_card, phone, password_hash, verified, otp_code, otp_expiry)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        fullname,
        idcard,
        phone,
        password,
        verified,
        otp_code,
        otp_expiry,
      ]
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

  // cập nhật người dùng
  async updateUser(id, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    if (keys.length === 0) return;

    const setClause = keys.map((key) => `${key} = ?`).join(", ");
    await db.query(`UPDATE users SET ${setClause} WHERE id = ?`, [
      ...values,
      id,
    ]);
  },

  // danh sách khách hàng có phân trang
  async getAllCustomer({ keySearch, status, page, size }) {
    const limit = Number(size) || 10;
    const offset = (Number(page) - 1) * limit;

    let baseSql = `
    FROM users
    WHERE 1 = 1 
      AND role = "customer"
  `;

    const params = [];
    const paramsCount = [];

    // --------------------- SEARCH ---------------------
    if (keySearch) {
      baseSql += ` AND (full_name LIKE ? OR phone LIKE ? OR id LIKE ?)`;
      params.push(`%${keySearch}%`, `%${keySearch}%`, `%${keySearch}%`);
      paramsCount.push(`%${keySearch}%`, `%${keySearch}%`, `%${keySearch}%`);
    }

    // --------------------- STATUS FILTER ---------------------
    if (status && status !== "all") {
      baseSql += ` AND status = ?`;
      params.push(status);
      paramsCount.push(status);
    }

    // --------------------- TOTAL RECORD ---------------------
    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total ${baseSql}`,
      paramsCount
    );
    const totalRecord = countRows[0]?.total || 0;

    // --------------------- DATA QUERY ---------------------
    const sql = `
    SELECT id, full_name, phone, id_card, avatar_link, status
    ${baseSql}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `;

    params.push(limit, offset);

    const [rows] = await db.query(sql, params);

    return {
      page,
      size,
      totalRecord,
      totalPages: Math.ceil(totalRecord / limit),
      data: rows,
    };
  },
  // cập nhật avatar
  async updateAvatar(userId, avatarPath) {
    const [result] = await db.query(
      "UPDATE users SET avatar_link = ?, updated_at = NOW() WHERE id = ?",
      [avatarPath, userId]
    );
    return result.affectedRows > 0;
  },

  async updateStatus(id, status) {
    const [result] = await db.query(
      "UPDATE users SET status = ?, updated_at = NOW() WHERE id = ?",
      [status, id]
    );
    return result.affectedRows > 0;
  },

  async findAdmins() {
    const [rows] = await db.query(`SELECT id FROM users WHERE role = 'admin'`);
    return rows; // [{id:1}, {id:5}, ...]
  },

  async getUserWithPassword(id) {
    const [rows] = await db.query(
      `SELECT id, full_name, phone, password_hash 
     FROM users WHERE id = ?`,
      [id]
    );
    return rows[0] || null;
  },
  async updateUserPassword(id, passwordHash) {
    const [result] = await db.query(
      `UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?`,
      [passwordHash, id]
    );
    return result.affectedRows > 0;
  },
};
