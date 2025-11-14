import db from "../config/db.js";

export const TechnicianModel = {
  async createOrUpdateProfile({
    user_id,
    skill_category_id,
    experience_years,
    description,
    working_area,
    certifications,
  }) {
    const [existing] = await db.query(
      "SELECT id FROM technician_profiles WHERE user_id = ?",
      [user_id]
    );

    if (existing.length > 0) {
      await db.query(
        `UPDATE technician_profiles
         SET skill_category_id=?, experience_years=?, description=?, working_area=?, certifications=?
         WHERE user_id=?`,
        [
          skill_category_id,
          experience_years,
          description,
          working_area,
          certifications,
          user_id,
        ]
      );
    } else {
      await db.query(
        `INSERT INTO technician_profiles (user_id, skill_category_id, experience_years, description, working_area, certifications)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          user_id,
          skill_category_id,
          experience_years,
          description,
          working_area,
          certifications,
        ]
      );
    }
  },
  async getAllWithUser({
    page = 1,
    size = 10,
    keySearch = "",
    status = "all",
  }) {
    const offset = (page - 1) * size;

    // Câu điều kiện WHERE linh hoạt
    let whereClause = `u.role = 'technician'`;
    const params = [];

    // Tìm kiếm theo tên hoặc số điện thoại
    if (keySearch && keySearch.trim() !== "") {
      whereClause += ` AND (u.full_name LIKE ? OR u.phone LIKE ?)`;
      params.push(`%${keySearch}%`, `%${keySearch}%`);
    }

    // Lọc trạng thái nếu khác 'all'
    if (status !== "all") {
      whereClause += ` AND u.status = ?`;
      params.push(status);
    }

    // Đếm tổng số dòng
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total
       FROM users u
       INNER JOIN technician_profiles t ON u.id = t.user_id
       WHERE ${whereClause}`,
      params
    );

    // Lấy dữ liệu phân trang
    const [rows] = await db.query(
      `
    SELECT 
      u.id AS user_id,
      u.full_name,
      u.phone,
      u.role,
      u.status,
      u.avatar_link,
      t.id AS technician_id,
      t.skill_category_id,
      c.name AS skill_category_name,  -- 🔹 Tên kỹ năng (join từ bảng categories)
      c.color AS skill_category_color, -- (nếu muốn lấy thêm màu category)
      t.experience_years,
      t.description,
      t.working_area,
      t.certifications,
      t.created_at,
      t.updated_at
    FROM users u
    INNER JOIN technician_profiles t ON u.id = t.user_id
    LEFT JOIN service_categories c ON t.skill_category_id = c.id   -- 🔹 join thêm bảng category
    WHERE ${whereClause}
    ORDER BY t.created_at DESC
    LIMIT ? OFFSET ?
  `,
      [...params, size, offset]
    );

    return { data: rows, total };
  },

  
};
