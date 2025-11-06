import pool from "../config/db.js";

export const ServiceModel = {
  // Lấy tất cả dịch vụ của 1 danh mục
  async getByCategory(categoryId) {
    const [rows] = await pool.query(
      "SELECT * FROM services WHERE category_id = ? AND status = 1 ORDER BY id ASC",
      [categoryId]
    );
    return rows;
  },

  // Lấy dịch vụ theo ID
  async getById(id) {
    const [rows] = await pool.query(
      "SELECT * FROM services WHERE id = ? AND status = 1",
      [id]
    );
    return rows[0];
  },

  // Kiểm tra tên dịch vụ trùng trong cùng danh mục
  async getByNameInCategory(name, categoryId) {
    const [rows] = await pool.query(
      "SELECT * FROM services WHERE name = ? AND category_id = ? AND status = 1",
      [name, categoryId]
    );
    return rows[0];
  },

  // Tạo mới
  async create({ category_id, name, description, base_price }) {
    const [result] = await pool.query(
      "INSERT INTO services (category_id, name, description, base_price) VALUES (?, ?, ?, ?)",
      [category_id, name, description || "", base_price || 0]
    );
    return result.insertId;
  },

  // Cập nhật
  async update(id, { name, description, base_price }) {
    const [result] = await pool.query(
      "UPDATE services SET name=?, description=?, base_price=? WHERE id=?",
      [name, description, base_price, id]
    );
    return result.affectedRows;
  },

  // Xóa (chỉ gán status = 0)
  async delete(id) {
    const [result] = await pool.query(
      "UPDATE services SET status = 0 WHERE id = ?",
      [id]
    );
    return result.affectedRows;
  },
};
