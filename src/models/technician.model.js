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
  /**
   * Lấy đầy đủ thông tin profile thợ theo user_id
   * Dùng khi login thợ → trả về workerInfor hoàn chỉnh
   */
  async getProfileByUserId(userId) {
    const [rows] = await db.query(
      `SELECT 
      -- Thông tin từ technician_profiles
      tp.id AS profile_id,
      tp.user_id,
      tp.skill_category_id,
      tp.experience_years,
      tp.working_area,
      tp.rating_avg,
      tp.description,
      tp.certifications,
      tp.created_at AS profile_created_at,
      tp.updated_at AS profile_updated_at,

      -- Thông tin danh mục kỹ năng
      sc.name AS skill_category_name,
      sc.description AS skill_category_description,
      sc.icon AS skill_category_icon,
      sc.color AS skill_category_color,
      sc.order AS skill_category_order,

      -- Thông tin người dùng (users table)
      u.full_name,
      u.phone,
      u.avatar_link,
      u.id_card,
      u.role,
      u.status AS user_status,
      u.verified,
      u.created_at AS user_created_at,
      u.updated_at AS user_updated_at

    FROM technician_profiles tp
    LEFT JOIN service_categories sc ON tp.skill_category_id = sc.id
    LEFT JOIN users u ON tp.user_id = u.id
    WHERE tp.user_id = ?
    LIMIT 1`,
      [userId]
    );

    if (rows.length === 0) return null;

    const p = rows[0];

    return {
      profile_id: p.profile_id,
      user_id: p.user_id,

      // Thông tin cá nhân thợ
      full_name: p.full_name,
      phone: p.phone,
      avatar_link:
        p.avatar_link ||
        "https://cdn-icons-png.flaticon.com/512/149/149071.png",
      id_card: p.id_card || null,

      // Chuyên môn
      skill_category: {
        id: p.skill_category_id,
        name: p.skill_category_name || "Chưa chọn chuyên môn",
        description: p.skill_category_description || null,
        icon: p.skill_category_icon || null,
        color: p.skill_category_color || "#666666",
        order: p.skill_category_order || 0,
      },

      // Kinh nghiệm & thông tin làm việc
      experience_years: Number(p.experience_years) || 0,
      working_area: p.working_area || "Toàn quốc",
      description: p.description || "",
      certifications: p.certifications || "",

      // Đánh giá
      rating_avg: Number(p.rating_avg) || 0.0,

      // Trạng thái tài khoản
      user_status: p.user_status,
      verified: Boolean(p.verified),

      // Thời gian
      profile_created_at: p.profile_created_at,
      profile_updated_at: p.profile_updated_at,
      user_created_at: p.user_created_at,
      user_updated_at: p.user_updated_at,
    };
  },

  // User nộp đơn xin làm thợ
  async requestBecomeTechnician({
    user_id,
    skill_category_id,
    experience_years,
    working_area,
    description,
    certifications,
  }) {
    // 1. Cập nhật role + status pending
    await db.query(
      `UPDATE users SET role = 'technician', status = 'pending' WHERE id = ?`,
      [user_id]
    );

    // 2. Lưu tạm profile (chờ duyệt)
    await db.query(
      `INSERT INTO technician_profiles 
       (user_id, skill_category_id, experience_years, working_area, description, certifications)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        skill_category_id,
        experience_years || 0,
        working_area,
        description,
        certifications,
      ]
    );

    return {
      success: true,
      message: "Đã gửi đơn xin làm thợ, chờ admin duyệt",
    };
  },

  // Admin duyệt đơn (chỉ chuyển status)
  async approveTechnician(user_id, admin_id) {
    await db.query(
      `UPDATE users SET status = 'active' WHERE id = ? AND role = 'technician'`,
      [user_id]
    );

    // Có thể ghi log nếu cần
    return { success: true, message: "Duyệt thợ thành công" };
  },

  // Admin từ chối → xóa profile + trả về customer
  async rejectTechnician(user_id, admin_id, reason = null) {
    await db.query(`DELETE FROM technician_profiles WHERE user_id = ?`, [
      user_id,
    ]);
    await db.query(
      `UPDATE users SET role = 'customer', status = 'active' WHERE id = ?`,
      [user_id]
    );

    return { success: true, message: "Đã từ chối đơn" };
  },

  // Admin lấy danh sách thợ chờ duyệt
  async getPendingTechnicians({ page = 1, size = 10, keySearch = "" }) {
    const offset = (page - 1) * size;
    const search = `%${keySearch}%`;

    const [rows] = await db.query(
      `SELECT 
        u.id AS user_id,
        u.full_name,
        u.phone,
        u.id_card,
        tp.skill_category_id,
        sc.name AS category_name,
        tp.experience_years,
        tp.working_area,
        tp.description,
        tp.certifications,
        tp.created_at
       FROM users u
       JOIN technician_profiles tp ON u.id = tp.user_id
       JOIN service_categories sc ON tp.skill_category_id = sc.id
       WHERE u.role = 'technician' AND u.status = 'pending'
         AND (u.full_name LIKE ? OR u.phone LIKE ?)
       ORDER BY tp.created_at DESC
       LIMIT ? OFFSET ?`,
      [search, search, size, offset]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total
       FROM users u
       JOIN technician_profiles tp ON u.id = tp.user_id
       WHERE u.role = 'technician' AND u.status = 'pending'
         AND (u.full_name LIKE ? OR u.phone LIKE ?)`,
      [search, search]
    );

    return { data: rows, total };
  },
};
