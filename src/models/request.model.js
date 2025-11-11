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

  async getRequestDetail(id) {
    const [rows] = await db.query(
      `
      SELECT 
        r.id,
        r.name_request,
        r.description,
        r.address,
        r.requested_time,
        r.status,
        r.cancel_reason,
        r.created_at,
        r.completed_at,
        
        -- Người tạo request
        c.id AS customer_id,
        c.full_name AS customer_name,
        c.avatar_link AS customer_avatar,
        c.phone AS customer_phone,
        
        -- Thợ được gán
        t.id AS technician_id,
        t.full_name AS technician_name,
        t.avatar_link AS technician_avatar,
        
        s.name AS service_name,
        s.description AS service_description
        
      FROM requests r
      JOIN users c ON r.user_id = c.id
      JOIN services s ON r.service_id = s.id
      LEFT JOIN users t ON r.technician_id = t.id
      WHERE r.id = ?
      `,
      [id]
    );

    if (rows.length === 0) return null;

    const request = rows[0];

    // Lấy ảnh khảo sát, trong quá trình, hoàn thành...
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

    request.images = images || [];

    return request;
  },
};
