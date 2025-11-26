import db from "../config/db.js";
import { generateId } from "../utils/crypto.js";

export const DeviceModel = {
  async saveDevice({ user_id, fcm_token }) {
    const id = generateId("DEV_");

    // Kiểm tra nếu device đã tồn tại
    const [exist] = await db.query(
      `SELECT id FROM user_devices WHERE user_id = ? AND fcm_token = ?`,
      [user_id, fcm_token]
    );

    if (exist.length > 0) {
      // Update token mới
      await db.query(
        `
        UPDATE user_devices
        SET fcm_token = ?, updated_at = NOW()
        WHERE id = ?
      `,
        [fcm_token, exist[0].id]
      );
      return exist[0].id;
    }

    // Nếu chưa có → tạo mới
    await db.query(
      `
      INSERT INTO user_devices (id, user_id, fcm_token)
      VALUES (?, ?, ?)
    `,
      [id, user_id, fcm_token]
    );

    return id;
  },
  async deleteByToken(user_id, fcm_token) {
    await db.query(
      `DELETE FROM user_devices WHERE user_id = ? AND fcm_token = ?`,
      [user_id, fcm_token]
    );
  },
  async findByUserId(user_id) {
    const [rows] = await db.query(
      `SELECT id, user_id, fcm_token FROM user_devices WHERE user_id = ?`,
      [user_id]
    );
    return rows; // trả về mảng token
  },
};
