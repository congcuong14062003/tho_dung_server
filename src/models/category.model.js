import pool from "../config/db.js";

export const CategoryModel = {
  // Lấy tất cả danh mục cha
  async getAll() {
    const [rows] = await pool.query(
      "SELECT * FROM service_categories WHERE status = 1 ORDER BY order ASC"
    );
    return rows;
  },

  async getPaginated({ keySearch = "", limit, offset }) {
    const searchQuery = `%${keySearch}%`;

    const [data] = await pool.query(
      `SELECT id, name, description, icon, status
       FROM service_categories
       WHERE status = 1 AND name LIKE ?
       ORDER BY \`order\` ASC
       LIMIT ? OFFSET ?`,
      [searchQuery, limit, offset]
    );
    
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total 
       FROM service_categories 
       WHERE status = 1 AND name LIKE ?`,
      [searchQuery]
    );

    return { data, total };
  },
  // Lấy danh mục theo ID
  async getById(id) {
    const [rows] = await pool.query(
      "SELECT * FROM service_categories WHERE id = ? and status = 1",
      [id]
    );
    return rows[0];
  },

  // Kiểm tra danh mục theo tên
  async getByName(name) {
    const [rows] = await pool.query(
      "SELECT * FROM service_categories WHERE name = ? AND status = 1",
      [name]
    );
    return rows[0];
  },

  // Thêm mới (admin)
  async create({ name, description, icon }) {
    const [result] = await pool.query(
      "INSERT INTO service_categories (name, description, icon) VALUES (?, ?, ?)",
      [name, description || "", icon || null]
    );
    return result.insertId;
  },

  // Cập nhật danh mục
  async update(id, { name, description, icon }) {
    const [result] = await pool.query(
      "UPDATE service_categories SET name=?, description=?, icon=? WHERE id=?",
      [name, description, icon, id]
    );
    return result.affectedRows;
  },

  // Xóa danh mục
  async delete(id) {
    const [result] = await pool.query(
      "UPDATE service_categories SET status = 0 WHERE id = ?",
      [id]
    );
    return result.affectedRows;
  },

  // Lấy danh sách service theo category_id
  async getServicesByCategory(categoryId) {
    const [rows] = await pool.query(
      "SELECT * FROM services WHERE category_id = ? ORDER BY id ASC",
      [categoryId]
    );
    return rows;
  },
};
