import db from "../config/db.js";
import { generateId } from "../utils/crypto.js";

export const TechnicianModel = {
  async getRequestsByUserId(user_id) {
    const query = `
    SELECT 
      tr.id AS request_id,
      tr.user_id,
      tr.experience_years,
      tr.working_area,
      tr.description,
      tr.certifications,
      tr.status,
      tr.rejected_reason,
      tr.created_at,
      tr.updated_at,
      
      JSON_ARRAYAGG(
        JSON_OBJECT(
          'skill_category_id', sc.id,
          'skill_category_name', sc.name,
          'skill_category_color', sc.color
        )
      ) AS skills

    FROM technician_requests tr
    LEFT JOIN technician_request_skills trs ON trs.request_id = tr.id
    LEFT JOIN service_categories sc ON sc.id = trs.category_id
    WHERE tr.user_id = ?
    GROUP BY tr.id
    ORDER BY tr.created_at DESC
  `;

    const [rows] = await db.execute(query, [user_id]);
    return rows;
  },
  // ===============================
  // GET ALL TECHNICIANS (MULTI SKILLS)
  // ===============================
  async getAllWithUser({ page = 1, size = 10, keySearch, status }) {
    const offset = (page - 1) * size;
    const params = [];

    let whereClause = `u.role = 'technician'`;

    if (status === "active") whereClause += ` AND u.status = 'active'`;
    else if (status === "inactive") whereClause += ` AND u.status = 'inactive'`;
    else whereClause += ` AND u.status IN ('active','inactive')`;

    if (keySearch && keySearch.trim() !== "") {
      whereClause += ` AND (u.full_name LIKE ? OR u.phone LIKE ?)`;
      params.push(`%${keySearch}%`, `%${keySearch}%`);
    }

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total
       FROM users u
       JOIN technician_profiles t ON u.id = t.user_id
       WHERE ${whereClause}`,
      params
    );

    const [rows] = await db.query(
      `
      SELECT 
        u.id AS user_id,
        u.full_name,
        u.phone,
        u.status,
        u.avatar_link,

        t.id AS profile_id,
        t.experience_years,
        t.description,
        t.working_area,
        t.certifications,
        t.rating_avg,
        t.created_at
      FROM users u
      JOIN technician_profiles t ON u.id = t.user_id
      WHERE ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `,
      [...params, size, offset]
    );

    // ===== GET SKILLS FOR EACH TECHNICIAN =====
    for (const item of rows) {
      const [skills] = await db.query(
        `SELECT sc.id, sc.name, sc.color 
         FROM technician_profile_skills ts
         JOIN service_categories sc ON ts.category_id = sc.id
         WHERE ts.profile_id = ?`,
        [item.profile_id]
      );
      item.skills = skills; // gán mảng chuyên môn
    }

    return { data: rows, total };
  },
  async createRequest(data) {
    const requestId = generateId("tech_req_");

    // Tạo request
    await db.query(
      `INSERT INTO technician_requests 
      (id, user_id, experience_years, working_area, description, certifications)
     VALUES (?, ?, ?, ?, ?, ?)`,
      [
        requestId,
        data.user_id,
        data.experience_years || 0,
        data.working_area,
        data.description,
        data.certifications,
      ]
    );

    // Lưu danh sách kỹ năng vào bảng trung gian
    for (const catId of data.skill_category_ids) {
      await db.query(
        `INSERT INTO technician_request_skills (id, request_id, category_id)
       VALUES (?, ?, ?)`,
        [generateId("tech_req_skill_"), requestId, catId]
      );
    }

    return requestId;
  },
  async getPendingRequestByUser(userId) {
    const [rows] = await db.query(
      `SELECT * FROM technician_requests WHERE user_id = ? AND status = 'pending' LIMIT 1`,
      [userId]
    );
    return rows[0] || null;
  },

  async getRequestById(requestId) {
    const [rows] = await db.query(
      `SELECT tr.*, u.full_name, u.phone 
     FROM technician_requests tr 
     JOIN users u ON tr.user_id = u.id 
     WHERE tr.id = ?`,
      [requestId]
    );
    return rows[0] || null;
  },

  async createProfileFromRequest(request, skills = []) {
    const profileId = generateId("tech_profile_");

    // 1️⃣ TẠO PROFILE
    await db.query(
      `INSERT INTO technician_profiles 
      (id, user_id, experience_years, working_area, description, certifications)
     VALUES (?, ?, ?, ?, ?, ?)`,
      [
        profileId,
        request.user_id,
        request.experience_years,
        request.working_area,
        request.description,
        request.certifications,
      ]
    );

    // 2️⃣ GÁN SKILL VÀO technician_profile_skills
    for (const s of skills) {
      await db.query(
        `INSERT INTO technician_profile_skills (id, profile_id, category_id)
       VALUES (?, ?, ?)`,
        [generateId("tech_skill_"), profileId, s.id]
      );
    }

    return profileId;
  },
  async updateRequestStatus(requestId, status, adminId, reason = null) {
    const fields = { status };
    if (status === "approved") fields.approved_by = adminId;
    if (status === "rejected") {
      fields.rejected_by = adminId;
      fields.rejected_reason = reason;
    }

    const sets = Object.keys(fields)
      .map((k) => `${k} = ?`)
      .join(", ");
    const values = Object.values(fields);
    values.push(requestId);

    await db.query(
      `UPDATE technician_requests SET ${sets} WHERE id = ?`,
      values
    );
  },

  // Lấy danh sách yêu cầu (tất cả status)
  async getPendingRequests({
    page = 1,
    size = 10,
    keySearch = "",
    status = "all",
  }) {
    const offset = (page - 1) * size;
    const search = `%${keySearch}%`;

    let where = `
      ( tr.id LIKE ?
      OR u.full_name LIKE ?
      OR u.phone LIKE ?
      OR tr.working_area LIKE ?
      OR tr.description LIKE ? )
    `;

    const params = [search, search, search, search, search];

    if (status !== "all") {
      where += ` AND tr.status = ?`;
      params.push(status);
    }

    // === LẤY DANH SÁCH REQUEST (KHÔNG SKILLS) ===
    const sqlData = `
      SELECT 
        tr.id AS request_id,
        tr.user_id,
        u.full_name,
        u.phone,
        u.avatar_link,
        tr.experience_years,
        tr.working_area,
        tr.description,
        tr.certifications,
        tr.status,
        tr.rejected_reason,
        tr.created_at
      FROM technician_requests tr
      JOIN users u ON tr.user_id = u.id
      WHERE ${where}
      ORDER BY tr.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const dataParams = [...params, size, offset];
    const [rows] = await db.query(sqlData, dataParams);

    // === LẤY SKILLS CHO MỖI REQUEST ===
    for (const item of rows) {
      const [skills] = await db.query(
        `SELECT 
          sc.id,
          sc.name,
          sc.color
       FROM technician_request_skills trs
       JOIN service_categories sc ON trs.category_id = sc.id
       WHERE trs.request_id = ?`,
        [item.request_id]
      );

      item.skills = skills; // <-- GÁN MẢNG SKILL
    }

    // === LẤY TỔNG RECORD ===
    const sqlCount = `
      SELECT COUNT(*) AS total
      FROM technician_requests tr
      JOIN users u ON tr.user_id = u.id
      WHERE ${where}
    `;
    const [countRows] = await db.query(sqlCount, params);
    const total = countRows[0]?.total || 0;

    return { data: rows, total };
  },

  /**
   * Lấy đầy đủ thông tin profile thợ theo user_id
   * Dùng khi login thợ → trả về workerInfor hoàn chỉnh
   */
  // ===============================
  // GET PROFILE BY USER_ID (FULL + MULTI SKILLS)
  // ===============================
  async getProfileByUserId(userId) {
    const [rows] = await db.query(
      `SELECT 
        tp.id AS profile_id,
        tp.user_id,
        tp.experience_years,
        tp.working_area,
        tp.rating_avg,
        tp.description,
        tp.certifications,
        tp.created_at AS profile_created_at,
        tp.updated_at AS profile_updated_at,

        u.full_name,
        u.phone,
        u.avatar_link,
        u.role,
        u.status AS user_status,
        u.verified,
        u.created_at AS user_created_at,
        u.updated_at AS user_updated_at

      FROM technician_profiles tp
      LEFT JOIN users u ON tp.user_id = u.id
      WHERE tp.user_id = ?
      LIMIT 1`,
      [userId]
    );

    if (rows.length === 0) return null;
    const p = rows[0];

    // ===== LẤY DS CHUYÊN MÔN =====
    const [skills] = await db.query(
      `SELECT 
        sc.id, sc.name, sc.color, sc.icon, sc.description
       FROM technician_profile_skills ts
       JOIN service_categories sc ON ts.category_id = sc.id
       WHERE ts.profile_id = ?`,
      [p.profile_id]
    );

    return {
      ...p,
      skills: skills,
      avatar_link:
        p.avatar_link ||
        "https://cdn-icons-png.flaticon.com/512/149/149071.png",
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

    return { success: true, message: "Đã từ chối yêu cầu" };
  },

  async getRequestSkills(requestId) {
    const [rows] = await db.query(
      `SELECT sc.id, sc.name, sc.color 
     FROM technician_request_skills trs
     JOIN service_categories sc ON trs.category_id = sc.id
     WHERE trs.request_id = ?`,
      [requestId]
    );

    return rows;
  },
};
