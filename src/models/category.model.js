import db from "../config/db.js";
import { generateId } from "../utils/crypto.js";

export const CategoryModel = {
  // ===============================
  // 🔹 Lấy tất cả danh mục active (cho khách hàng)
  // ===============================
  async getActiveCategories() {
    const [rows] = await db.query(
      `SELECT id, name, description, color, icon 
       FROM service_categories 
       WHERE status = 'active'
       ORDER BY \`order\` ASC`
    );
    return rows;
  },

  // ===============================
  // 🔹 Lấy danh mục phân trang (Admin)
  // ===============================
  async getPaginated({ keySearch = "", status = "", limit, offset }) {
    const search = `%${keySearch}%`;

    let where = "(id LIKE ? OR name LIKE ? OR description LIKE ?)";
    if (status && status.trim() !== "all") {
      where += " AND status = ?";
    }

    const params = [search, search, search];
    if (status && status.trim() !== "all") params.push(status);
    params.push(limit, offset);

    const [data] = await db.query(
      `SELECT id, name, description, icon, status, color
       FROM service_categories
       WHERE ${where}
       ORDER BY \`order\` ASC
       LIMIT ? OFFSET ?`,
      params
    );

    const countParams = [search, search, search];
    if (status && status.trim() !== "all") countParams.push(status);

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total
       FROM service_categories
       WHERE ${where}`,
      countParams
    );

    return { data, total };
  },

  // ===============================
  // 🔹 Lấy danh mục theo ID
  // ===============================
  async getById(id) {
    const [rows] = await db.query(
      "SELECT * FROM service_categories WHERE id = ?",
      [id]
    );
    return rows[0];
  },

  // ===============================
  // 🔹 Lấy danh mục hoạt động theo ID
  // ===============================
  async getByIdActive(id) {
    const [rows] = await db.query(
      "SELECT * FROM service_categories WHERE id = ? and status = 'active'",
      [id]
    );
    return rows[0];
  },

  // ===============================
  // 🔹 Kiểm tra trùng tên
  // ===============================
  async checkNameExists(name, excludeId = null) {
    let query =
      "SELECT id FROM service_categories WHERE name = ? AND status != 0";
    const params = [name];
    if (excludeId) {
      query += " AND id != ?";
      params.push(excludeId);
    }
    const [rows] = await db.query(query, params);
    return rows.length > 0;
  },

  // ===============================
  // 🔹 Tạo danh mục mới
  // ===============================
  async create({ name, description, color, icon, status }) {
    const id = generateId("CAT_");
    await db.query(
      "INSERT INTO service_categories (id, name, description, color, icon, status) VALUES (?, ?, ?, ?, ?, ?)",
      [id, name, description || "", color, icon || null, status || "active"]
    );
    return id;
  },

  // ===============================
  // 🔹 Cập nhật danh mục (Admin)
  // ===============================
  async update(id, { name, description, color, icon, status }) {
    const fields = [];
    const values = [];

    if (name !== undefined) {
      fields.push("name = ?");
      values.push(name);
    }
    if (description !== undefined) {
      fields.push("description = ?");
      values.push(description);
    }
    if (icon !== undefined) {
      fields.push("icon = ?");
      values.push(icon);
    }
    if (color !== undefined) {
      fields.push("color = ?");
      values.push(color);
    }
    if (status !== undefined) {
      fields.push("status = ?");
      values.push(status);
    }

    if (fields.length === 0) return 0;

    values.push(id);

    const [result] = await db.query(
      `UPDATE service_categories SET ${fields.join(", ")} WHERE id = ?`,
      values
    );
    return result.affectedRows;
  },

  // ===============================
  // 🔹 Xóa danh mục (Admin) - chuyển status = 0
  // ===============================
  async delete(id) {
    const [result] = await db.query(
      "UPDATE service_categories SET status = 0 WHERE id = ?",
      [id]
    );
    return result.affectedRows;
  },
};
