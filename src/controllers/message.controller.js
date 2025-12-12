import { baseResponse } from "../utils/response.helper.js";
import { decryptText, encryptText } from "../utils/encryption.js";
import { MessageModel } from "../models/message.model.js";

export const MessageController = {
  async sendMessage(req, res) {
    try {
      const {
        room_id,
        receiver_id,
        content_text,
        content_type,
        reply_id,
        name_file,
      } = req.body;
      const sender_id = req.user.id;

      if (!room_id || !receiver_id || !content_type) {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Thiếu dữ liệu gửi tin nhắn",
        });
      }

      let encryptedContent = null;
      if (content_type === "text") {
        encryptedContent = encryptText(content_text);
      }

      const newMessage = {
        room_id,
        content_text_encrypt: encryptedContent,
        content_type,
        reply_id: reply_id || null,
        sender_id,
        receiver_id,
        name_file: name_file || null,
      };

      await MessageModel.create(newMessage);

      return baseResponse(res, {
        code: 200,
        status: true,
        message: "Gửi tin nhắn thành công",
        data: { message_id: newMessage.message_id },
      });
    } catch (err) {
      console.error(err);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi gửi tin nhắn",
      });
    }
  },

  async getMessages(req, res) {
    try {
      const { room_id } = req.params;

      const messages = await MessageModel.getMessages(room_id);

      const finalMessages = messages.map((msg) => ({
        ...msg,
        content_text: msg.content_text_encrypt
          ? safeDecrypt(msg.content_text_encrypt)
          : null,
      }));

      return baseResponse(res, {
        code: 200,
        status: true,
        message: "Lấy danh sách tin nhắn thành công",
        data: finalMessages,
      });
    } catch (err) {
      console.error(err);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi lấy danh sách tin nhắn",
      });
    }
  },
};
// Hàm giải mã an toàn
function safeDecrypt(text) {
  try {
    return decryptText(text);
  } catch (err) {
    console.error("Decrypt error:", err);
    return null;
  }
}
