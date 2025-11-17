import db from "../config/db.js";
import { generateId } from "../utils/crypto.js";

export const PaymentModel = {
  // ===============================
  // 🔹 Model: Upload bill payment
  // ===============================
  async uploadProof({ payment_id, user_id, files }) {
    // Kiểm tra payment tồn tại
    const [[payment]] = await db.query(
      `SELECT id, payment_status FROM payments WHERE id = ?`,
      [payment_id]
    );

    if (!payment) throw new Error("Không tìm thấy payment");

    if (!["pending"].includes(payment.payment_status)) {
      throw new Error("Payment không còn ở trạng thái pending");
    }

    // Lưu ảnh
    const values = files.map((f) => [
      generateId("PPF"),
      payment_id,
      user_id,
      f.path.replace("uploads\\", ""), // hoặc domain anh, tùy setup
    ]);

    await db.query(
      `INSERT INTO payment_proofs (id, payment_id, uploaded_by, image_url) VALUES ?`,
      [values]
    );

    // Update status sang "review"
    await db.query(
      `UPDATE payments SET payment_status = 'review' WHERE id = ?`,
      [payment_id]
    );

    return {
      payment_id,
      proof_count: files.length,
      status: "review",
    };
  },
  // ===============================
  // 🔹 Model: admin verify payment
  // ===============================
  async verifyPayment({ payment_id, action, adminId, reason }) {
    const newStatus = action === "approve" ? "paid" : "rejected";

    // Update payment
    await db.query(
      `UPDATE payments 
     SET payment_status = ?, verified_by = ?, verified_at = NOW(), reject_reason = ?
     WHERE id = ?`,
      [newStatus, adminId, reason || null, payment_id]
    );

    // Lấy request_id để update request nếu cần
    const [[reqInfo]] = await db.query(
      `SELECT request_id FROM payments WHERE id = ?`,
      [payment_id]
    );

    if (action === "approve") {
      // Thanh toán thành công → request hoàn tất hẳn
      await db.query(`UPDATE requests SET status = 'paid' WHERE id = ?`, [
        reqInfo.request_id,
      ]);
    }

    return {
      payment_id,
      status: newStatus,
    };
  },
};
