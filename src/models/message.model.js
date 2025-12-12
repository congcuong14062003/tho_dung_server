import db from "../config/db.js";

export const MessageModel = {
  async create(message) {
    const id = generateId("MESS_");
    const sql = `
      INSERT INTO Message (
        message_id, room_id, content_text_encrypt, content_type,
        reply_id, sender_id, receiver_id, name_file
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      id,
      message.room_id,
      message.content_text_encrypt,
      message.content_type,
      message.reply_id,
      message.sender_id,
      message.receiver_id,
      message.name_file,
    ];

    const [result] = await db.execute(sql, params);
    return result;
  },

  async getMessages(room_id) {
    const sql = `SELECT * FROM Message WHERE room_id = ? ORDER BY created_at ASC`;
    const [rows] = await db.execute(sql, [room_id]);
    return rows;
  },
};
