import { ppid } from "process";
import db from "../config/db.js";
import { generateId } from "../utils/crypto.js";

export const RequestModel = {
  // ===============================
  // 🔹 Tạo yêu cầu mới
  // ===============================
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
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const requestId = generateId("REQ_"); // ví dụ: REQ-ABCD1234

      // 1️⃣ Insert vào bảng requests
      await connection.query(
        `
        INSERT INTO requests (id, user_id, service_id, name_request, description, address, requested_date, requested_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
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

      // 2️⃣ Nếu có ảnh thì thêm vào request_images
      if (images && images.length > 0) {
        const imageValues = images.map((url) => [
          generateId("IMG"),
          requestId,
          user_id,
          url,
        ]);
        await connection.query(
          `INSERT INTO request_images (id, request_id, uploaded_by, image_url) VALUES ?`,
          [imageValues]
        );
      }

      // 3️⃣ Ghi log trạng thái ban đầu
      await connection.query(
        `
        INSERT INTO request_status_logs (id, request_id, old_status, new_status, changed_by, reason)
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          generateId("LOG"),
          requestId,
          null,
          "pending",
          user_id,
          "Khách hàng tạo yêu cầu mới",
        ]
      );

      await connection.commit();
      connection.release();

      return requestId;
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  },

  // Thêm danh sách ảnh cho yêu cầu
  async addImages(requestId, userId, images) {
    if (!images || images.length === 0) return;

    const values = images.map((url) => [requestId, userId, url]);
    await db.query(
      `INSERT INTO request_images (request_id, uploaded_by, image_url) VALUES ?`,
      [values]
    );
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

    // Nếu status = all thì không filter theo trạng thái
    let statusCondition = "";
    const params = [userId, search, search, search, search, limit, offset];

    if (status !== "all") {
      statusCondition = "AND r.status = ?";
      params.splice(1, 0, status); // thêm status ngay sau user_id
    }

    // Truy vấn danh sách yêu cầu
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

    // Đếm tổng số
    const countParams = [userId, search, search, search, search];
    if (status !== "all") countParams.splice(1, 0, status);

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

    let statusCondition = "";
    const params = [
      technicianId,
      search,
      search,
      search,
      search,
      limit,
      offset,
    ];

    if (status !== "all") {
      statusCondition = "AND r.status = ?";
      params.splice(1, 0, status); // thêm status ngay sau technicianId
    }

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

    // Đếm tổng số bản ghi
    const countParams = [technicianId, search, search, search, search];
    if (status !== "all") countParams.splice(1, 0, status);

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

    // 2️⃣ Lấy ảnh liên quan
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
      qi.id AS item_id,
      qi.name AS item_name,
      qi.price AS item_price,
      q.total_price
    FROM quotations q
    LEFT JOIN quotation_items qi ON q.id = qi.quotation_id
    WHERE q.request_id = ?
    ORDER BY qi.created_at ASC
    `,
      [id]
    );

    let quotationData = {
      data: [],
      total_price: 0,
    };

    if (quotationRows.length > 0) {
      quotationData = {
        data: quotationRows.map((row) => ({
          id: row.item_id,
          name: row.item_name,
          price: Number(row.item_price),
        })),
        total_price: Number(quotationRows[0].total_price || 0),
      };
    }

    // 4️⃣ Gom dữ liệu trả về
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

  // ===============================
  // 🔹 Admin gán yêu cầu cho thợ
  // ===============================
  async assignRequest({ request_id, technician_id, admin_id, reason }) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Lấy thợ cũ (nếu có)
      const [[old]] = await connection.query(
        "SELECT technician_id, status FROM requests WHERE id = ?",
        [request_id]
      );
      const oldTech = old?.technician_id || null;

      // Cập nhật yêu cầu
      await connection.query(
        `
        UPDATE requests 
        SET technician_id = ?, status = 'assigning', updated_at = NOW()
        WHERE id = ?
        `,
        [technician_id, request_id]
      );

      // Ghi log gán
      await connection.query(
        `
        INSERT INTO request_assignments (id, request_id, old_technician_id, new_technician_id, assigned_by, reason)
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          generateId("ASSIGN"),
          request_id,
          oldTech,
          technician_id,
          admin_id,
          reason || "Gán yêu cầu mới cho thợ",
        ]
      );

      // Ghi log trạng thái
      await connection.query(
        `
        INSERT INTO request_status_logs (id, request_id, old_status, new_status, changed_by, reason)
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          generateId("LOG"),
          request_id,
          old?.status || "pending",
          "assigning",
          admin_id,
          "Admin gán yêu cầu cho thợ",
        ]
      );

      await connection.commit();
      connection.release();
      return { request_id, technician_id };
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  },

  // ===============================
  // 🔹 Thợ phản hồi (chấp nhận / từ chối)
  // ===============================
  async technicianResponse({ request_id, technician_id, action, reason }) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Lấy thông tin hiện tại của request
      const [[request]] = await connection.query(
        "SELECT status FROM requests WHERE id = ? AND technician_id = ?",
        [request_id, technician_id]
      );

      if (!request)
        throw new Error(
          "Yêu cầu không tồn tại hoặc không được gán cho thợ này"
        );

      let newStatus = "";
      let logReason = "";
      let newTechnicianId = technician_id;

      if (action === "accept") {
        newStatus = "assigned";
        logReason = "Thợ chấp nhận yêu cầu";
      } else if (action === "reject") {
        newStatus = "pending"; // quay lại trạng thái chờ admin xử lý
        logReason = reason || "Thợ từ chối yêu cầu";
        newTechnicianId = null; // ❗ bỏ gán thợ
      } else {
        throw new Error(
          "Hành động không hợp lệ. Chỉ chấp nhận 'accept' hoặc 'reject'"
        );
      }

      // Cập nhật trạng thái + xử lý gán lại thợ (nếu từ chối)
      await connection.query(
        `
      UPDATE requests 
      SET status = ?, technician_id = ?, updated_at = NOW()
      WHERE id = ?
      `,
        [newStatus, newTechnicianId, request_id]
      );

      // Ghi log trạng thái
      await connection.query(
        `
      INSERT INTO request_status_logs (id, request_id, old_status, new_status, changed_by, reason)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
        [
          generateId("LOG"),
          request_id,
          request.status,
          newStatus,
          technician_id,
          logReason,
        ]
      );

      await connection.commit();
      connection.release();

      return { request_id, status: newStatus };
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  },

  async updateStatus(requestId, status) {
    await db.query(`UPDATE requests SET status = ? WHERE id = ?`, [
      status,
      requestId,
    ]);
  },

  async insertStatusLog({
    id,
    requestId,
    oldStatus,
    newStatus,
    changedBy,
    reason,
  }) {
    await db.query(
      `INSERT INTO request_status_logs (id, request_id, old_status, new_status, changed_by, reason)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, requestId, oldStatus, newStatus, changedBy, reason]
    );
  },

  async insertSurveyImages(requestId, technicianId, images) {
    const values = images.map((url) => [
      requestId,
      technicianId,
      url,
      "survey",
    ]);
    await db.query(
      `INSERT INTO request_images (request_id, uploaded_by, image_url, type)
       VALUES ?`,
      [values]
    );
  },

  async insertQuotationItems(requestId, technicianId, items) {
    for (const item of items) {
      await db.query(
        `INSERT INTO quotations (id, request_id, technician_id, name, price)
         VALUES (UUID(), ?, ?, ?, ?)`,
        [requestId, technicianId, item.name, item.price]
      );
    }
  },

  // ===============================
  // 🔹 Thợ gửi báo giá (Model)
  // ===============================
  async createQuotation({ request_id, technician_id, items }) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const quotationId = generateId("QUOTE");

      // 1️⃣ Thêm vào bảng quotations
      const total_price = items.reduce(
        (sum, item) => sum + Number(item.price || 0),
        0
      );
      await connection.query(
        `INSERT INTO quotations (id, request_id, technician_id, total_price)
       VALUES (?, ?, ?, ?)`,
        [quotationId, request_id, technician_id, total_price]
      );

      // 2️⃣ Thêm từng item chi tiết
      const itemValues = items.map((item) => [
        generateId("QITEM"),
        quotationId,
        item.name,
        item.price,
      ]);
      await connection.query(
        `INSERT INTO quotation_items (id, quotation_id, name, price) VALUES ?`,
        [itemValues]
      );

      await connection.commit();
      connection.release();

      return quotationId;
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  },
};
