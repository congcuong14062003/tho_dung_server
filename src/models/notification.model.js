import db from "../config/db.js";

export const NotificationModel = {
  // Gửi thông báo cho 1 user
  async create({ user_id, title, body, type, action_data = {} }) {
    const insertQuery = `
    INSERT INTO notifications (user_id, title, body, type, action_data)
    VALUES (?, ?, ?, ?, ?)
  `;

    const [result] = await db.execute(insertQuery, [
      user_id,
      title,
      body,
      type,
      JSON.stringify(action_data),
    ]);

    const id = result.insertId;

    // 🔥 LẤY LẠI FULL RECORD ĐÃ TẠO
    const [rows] = await db.execute(
      `SELECT id, user_id, title, body, type, action_data AS data, is_read, created_at
     FROM notifications WHERE id = ?`,
      [id]
    );

    const noti = rows[0];

    // Parse action_data JSON → thành object
    try {
      noti.data = JSON.parse(noti.data);
    } catch (_) {}

    return noti;
  },
  // Gửi thông báo cho nhiều user cùng lúc
  async createForUsers(users, payload) {
    if (!users.length) return [];

    const values = users.map(() => "(?, ?, ?, ?, ?)").join(",");

    const query = `
    INSERT INTO notifications (user_id, title, body, type, action_data)
    VALUES ${values}
  `;

    const params = [];

    users.forEach((userId) => {
      params.push(
        userId,
        payload.title,
        payload.body,
        payload.type || "system",
        JSON.stringify(payload.action_data || {})
      );
    });

    const [result] = await db.execute(query, params);

    const firstId = result.insertId;
    const count = users.length;

    // 🔥 LẤY LẠI FULL LIST (đã parse JSON)
    const [rows] = await db.execute(
      `SELECT id, user_id, title, body, type, action_data AS data, is_read, created_at
     FROM notifications
     WHERE id >= ? AND id < ?`,
      [firstId, firstId + count]
    );

    rows.forEach((r) => {
      try {
        r.data = JSON.parse(r.data);
      } catch (_) {}
    });

    return rows;
  },
  async getByUser(userId) {
    const query = `
      SELECT *
      FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
    `;

    const [rows] = await db.execute(query, [userId]);
    return rows;
  },

  async markAsRead(id, userId) {
    const query = `
      UPDATE notifications
      SET is_read = 1
      WHERE id = ? AND user_id = ?
    `;
    await db.execute(query, [id, userId]);
  },
};
