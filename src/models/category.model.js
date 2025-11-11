import db from "../config/db.js";
import { generateId } from "../utils/crypto.js";

export const CategoryModel = {
  // Lấy tất cả danh mục cha
  async getAll() {
    const [rows] = await db.query(
      "SELECT * FROM service_categories WHERE status = 1 ORDER BY `order` ASC"
    );
    return rows;
  },

  // Lấy có phân trang
  async getPaginated({ keySearch = "", limit, offset }) {
    const searchQuery = `%${keySearch}%`;

    const [data] = await db.query(
      `SELECT id, name, description, icon, status, color
     FROM service_categories
     WHERE status = 1 
       AND (
         id LIKE ? 
         OR name LIKE ? 
         OR description LIKE ?
       )
     ORDER BY \`order\` ASC
     LIMIT ? OFFSET ?`,
      [searchQuery, searchQuery, searchQuery, limit, offset]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total 
     FROM service_categories 
     WHERE status = 1 
       AND (
         id LIKE ? 
         OR name LIKE ? 
         OR description LIKE ?
       )`,
      [searchQuery, searchQuery, searchQuery]
    );

    return { data, total };
  },
  // Lấy danh mục theo ID
  async getById(id) {
    const [rows] = await db.query(
      "SELECT * FROM service_categories WHERE id = ? AND status = 1",
      [id]
    );
    return rows[0];
  },

  // Kiểm tra trùng tên (trừ chính nó)
  async checkNameExists(name, excludeId = null) {
    let query =
      "SELECT id FROM service_categories WHERE name = ? AND status = 1";
    const params = [name];

    if (excludeId) {
      query += " AND id != ?";
      params.push(excludeId);
    }

    const [rows] = await db.query(query, params);
    return rows.length > 0;
  },

  // ✅ Thêm mới (admin)
  async create({ name, description, icon }) {
    const id = generateId("CAT_"); // sinh ID chuỗi dạng CAT_xxxxxxxx
    const [result] = await db.query(
      "INSERT INTO service_categories (id, name, description, color, icon) VALUES (?, ?, ?, ?, ?)",
      [id, name, description || "", color, icon || null]
    );
    return result.insertId;
  },

  // ✅ Cập nhật danh mục
  async update(id, { name, description, color, icon }) {
    // Cập nhật động (bỏ qua field null)
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

    if (fields.length === 0) return 0;

    values.push(id);

    const [result] = await db.query(
      `UPDATE service_categories SET ${fields.join(", ")} WHERE id = ?`,
      values
    );
    return result.affectedRows;
  },

  // Xóa danh mục (chuyển status = 0)
  async delete(id) {
    const [result] = await db.query(
      "UPDATE service_categories SET status = 0 WHERE id = ?",
      [id]
    );
    return result.affectedRows;
  },

  // Lấy danh sách service theo category_id
  async getServicesByCategory(categoryId) {
    const [rows] = await db.query(
      "SELECT * FROM services WHERE category_id = ? ORDER BY id ASC",
      [categoryId]
    );
    return rows;
  },
};
