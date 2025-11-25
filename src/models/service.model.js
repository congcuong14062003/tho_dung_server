import db from "../config/db.js";
import { generateId } from "../utils/crypto.js";

export const ServiceModel = {
  // ===========================================================
  // 🔹 Lấy danh sách dịch vụ active theo danh mục
  // ===========================================================
  async getActiveByCategory(categoryId) {
    const query = `
    SELECT s.*, c.name AS category_name
    FROM services s
    JOIN service_categories c ON s.category_id = c.id
    WHERE s.category_id = ?
      AND s.status = 'active'
    ORDER BY s.created_at DESC
  `;

    const [rows] = await db.query(query, [categoryId]);
    return rows;
  },
  // ===========================================================
  // 🔹 Lấy danh sách dịch vụ theo categoryId + search + status + phân trang
  // ===========================================================
  async getByCategory(
    categoryId,
    keySearch = "",
    status = "all",
    limit,
    offset
  ) {
    let query = `
    SELECT s.*, c.name AS category_name
    FROM services s
    JOIN service_categories c ON s.category_id = c.id
    WHERE s.category_id = ?
  `;
    const params = [categoryId];

    if (status && status !== "all") {
      query += ` AND s.status = ?`;
      params.push(status);
    }

    if (keySearch) {
      query += ` AND (s.name LIKE ? OR s.description LIKE ? OR s.id LIKE ?)`;
      params.push(`%${keySearch}%`, `%${keySearch}%`, `%${keySearch}%`);
    }

    query += ` ORDER BY s.created_at DESC`;

    if (limit !== undefined && offset !== undefined) {
      query += ` LIMIT ? OFFSET ?`;
      params.push(limit, offset);
    }

    const [rows] = await db.query(query, params);
    return rows;
  },

  // ===========================================================
  // 🔹 Đếm tổng số dịch vụ theo categoryId
  // ===========================================================
  async countByCategory(categoryId, keySearch = "", status = "all") {
    let query = `
      SELECT COUNT(*) AS total 
      FROM services s 
      WHERE s.category_id = ?
    `;
    const params = [categoryId];

    if (status && status !== "all") {
      query += ` AND s.status = ?`;
      params.push(status);
    }

    if (keySearch) {
      query += ` AND (s.name LIKE ? OR s.description LIKE ? OR s.id LIKE ?)`;
      params.push(`%${keySearch}%`, `%${keySearch}%`, `%${keySearch}%`);
    }

    const [rows] = await db.query(query, params);
    return rows[0].total;
  },

  // ===========================================================
  // 🔹 Lấy toàn bộ dịch vụ
  // ===========================================================
  async getAll(keySearch = "", status = "all", limit, offset) {
    let query = `
      SELECT s.*, c.name AS category_name
      FROM services s
      JOIN service_categories c ON s.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== "all") {
      query += ` AND s.status = ?`;
      params.push(status);
    }

    if (keySearch) {
      query += ` AND (s.name LIKE ? OR s.description LIKE ? OR s.id LIKE ?)`;
      params.push(`%${keySearch}%`, `%${keySearch}%`, `%${keySearch}%`);
    }

    query += ` ORDER BY s.created_at DESC`;

    if (limit !== undefined && offset !== undefined) {
      query += ` LIMIT ? OFFSET ?`;
      params.push(limit, offset);
    }

    const [rows] = await db.query(query, params);
    return rows;
  },

  // ===========================================================
  // 🔹 Đếm tổng số dịch vụ
  // ===========================================================
  async countAll(keySearch = "", status = "all") {
    let query = `
      SELECT COUNT(*) AS total 
      FROM services s
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== "all") {
      query += ` AND s.status = ?`;
      params.push(status);
    }

    if (keySearch) {
      query += ` AND (s.name LIKE ? OR s.description LIKE ? OR s.id LIKE ?)`;
      params.push(`%${keySearch}%`, `%${keySearch}%`, `%${keySearch}%`);
    }

    const [rows] = await db.query(query, params);
    return rows[0].total;
  },

  // ===========================================================
  // 🔹 Lấy chi tiết dịch vụ
  // ===========================================================
  async getById(id) {
    const [rows] = await db.query(`SELECT * FROM services WHERE id = ?`, [id]);
    return rows[0];
  },

  // ===========================================================
  // 🔹 Kiểm tra trùng tên trong cùng category
  // ===========================================================
  async getByNameInCategory(name, categoryId) {
    const [rows] = await db.query(
      "SELECT * FROM services WHERE name = ? AND category_id = ?",
      [name, categoryId]
    );
    return rows[0];
  },

  // ===========================================================
  // 🔹 Tạo dịch vụ
  // ===========================================================
  async create({ category_id, name, description, base_price, status }) {
    const id = generateId("SER_");

    await db.query(
      `INSERT INTO services (id, category_id, name, description, base_price, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        category_id,
        name,
        description || "",
        base_price || 0,
        status || "active",
      ]
    );

    return id;
  },

  // ===========================================================
  // 🔹 Cập nhật dịch vụ
  // ===========================================================
  async update(id, { name, description, base_price, category_id, status }) {
    const fields = [];
    const values = [];

    if (name !== undefined) fields.push("name = ?"), values.push(name);
    if (description !== undefined)
      fields.push("description = ?"), values.push(description);
    if (base_price !== undefined)
      fields.push("base_price = ?"), values.push(base_price);
    if (category_id !== undefined)
      fields.push("category_id = ?"), values.push(category_id);
    if (status !== undefined) fields.push("status = ?"), values.push(status);

    if (fields.length === 0) return 0;

    values.push(id);

    const [result] = await db.query(
      `UPDATE services SET ${fields.join(", ")} WHERE id = ?`,
      values
    );

    return result.affectedRows;
  },
};
