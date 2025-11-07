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
        [skill_category_id, experience_years, description, working_area, certifications, user_id]
      );
    } else {
      await db.query(
        `INSERT INTO technician_profiles (user_id, skill_category_id, experience_years, description, working_area, certifications)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [user_id, skill_category_id, experience_years, description, working_area, certifications]
      );
    }
  },
   async getAllWithUser() {
    const [rows] = await db.query(`
      SELECT 
        u.id AS user_id,
        u.full_name,
        u.phone,
        u.role,
        t.id AS technician_id,
        t.skill_category_id,
        t.experience_years,
        t.description,
        t.working_area,
        t.certifications,
        t.created_at,
        t.updated_at
      FROM users u
      INNER JOIN technician_profiles t ON u.id = t.user_id
      WHERE u.role = 'technician'
      ORDER BY t.created_at DESC
    `);
    return rows;
  },
};
