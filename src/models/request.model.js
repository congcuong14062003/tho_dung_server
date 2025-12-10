// src/models/request.model.js
import db from "../config/db.js";
import { generateId } from "../utils/crypto.js";

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

/**
 * Ghi log thay đổi trạng thái request
 */
export const insertStatusLog = async ({
  request_id,
  old_status = null,
  new_status,
  changed_by,
  reason = null,
  connection = db,
}) => {
  const logId = generateId("RLOG");
  await connection.query(
    `INSERT INTO request_status_logs 
     (id, request_id, old_status, new_status, changed_by, reason, created_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [logId, request_id, old_status, new_status, changed_by, reason]
  );
};

const STATUS_GROUP = {
  all: null,
  pending: ["pending", "assigning", "assigned", "quoted"],
  in_progress: ["in_progress", "customer_review", "payment", "payment_review"],
  completed: ["completed"],
  cancelled: ["cancelled"],
};

const STATUS_GROUP_TECHNICIAN = {
  all: null,

  pending: ["pending", "assigning"],

  assigned: ["assigned"],

  in_progress: ["in_progress", "customer_review", "payment", "payment_review", "quoted"],

  completed: ["completed"],

  cancelled: ["cancelled"],
};

/**
 * Cập nhật trạng thái request + các field phụ (cancel_reason, technician_id, completed_at...)
 */
export const updateRequestStatus = async (
  request_id,
  new_status,
  extra = {},
  connection = db
) => {
  const fields = ["status = ?", "updated_at = NOW()"];
  const values = [new_status];

  if (extra.technician_id !== undefined) {
    fields.push("technician_id = ?");
    values.push(extra.technician_id);
  }
  if (extra.cancel_reason !== undefined) {
    fields.push("cancel_reason = ?");
    values.push(extra.cancel_reason);
  }
  if (extra.cancel_by !== undefined) {
    fields.push("cancel_by = ?");
    values.push(extra.cancel_by);
  }
  if (extra.completed_at) {
    fields.push("completed_at = NOW()");
  }

  values.push(request_id);

  await connection.query(
    `UPDATE requests SET ${fields.join(", ")} WHERE id = ?`,
    values
  );
};

/**
 * Thêm nhiều ảnh vào request_images (dùng chung cho khách & thợ)
 */
const insertRequestImages = async (
  request_id,
  uploaded_by,
  images,
  type = "pending",
  connection = db
) => {
  if (!images || images.length === 0) return;

  const values = images.map((url) => [
    generateId("IMG"),
    request_id,
    uploaded_by,
    url,
    type,
    new Date(), // created_at
  ]);

  await connection.query(
    `INSERT INTO request_images 
   (id, request_id, uploaded_by, image_url, type, created_at) 
   VALUES ?`,
    [values]
  );
};

// ==============================
// 🔹 REQUEST MODEL
// ==============================

export const RequestModel = {
  // 1. Tạo yêu cầu mới
  async create({
    user_id,
    service_id,
    name_request,
    description,
    address,
    requested_date,
    requested_time,
    images = [],
  }) {
    return await withTransaction(async (conn) => {
      const requestId = generateId("REQ");

      await conn.query(
        `INSERT INTO requests 
         (id, user_id, service_id, name_request, description, address, requested_date, requested_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          requestId,
          user_id,
          service_id,
          name_request || "",
          description || "",
          address,
          requested_date || null,
          requested_time || null,
        ]
      );
      console.log("images: ", images);
      if (images.length > 0) {
        await insertRequestImages(requestId, user_id, images, "pending", conn);
      }

      await insertStatusLog({
        request_id: requestId,
        old_status: null,
        new_status: "pending",
        changed_by: user_id,
        reason: "Khách hàng tạo yêu cầu mới",
        connection: conn,
      });

      return requestId;
    });
  },

  // 2. Hủy yêu cầu (khách hàng)
  async cancelRequest({ request_id, user_id, reason }) {
    const [[request]] = await db.query(
      `SELECT status FROM requests WHERE id = ? AND user_id = ?`,
      [request_id, user_id]
    );

    if (!request) {
      return {
        success: false,
        code: 404,
        message: "Yêu cầu không tồn tại hoặc không phải của bạn",
      };
    }
    if (!["pending", "quoted"].includes(request.status)) {
      return {
        success: false,
        code: 400,
        message: "Chỉ được hủy khi đang pending hoặc quoted",
      };
    }

    await updateRequestStatus(request_id, "cancelled", {
      cancel_reason: reason,
      cancel_by: user_id,
    });

    await insertStatusLog({
      request_id,
      old_status: request.status,
      new_status: "cancelled",
      changed_by: user_id,
      reason,
    });

    return { success: true };
  },

  // ===============================
  // 🔹 Lấy danh sách yêu cầu (có phân trang + tìm kiếm)
  // ===============================
  async getAll({ keySearch = "", status = "all", limit = 10, offset = 0 }) {
    const search = `%${keySearch}%`;
    let statusCondition = "";
    const params = [
      search,
      search,
      search,
      search,
      search,
      search,
      search,
      limit,
      offset,
    ];

    if (status !== "all") {
      statusCondition = "AND r.status = ?";
      params.unshift(status); // thêm status vào đầu
    }

    const [rows] = await db.query(
      `
    SELECT 
      r.id,
      r.name_request,
      r.description,
      r.address,
      r.requested_date,
      r.requested_time,
      r.status,
      u.full_name AS customer_name,
      t.full_name AS technician_name,
      s.name AS service_name,
      sc.name AS category_name
    FROM requests r
    JOIN users u ON r.user_id = u.id
    LEFT JOIN users t ON r.technician_id = t.id
    JOIN services s ON r.service_id = s.id
    JOIN service_categories sc ON s.category_id = sc.id
    WHERE 
      1=1
      ${statusCondition}
      AND (
        r.id LIKE ? OR
        r.name_request LIKE ? OR
        r.address LIKE ? OR
        u.full_name LIKE ? OR
        t.full_name LIKE ? OR
        s.name LIKE ? OR
        sc.name LIKE ?
      )
    ORDER BY r.created_at DESC
    LIMIT ? OFFSET ?
    `,
      params
    );

    // Đếm tổng
    const countParams = [
      search,
      search,
      search,
      search,
      search,
      search,
      search,
    ];
    if (status !== "all") countParams.unshift(status);

    const [[{ total }]] = await db.query(
      `
    SELECT COUNT(*) AS total
    FROM requests r
    JOIN users u ON r.user_id = u.id
    LEFT JOIN users t ON r.technician_id = t.id
    JOIN services s ON r.service_id = s.id
    JOIN service_categories sc ON s.category_id = sc.id
    WHERE 
      1=1
      ${statusCondition}
      AND (
        r.id LIKE ? OR
        r.name_request LIKE ? OR
        r.address LIKE ? OR
        u.full_name LIKE ? OR
        t.full_name LIKE ? OR
        s.name LIKE ? OR
        sc.name LIKE ?
      )
    `,
      countParams
    );

    return { data: rows, total };
  },

  // ===============================
  // 🔹 Lấy danh sách yêu cầu của khách hàng
  // ===============================
  async getRequestsByUser({
    userId,
    keySearch = "",
    status = "all",
    limit = 10,
    offset = 0,
  }) {
    const search = `%${keySearch}%`;

    // Map status group
    const mappedStatuses = STATUS_GROUP[status] || null;

    let statusCondition = "";
    const params = [userId];

    if (mappedStatuses) {
      statusCondition = `AND r.status IN (${mappedStatuses
        .map(() => "?")
        .join(",")})`;
      params.push(...mappedStatuses);
    }

    params.push(search, search, search, search, limit, offset);

    const [rows] = await db.query(
      `
    SELECT 
      r.id,
      r.name_request,
      r.description,
      r.address,
      r.status,
      r.created_at,
      r.requested_date,
      r.requested_time,
      s.name AS service_name,
      sc.name AS category_name,
      sc.color AS category_color
    FROM requests r
    JOIN services s ON r.service_id = s.id
    JOIN service_categories sc ON s.category_id = sc.id
    WHERE 
      r.user_id = ?
      ${statusCondition}
      AND (
        r.name_request LIKE ? OR
        r.address LIKE ? OR
        s.name LIKE ? OR
        sc.name LIKE ?
      )
    ORDER BY r.created_at DESC
    LIMIT ? OFFSET ?
    `,
      params
    );

    // Count
    const countParams = [userId];
    if (mappedStatuses) countParams.push(...mappedStatuses);
    countParams.push(search, search, search, search);

    const [[{ total }]] = await db.query(
      `
    SELECT COUNT(*) AS total
    FROM requests r
    JOIN services s ON r.service_id = s.id
    JOIN service_categories sc ON s.category_id = sc.id
    WHERE 
      r.user_id = ?
      ${statusCondition}
      AND (
        r.name_request LIKE ? OR
        r.address LIKE ? OR
        s.name LIKE ? OR
        sc.name LIKE ?
      )
    `,
      countParams
    );

    return { data: rows, total };
  },
  // ===============================
  // 🔹 Lấy danh sách yêu cầu được gán cho thợ
  // ===============================
  async getRequestsByTechnician({
    technicianId,
    keySearch = "",
    status = "all",
    limit = 10,
    offset = 0,
  }) {
    const search = `%${keySearch}%`;

    // map status cho thợ
    const mappedStatuses = STATUS_GROUP_TECHNICIAN[status] || null;

    let statusCondition = "";
    const params = [technicianId];

    if (mappedStatuses) {
      statusCondition = `AND r.status IN (${mappedStatuses
        .map(() => "?")
        .join(",")})`;
      params.push(...mappedStatuses);
    }

    params.push(search, search, search, search, limit, offset);

    const [rows] = await db.query(
      `
    SELECT 
      r.id,
      r.name_request,
      r.description,
      r.address,
      r.status,
      r.created_at,
      r.requested_date,
      r.requested_time,
      s.name AS service_name,
      sc.name AS category_name,
      sc.color AS category_color,
      u.full_name AS customer_name,
      u.avatar_link AS customer_avatar,
      u.phone AS customer_phone
    FROM requests r
    JOIN services s ON r.service_id = s.id
    JOIN service_categories sc ON s.category_id = sc.id
    JOIN users u ON r.user_id = u.id
    WHERE 
      r.technician_id = ?
      ${statusCondition}
      AND (
        r.name_request LIKE ? OR
        r.address LIKE ? OR
        s.name LIKE ? OR
        sc.name LIKE ?
      )
    ORDER BY r.created_at DESC
    LIMIT ? OFFSET ?
    `,
      params
    );

    // Count
    const countParams = [technicianId];
    if (mappedStatuses) countParams.push(...mappedStatuses);
    countParams.push(search, search, search, search);

    const [[{ total }]] = await db.query(
      `
    SELECT COUNT(*) AS total
    FROM requests r
    JOIN services s ON r.service_id = s.id
    JOIN service_categories sc ON s.category_id = sc.id
    WHERE 
      r.technician_id = ?
      ${statusCondition}
      AND (
        r.name_request LIKE ? OR
        r.address LIKE ? OR
        s.name LIKE ? OR
        sc.name LIKE ?
      )
    `,
      countParams
    );

    return { data: rows, total };
  },
  // ===============================
  // 🔹 Lấy chi tiết yêu cầu
  // ===============================
  async getRequestDetail(id) {
    // 1️⃣ Lấy thông tin chính của yêu cầu
    const [rows] = await db.query(
      `
    SELECT 
      r.id,
      r.name_request,
      r.description,
      r.address,
      r.requested_date,
      r.requested_time,
      r.status,
      r.cancel_reason,
      r.created_at,
      r.completed_at,
      sc.name AS category_name,
      sc.color AS category_color,

      -- Thông tin khách hàng
      c.id AS customer_id,
      c.full_name AS customer_name,
      c.avatar_link AS customer_avatar,
      c.phone AS customer_phone,

      -- Thông tin thợ
      t.id AS technician_id,
      t.full_name AS technician_name,
      t.avatar_link AS technician_avatar,
      t.phone AS technician_phone,

      -- Thông tin dịch vụ
      s.name AS service_name,
      s.description AS service_description
    FROM requests r
    JOIN users c ON r.user_id = c.id
    JOIN services s ON r.service_id = s.id
    LEFT JOIN service_categories sc ON s.category_id = sc.id
    LEFT JOIN users t ON r.technician_id = t.id
    WHERE r.id = ?
    `,
      [id]
    );

    if (rows.length === 0) return null;
    const request = rows[0];

    // 2️⃣ Lấy ảnh request
    const [images] = await db.query(
      `
    SELECT 
      image_url,
      type,
      uploaded_by,
      u.full_name AS uploaded_by_name,
      u.avatar_link AS uploaded_by_avatar
    FROM request_images ri
    JOIN users u ON ri.uploaded_by = u.id
    WHERE ri.request_id = ?
    ORDER BY ri.created_at ASC
    `,
      [id]
    );

    // 3️⃣ Lấy báo giá
    const [quotationRows] = await db.query(
      `
      SELECT 
        q.id AS quotation_id,
        q.total_price,
        qi.id AS item_id,
        qi.name AS item_name,
        qi.price AS item_price,
        qi.status AS item_status,
        qi.note AS item_note,
        qi.reason AS item_reason,
        ii.id AS image_id,
        ii.image_url AS image_url,
        ii.created_at AS image_created_at
      FROM quotations q
      LEFT JOIN quotation_items qi 
            ON q.id = qi.quotation_id
      LEFT JOIN quotation_items_images ii
            ON qi.id = ii.quotation_item_id
      WHERE q.request_id = ?
      ORDER BY qi.created_at ASC, ii.created_at ASC
    `,
      [id]
    );

    let quotationData = null;
    if (quotationRows.length > 0 && quotationRows[0].quotation_id) {
      const mapItems = {};

      quotationRows.forEach((row) => {
        if (!row.item_id) return;

        if (!mapItems[row.item_id]) {
          mapItems[row.item_id] = {
            id: row.item_id,
            name: row.item_name,
            price: Number(row.item_price),
            status: row.item_status,
            note: row.item_note,
            reason: row.item_reason,
            images: [],
          };
        }

        if (row.image_url) {
          mapItems[row.item_id].images.push({
            id: row.image_id,
            url: row.image_url,
            created_at: row.image_created_at,
          });
        }
      });

      quotationData = {
        total_price: Number(quotationRows[0].total_price),
        data: Object.values(mapItems),
      };
    }
    // 5️⃣ Trả về full object
    return {
      id: request.id,
      name_request: request.name_request,
      description: request.description,
      address: request.address,
      requested_date: request.requested_date,
      requested_time: request.requested_time,
      status: request.status,
      cancel_reason: request.cancel_reason,
      created_at: request.created_at,
      completed_at: request.completed_at,

      category: {
        name: request.category_name,
        color: request.category_color,
      },

      customer: {
        id: request.customer_id,
        name: request.customer_name,
        avatar: request.customer_avatar,
        phone: request.customer_phone,
      },

      technician: request.technician_id
        ? {
            id: request.technician_id,
            name: request.technician_name,
            avatar: request.technician_avatar,
            phone: request.technician_phone,
          }
        : null,

      service: {
        name: request.service_name,
        description: request.service_description,
      },

      survey_images: images.filter((img) => img.type === "survey"),
      scene_images: images.filter((img) => img.type === "pending"),
      quotations: quotationData,
    };
  },

  // 5. Admin gán thợ
  async assignRequest({ request_id, technician_id, admin_id, reason }) {
    return await withTransaction(async (conn) => {
      const [[old]] = await conn.query(
        "SELECT technician_id, status FROM requests WHERE id = ?",
        [request_id]
      );

      await updateRequestStatus(
        request_id,
        "assigning",
        { technician_id },
        conn
      );

      await conn.query(
        `INSERT INTO request_assignments 
         (id, request_id, old_technician_id, new_technician_id, assigned_by, reason)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          generateId("ASSIGN"),
          request_id,
          old?.technician_id || null,
          technician_id,
          admin_id,
          reason || "Admin gán thợ",
        ]
      );

      await insertStatusLog({
        request_id,
        old_status: old?.status || "pending",
        new_status: "assigning",
        changed_by: admin_id,
        reason: "Admin gán thợ",
        connection: conn,
      });

      return { request_id, technician_id };
    });
  },

  // 6. Thợ chấp nhận / từ chối
  async technicianResponse({ request_id, technician_id, action, reason }) {
    return await withTransaction(async (conn) => {
      const [[request]] = await conn.query(
        "SELECT status FROM requests WHERE id = ? AND technician_id = ?",
        [request_id, technician_id]
      );
      if (!request)
        throw new Error(
          "Yêu cầu không tồn tại hoặc không được gán cho thợ này"
        );

      const isAccept = action === "accept";
      const newStatus = isAccept ? "assigned" : "pending";
      const newTechId = isAccept ? technician_id : null;

      await updateRequestStatus(
        request_id,
        newStatus,
        { technician_id: newTechId },
        conn
      );

      await insertStatusLog({
        request_id,
        old_status: request.status,
        new_status: newStatus,
        changed_by: technician_id,
        reason: isAccept
          ? "Thợ chấp nhận yêu cầu"
          : reason || "Thợ từ chối yêu cầu",
        connection: conn,
      });

      return { request_id, status: newStatus };
    });
  },

  // 7. Thợ gửi báo giá
  async createQuotation({ request_id, technician_id, items }) {
    return await withTransaction(async (conn) => {
      const quotationId = generateId("QUOTE");
      const total_price = items.reduce(
        (sum, i) => sum + Number(i.price || 0),
        0
      );

      await conn.query(
        `INSERT INTO quotations (id, request_id, technician_id, total_price)
         VALUES (?, ?, ?, ?)`,
        [quotationId, request_id, technician_id, total_price]
      );

      const itemValues = items.map((item) => [
        generateId("QITEM"),
        quotationId,
        item.name,
        Number(item.price || 0),
        technician_id,
      ]);
      await conn.query(
        `INSERT INTO quotation_items (id, quotation_id, name, price, report_by) VALUES ?`,
        [itemValues]
      );

      await updateRequestStatus(request_id, "quoted", {}, conn);
      await insertStatusLog({
        request_id,
        old_status: "assigned",
        new_status: "quoted",
        changed_by: technician_id,
        reason: "Thợ gửi báo giá",
        connection: conn,
      });

      return quotationId;
    });
  },

  // 8. Khách phản hồi báo giá (Chấp nhận / Từ chối)
  async quotationResponse({ request_id, user_id, action, reason }) {
    return await withTransaction(async (conn) => {
      // 1. Kiểm tra request tồn tại + thuộc về khách
      const [[request]] = await conn.query(
        `SELECT status, technician_id FROM requests WHERE id = ? AND user_id = ? FOR UPDATE`,
        [request_id, user_id]
      );

      if (!request) {
        throw new Error("Yêu cầu không tồn tại hoặc không phải của bạn");
      }

      if (request.status !== "quoted" && request.status !== "customer_review") {
        throw new Error(
          "Chỉ được phản hồi khi đang ở trạng thái báo giá hoặc khách kiểm tra"
        );
      }

      const isAccept = action === "accept";
      const newRequestStatus = isAccept ? "in_progress" : "cancelled";

      // 2. Nếu khách CHẤP NHẬN → update tất cả quotation_items thành in_progress
      if (isAccept) {
        // Lấy quotation hiện tại
        const [[quotation]] = await conn.query(
          `SELECT id FROM quotations WHERE request_id = ?`,
          [request_id]
        );

        if (quotation) {
          await conn.query(
            `UPDATE quotation_items 
             SET status = 'in_progress'
             WHERE quotation_id = ? AND status = 'pending'`,
            [quotation.id]
          );

          // Ghi log cho từng item (tùy chọn, nếu anh muốn chi tiết)
          // Hoặc chỉ ghi 1 log chung ở request là đủ
        }
      }

      // 3. Cập nhật trạng thái request
      await updateRequestStatus(
        request_id,
        newRequestStatus,
        {
          cancel_reason: !isAccept ? reason : null,
          cancel_by: !isAccept ? user_id : null,
        },
        conn
      );

      // 4. Ghi log trạng thái request
      await insertStatusLog({
        request_id,
        old_status: request.status,
        new_status: newRequestStatus,
        changed_by: user_id,
        reason: isAccept
          ? "Khách hàng chấp nhận báo giá, bắt đầu thực hiện công việc"
          : reason || "Khách hàng từ chối báo giá",
        connection: conn,
      });

      // 5. (Tùy chọn) Ghi log riêng cho quotation_items nếu cần audit chi tiết
      if (isAccept) {
        const logId = generateId("QLOG");
        await conn.query(
          `INSERT INTO quotation_items_logs 
          (id, quotation_item_id, old_status, new_status, note, changed_by, created_at)
          SELECT 
            CONCAT('QLOG_', id, '_', UUID()), 
            id, 
            'pending', 
            'in_progress', 
            'Khách chấp nhận báo giá', 
            ?, 
            NOW()
          FROM quotation_items 
          WHERE quotation_id = (SELECT id FROM quotations WHERE request_id = ?)`,
          [user_id, request_id]
        );
      }

      return {
        success: true,
        request_id,
        new_status: newRequestStatus,
        message: isAccept
          ? "Chấp nhận báo giá thành công! Thợ sẽ bắt đầu làm ngay."
          : "Đã từ chối báo giá.",
      };
    });
  },

  // 9. Cập nhật tiến độ từng mục công việc
  async updateItemProgress({ request_id, technician_id, items }) {
    return await withTransaction(async (conn) => {
      const [[{ id: quotation_id }]] = await conn.query(
        `SELECT id FROM quotations WHERE request_id = ?`,
        [request_id]
      );
      if (!quotation_id) throw new Error("Không tìm thấy báo giá");

      for (const item of items) {
        const { id: item_id, status, note, images = [], reason } = item;
        if (!item_id) continue;

        const [[old]] = await conn.query(
          `SELECT status FROM quotation_items WHERE id = ?`,
          [item_id]
        );
        if (!old) continue;

        await conn.query(
          `UPDATE quotation_items SET status = ?, note = ?, reason = ? WHERE id = ?`,
          [status, note || null, reason || null, item_id]
        );

        await conn.query(
          `DELETE FROM quotation_items_images WHERE quotation_item_id = ?`,
          [item_id]
        );
        if (images.length > 0) {
          const values = images.map((url) => [
            generateId("QIMG"),
            item_id,
            technician_id,
            url,
          ]);
          await conn.query(
            `INSERT INTO quotation_items_images (id, quotation_item_id, uploaded_by, image_url) VALUES ?`,
            [values]
          );
        }

        await conn.query(
          `INSERT INTO quotation_items_logs 
           (id, quotation_item_id, old_status, new_status, note, changed_by)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            generateId("QLOG"),
            item_id,
            old.status,
            status,
            reason,
            technician_id,
          ]
        );
      }

      const [rows] = await conn.query(
        `SELECT status FROM quotation_items WHERE quotation_id = ?`,
        [quotation_id]
      );

      const allCompleted =
        rows.length > 0 && rows.every((r) => r.status === "completed");
      const nextStatus = allCompleted ? "customer_review" : "in_progress";

      await updateRequestStatus(request_id, nextStatus, {}, conn);

      if (allCompleted) {
        await insertStatusLog({
          request_id,
          old_status: "in_progress",
          new_status: "customer_review",
          changed_by: technician_id,
          reason: "Hoàn thành toàn bộ công việc",
          connection: conn,
        });
      }

      return { request_status: nextStatus };
    });
  },

  // 10. Khách xác nhận hoàn thành → tạo payment
  async setCompleted({ request_id, user_id }) {
    const [[request]] = await db.query(
      `SELECT status FROM requests WHERE id = ? AND user_id = ?`,
      [request_id, user_id]
    );
    if (!request || request.status !== "customer_review") {
      throw new Error("Không thể hoàn tất ở trạng thái hiện tại");
    }

    const [[quotation]] = await db.query(
      `SELECT total_price FROM quotations WHERE request_id = ?`,
      [request_id]
    );
    if (!quotation) throw new Error("Không tìm thấy báo giá");

    const paymentId = generateId("PAY");

    await db.query(
      `INSERT INTO payments (id, request_id, payment_method, amount, payment_status)
       VALUES (?, ?, 'qr', ?, 'pending')`,
      [paymentId, request_id, quotation.total_price]
    );

    await updateRequestStatus(request_id, "payment", { completed_at: true });

    await insertStatusLog({
      request_id,
      old_status: request.status,
      new_status: "payment",
      changed_by: user_id,
      reason: "Khách xác nhận hoàn thành, chờ thanh toán",
    });

    return {
      request_id,
      payment_id: paymentId,
      payment_amount: quotation.total_price,
      new_status: "payment",
    };
  },
};
