import db from "../config/db.js";
import { generateId } from "../utils/crypto.js";
import {
  insertStatusLog,
  RequestModel,
  updateRequestStatus,
} from "./request.model.js";
// ==============================
// 🔹 HÀM DÙNG CHUNG (PRIVATE)
// ==============================

/**
 * Wrapper transaction – dùng cho mọi thao tác cần atomic
 */
const withTransaction = async (callback) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
export const PaymentModel = {
  async getPaymentDetail(payment_id) {
    // 1. Lấy payment
    const [rows] = await db.query(
      `SELECT 
        p.*,
        r.name_request,
        r.status AS request_status,
        COALESCE(q.total_price, p.amount) AS amount_to_pay
     FROM payments p
     JOIN requests r ON p.request_id = r.id
     LEFT JOIN quotations q ON q.request_id = p.request_id
     WHERE p.id = ?
     LIMIT 1`,
      [payment_id]
    );

    if (rows.length === 0) return null;

    const payment = rows[0];

    // 2. Lấy chứng từ thanh toán
    const [proofs] = await db.query(
      `SELECT id, image_url, uploaded_by, created_at 
     FROM payment_proofs 
     WHERE payment_id = ?
     ORDER BY created_at ASC`,
      [payment_id]
    );

    return {
      payment_id: payment.id,
      request_id: payment.request_id,
      name_request: payment.name_request,
      request_status: payment.request_status,
      amount: Number(payment.amount_to_pay),
      payment_method: payment.payment_method,
      payment_status: payment.payment_status,
      created_at: payment.created_at,
      paid_at: payment.paid_at,

      proofs: proofs.map((p) => ({
        id: p.id,
        url: p.image_url,
        uploaded_by: p.uploaded_by,
        created_at: p.created_at,
      })),
    };
  },
  async getPaymentDetailByRequest(requestId) {
    // 1. Lấy payment + số tiền cần thanh toán
    const [paymentRows] = await db.query(
      `SELECT p.*, COALESCE(q.total_price, p.amount) AS amount_to_pay,
      r.name_request,
      r.status as request_status
     FROM payments p
     LEFT JOIN quotations q ON p.request_id = q.request_id
     JOIN requests r ON p.request_id = r.id
     WHERE p.request_id = ?
     LIMIT 1`,
      [requestId]
    );

    if (paymentRows.length === 0) return null;
    const payment = paymentRows[0];

    // 2. Lấy thông tin ngân hàng từ .env
    const bankCode = process.env.COMPANY_BANK_CODE?.toUpperCase();
    const accountNo = process.env.COMPANY_BANK_ACCOUNT;
    const accountName = process.env.COMPANY_BANK_HOLDER;
    const template =
      process.env.COMPANY_BANK_CONTENT_TEMPLATE || "TT don {request_id}";

    if (!bankCode || !accountNo || !accountName) {
      throw new Error("Thiếu cấu hình ngân hàng công ty trong .env");
    }

    // 3. Sinh nội dung + QR
    const addInfo = template.replace(/{request_id}/g, requestId);
    const amount = Math.round(Number(payment.amount_to_pay));
    const qrUrl = `https://img.vietqr.io/image/${bankCode}-${accountNo}-compact.png?amount=${amount}&addInfo=${encodeURIComponent(
      addInfo
    )}`;

    // 4. Lấy bằng chứng thanh toán
    const [proofs] = await db.query(
      `SELECT id, image_url, uploaded_by, created_at
     FROM payment_proofs
     WHERE payment_id = ?
     ORDER BY created_at ASC`,
      [payment.id]
    );
    // const [request] = await db.query(`SELECT name_request from requests where id = ?`, [requestId])

    // 5. JOIN LẤY CHI TIẾT CÁC MỤC CÔNG VIỆC + ẢNH TRƯỚC/SAU
    const [itemRows] = await db.query(
      `SELECT 
      qi.id AS item_id,
      qi.name AS item_name,
      qi.price AS item_price,
      qi.status AS item_status,
      qi.note AS item_note,
      qi.reason AS item_reason,

      qii.id AS img_id,
      qii.image_url AS img_url,
      qii.image_type AS img_type  -- before / during / after
    FROM quotations q
    LEFT JOIN quotation_items qi ON q.id = qi.quotation_id
    LEFT JOIN quotation_items_images qii ON qi.id = qii.quotation_item_id
    WHERE q.request_id = ?
    ORDER BY qi.created_at ASC, qii.created_at ASC`,
      [requestId]
    );

    // Xử lý nhóm item + ảnh
    const itemsMap = {};
    itemRows.forEach((row) => {
      if (!row.item_id) return;

      if (!itemsMap[row.item_id]) {
        itemsMap[row.item_id] = {
          id: row.item_id,
          name: row.item_name,
          price: Number(row.item_price),
          status: row.item_status,
          note: row.item_note || null,
          reason: row.item_reason || null,
        };
      }
    });

    return {
      payment_id: payment.id,
      request_id: requestId,
      name_request: payment.name_request,
      request_status: payment.request_status,
      amount: amount,
      payment_method: payment.payment_method || "qr",
      payment_status: payment.payment_status,
      paid_at: payment.paid_at,
      created_at: payment.created_at,

      // Thông tin ngân hàng + QR
      company_bank: {
        bank_code: bankCode,
        bank_name: process.env.COMPANY_BANK_NAME || bankCode,
        account_number: accountNo,
        account_name: accountName,
        content: addInfo,
      },
      qr_code_url: qrUrl,

      // Bằng chứng khách up
      proofs: proofs.map((p) => ({
        id: p.id,
        url: p.image_url,
        uploaded_by: p.uploaded_by,
        created_at: p.created_at,
      })),

      // CHI TIẾT CÔNG VIỆC THỢ ĐÃ LÀM (siêu chi tiết)
      work_items: Object.values(itemsMap).map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        status: item.status,
      })),
    };
  },

  // // ===============================
  // // 🔹 Model: Upload bill payment
  // // ===============================
  // async uploadProof({ payment_id, user_id, images, request_id }) {
  //   // 1 Kiểm tra payment tồn tại
  //   const [[payment]] = await db.query(
  //     `SELECT id, payment_status FROM payments WHERE id = ?`,
  //     [payment_id]
  //   );

  //   if (!payment) throw new Error("Không tìm thấy payment");

  //   if (!["pending"].includes(payment.payment_status)) {
  //     throw new Error("Payment không còn ở trạng thái pending");
  //   }

  //   // 2. Lấy ảnh cũ (nếu có)
  //   const [oldProofs] = await db.query(
  //     `SELECT image_url FROM payment_proofs WHERE payment_id = ?`,
  //     [payment_id]
  //   );

  //   // 3. Xóa file vật lý
  //   for (const p of oldProofs) {
  //     try {
  //       const fileName = p.image_url.split("/uploads/")[1];
  //       const filePath = path.join(process.cwd(), "uploads", fileName);

  //       if (fs.existsSync(filePath)) {
  //         fs.unlinkSync(filePath);
  //       }
  //     } catch (err) {
  //       console.error("Không thể xóa ảnh cũ:", err);
  //     }
  //   }

  //   // 4. Xoá record ảnh cũ trong DB
  //   await db.query(`DELETE FROM payment_proofs WHERE payment_id = ?`, [
  //     payment_id,
  //   ]);

  //   // Lưu ảnh – dùng URLs từ controller
  //   const values = images.map((url) => [
  //     generateId("PPF"),
  //     payment_id,
  //     user_id,
  //     url, // ⬅ Lưu URL trực tiếp
  //   ]);

  //   await db.query(
  //     `INSERT INTO payment_proofs (id, payment_id, uploaded_by, image_url) VALUES ?`,
  //     [values]
  //   );
  //   return {
  //     payment_id,
  //     proof_count: images.length,
  //   };
  // },

  // ===============================
  // 🔹 Model: Upload bill payment + tự động chuyển trạng thái request
  // ===============================
  async uploadProof({ payment_id, user_id, images, request_id }) {
    // Dùng transaction để đảm bảo atomic (cập nhật ảnh + trạng thái request)
    return await withTransaction(async (conn) => {
      // 1. Kiểm tra payment tồn tại + đang pending
      const [[payment]] = await conn.query(
        `SELECT id, payment_status, request_id FROM payments WHERE id = ?`,
        [payment_id]
      );

      if (!payment) throw new Error("Không tìm thấy payment");
      if (payment.payment_status !== "pending") {
        throw new Error("Payment không còn ở trạng thái pending");
      }

      // Lấy trạng thái hiện tại của request (để log)
      const [[request]] = await conn.query(
        `SELECT status FROM requests WHERE id = ?`,
        [request_id || payment.request_id]
      );

      if (!request) throw new Error("Không tìm thấy request");
      await conn.query(`DELETE FROM payment_proofs WHERE payment_id = ?`, [
        payment_id,
      ]);

      // 3. Lưu ảnh mới
      if (images && images.length > 0) {
        const values = images.map((url) => [
          generateId("PPF"),
          payment_id,
          user_id,
          url,
        ]);

        await conn.query(
          `INSERT INTO payment_proofs (id, payment_id, uploaded_by, image_url) VALUES ?`,
          [values]
        );
      }

      // 4. 🔥 TỰ ĐỘNG CHUYỂN TRẠNG THÁI REQUEST: payment → payment_review
      if (request.status === "payment") {
        await updateRequestStatus(
          request_id || payment.request_id,
          "payment_review",
          {},
          conn
        );

        await insertStatusLog({
          request_id: request_id || payment.request_id,
          old_status: "payment",
          new_status: "payment_review",
          changed_by: user_id,
          reason: "Khách hàng/thợ upload bằng chứng thanh toán",
          connection: conn,
        });
      }
      // Nếu đã ở payment_review rồi thì không cần cập nhật lại (tránh spam log)

      return {
        payment_id,
        request_id: request_id || payment.request_id,
        proof_count: images.length,
        request_status_updated: request.status === "payment",
      };
    });
  },
  // ===============================
  // 🔹 Model: admin verify payment
  // ===============================
  async verifyPayment({ payment_id, action, adminId, reason }) {
    const newStatus = action === "approve" ? "paid" : "rejected";

    // Update payment
    await db.query(
      `UPDATE payments 
     SET payment_status = ?
     WHERE id = ?`,
      [newStatus, payment_id]
    );

    // Lấy request_id để update request nếu cần
    const [[reqInfo]] = await db.query(
      `SELECT request_id FROM payments WHERE id = ?`,
      [payment_id]
    );

    if (action === "approve") {
      // Thanh toán thành công → request hoàn tất hẳn
      await db.query(`UPDATE requests SET status = 'completed' WHERE id = ?`, [
        reqInfo.request_id,
      ]);
    }

    return {
      payment_id,
      status: newStatus,
    };
  },
};
