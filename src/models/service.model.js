import db from "../config/db.js";
import { generateId } from "../utils/crypto.js";

export const ServiceModel = {
  // ===============================
  // 🔹 Lấy dịch vụ theo categoryId (status = 1)
  // ===============================
  async getByCategory(categoryId, keySearch = "", limit, offset) {
    let query = `SELECT * FROM services WHERE status = 1 AND category_id = ?`;
    const params = [categoryId];

    if (keySearch) {
      query += ` AND (name LIKE ? OR description LIKE ? OR id LIKE ?)`;
      params.push(`%${keySearch}%`, `%${keySearch}%`, `%${keySearch}%`);
    }

    if (limit !== undefined && offset !== undefined) {
      query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);
    } else {
      query += ` ORDER BY created_at DESC`;
    }

    const [rows] = await db.query(query, params);
    return rows;
  },

  // ===============================
  // 🔹 Đếm tổng dịch vụ (status = 1)
  // ===============================
  async countByCategory(categoryId, keySearch = "") {
    let query = `SELECT COUNT(*) AS total FROM services WHERE status = 1 AND category_id = ?`;
    const params = [categoryId];

    if (keySearch) {
      query += ` AND (name LIKE ? OR description LIKE ? OR id LIKE ?)`;
      params.push(`%${keySearch}%`, `%${keySearch}%`, `%${keySearch}%`);
    }

    const [rows] = await db.query(query, params);
    return rows[0].total;
  },

  async getAll(keySearch = "", limit, offset) {
    let query = `SELECT * FROM services WHERE status = 1`;
    const params = [];

    if (keySearch) {
      query += ` AND (name LIKE ? OR description LIKE ? OR id LIKE ?)`;
      params.push(`%${keySearch}%`, `%${keySearch}%`, `%${keySearch}%`);
    }

    if (limit !== undefined && offset !== undefined) {
      query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);
    } else {
      query += ` ORDER BY created_at DESC`;
    }

    const [rows] = await db.query(query, params);
    return rows;
  },

  async countAll(keySearch = "") {
    let query = `SELECT COUNT(*) AS total FROM services WHERE status = 1`;
    const params = [];

    if (keySearch) {
      query += ` AND (name LIKE ? OR description LIKE ? OR id LIKE ?)`;
      params.push(`%${keySearch}%`, `%${keySearch}%`, `%${keySearch}%`);
    }

    const [rows] = await db.query(query, params);
    return rows[0].total;
  },

  async getById(id) {
    const [rows] = await db.query(`SELECT * FROM services WHERE id = ? AND status = 1`, [id]);
    return rows[0];
  },

  async getByNameInCategory(name, categoryId) {
    const [rows] = await db.query(
      "SELECT * FROM services WHERE name = ? AND category_id = ? AND status = 1",
      [name, categoryId]
    );
    return rows[0];
  },

  async create({ category_id, name, description, base_price }) {
    const id = generateId("SER_");
    await db.query(
      "INSERT INTO services (id, category_id, name, description, base_price) VALUES (?, ?, ?, ?, ?)",
      [id, category_id, name, description || "", base_price || 0]
    );
    return id;
  },

  async update(id, { name, description, base_price, category_id }) {
    const fields = [];
    const values = [];

    if (name !== undefined) { fields.push("name = ?"); values.push(name); }
    if (description !== undefined) { fields.push("description = ?"); values.push(description); }
    if (base_price !== undefined) { fields.push("base_price = ?"); values.push(base_price); }
    if (category_id !== undefined) { fields.push("category_id = ?"); values.push(category_id); }

    if (fields.length === 0) return 0;

    values.push(id);

    const [result] = await db.query(`UPDATE services SET ${fields.join(", ")} WHERE id = ?`, values);
    return result.affectedRows;
  },

  async delete(id) {
    const [result] = await db.query(`UPDATE services SET status = 0 WHERE id = ?`, [id]);
    return result.affectedRows;
  },
};
