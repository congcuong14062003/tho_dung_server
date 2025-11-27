import db from "../config/db.js";

export const NotificationModel = {
  // Gửi thông báo cho 1 user
  async create({ user_id, title, body, type = "custom", action_data = {} }) {
    const query = `
      INSERT INTO notifications (user_id, title, body, type, action_data)
      VALUES (?, ?, ?, ?, ?)
    `;

    const [result] = await db.execute(query, [
      user_id,
      title,
      body,
      type,
      JSON.stringify(action_data),
    ]);

    return result.insertId;
  },

  // Gửi thông báo cho nhiều user cùng lúc
  async createForUsers(users, payload) {
    if (!users.length) return;

    const values = users
      .map(
        () =>
          "(?, ?, ?, ?, ?)"
      )
      .join(",");

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
        payload.type || "custom",
        JSON.stringify(payload.action_data || {})
      );
    });

    await db.execute(query, params);
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
