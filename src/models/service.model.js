import db from "../config/db.js";
import { generateId } from "../utils/crypto.js";

export const ServiceModel = {
  // 👈 Update: Thêm OR id LIKE ? vào filter
  async getByCategory(categoryId, keySearch = "") {
    let query = `
      SELECT * FROM services
      WHERE status = 1 AND category_id = ?
    `;

    const params = [categoryId];

    if (keySearch) {
      query += ` AND (name LIKE ? OR description LIKE ? OR id LIKE ?)`;
      params.push(`%${keySearch}%`, `%${keySearch}%`, `%${keySearch}%`);
    }

    query += ` ORDER BY created_at DESC`;

    const [rows] = await db.query(query, params);
    return rows;
  },

  // 👈 Update tương tự cho getAll (dùng khi category="all")
  async getAll(keySearch = "") {
    let query = `
      SELECT *
      FROM services
      WHERE status = 1
    `;

    const params = [];

    if (keySearch) {
      query += ` AND (name LIKE ? OR description LIKE ? OR id LIKE ?)`;
      params.push(`%${keySearch}%`, `%${keySearch}%`, `%${keySearch}%`);
    }

    query += ` ORDER BY created_at DESC`;

    const [rows] = await db.query(query, params);
    return rows;
  },

  // Lấy dịch vụ theo ID
  async getById(id) {
    const [rows] = await db.query(
      "SELECT * FROM services WHERE id = ? AND status = 1",
      [id]
    );
    return rows[0];
  },

  // Kiểm tra tên dịch vụ trùng trong cùng danh mục
  async getByNameInCategory(name, categoryId) {
    const [rows] = await db.query(
      "SELECT * FROM services WHERE name = ? AND category_id = ? AND status = 1",
      [name, categoryId]
    );
    return rows[0];
  },

  // Tạo mới
  async create({ category_id, name, description, base_price }) {
    const id = generateId("SER_");
    const [result] = await db.query(
      "INSERT INTO services (id, category_id, name, description, base_price) VALUES (?, ?, ?, ?, ?)",
      [id, category_id, name, description || "", base_price || 0]
    );
    return result.insertId;
  },

  // Cập nhật
  async update(id, { name, description, base_price, category_id }) {
    const [result] = await db.query(
      "UPDATE services SET name=?, description=?, base_price=?, category_id=? WHERE id=?",
      [name, description || "", base_price || 0, category_id, id]
    );
    return result.affectedRows;
  },

  // Xóa (chỉ gán status = 0)
  async delete(id) {
    const [result] = await db.query(
      "UPDATE services SET status = 0 WHERE id = ?",
      [id]
    );
    return result.affectedRows;
  },
};
