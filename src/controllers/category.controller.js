import { CategoryModel } from "../models/category.model.js";
import { baseResponse } from "../utils/response.helper.js";
import dotenv from "dotenv";
dotenv.config();

export const CategoryController = {
  // ===============================
  // 🔹 Lấy danh sách active cho khách hàng
  // ===============================
  async getListForCustomer(req, res) {
    try {
      const data = await CategoryModel.getActiveCategories();
      return baseResponse(res, {
        code: 200,
        status: true,
        message: "Lấy danh sách danh mục thành công",
        data: {
          data,
        },
      });
    } catch (error) {
      console.error("GetActiveCategories:", error);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server khi lấy danh sách danh mục",
      });
    }
  },

  // ===============================
  // 🔹 Lấy danh mục có phân trang (Admin)
  // ===============================
  async getListPaginated(req, res) {
    try {
      let { page = 1, size = 10, keySearch = "", status = "all" } = req.body;

      page = Math.max(Number(page), 1);
      size = Math.max(Number(size), 1);
      const offset = (page - 1) * size;

      const { data, total } = await CategoryModel.getPaginated({
        keySearch,
        status,
        limit: size,
        offset,
      });

      return baseResponse(res, {
        code: 200,
        status: true,
        message: "Lấy danh sách danh mục thành công",
        data: {
          page,
          size,
          totalRecord: total,
          totalPages: Math.ceil(total / size),
          data,
        },
      });
    } catch (error) {
      console.error("getListPaginated:", error);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server khi lấy danh mục có phân trang",
      });
    }
  },

  // ===============================
  // 🔹 Tạo danh mục mới (Admin)
  // ===============================
  async create(req, res) {
    try {
      const { name, description, color, status } = req.body;

      // URL icon lấy trực tiếp từ Cloudinary do multer-storage-cloudinary trả về
      const icon = req.file ? req.file.path : null;

      if (!name) {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Thiếu tên danh mục",
        });
      }

      // Kiểm tra tên trùng
      const existed = await CategoryModel.checkNameExists(name);
      if (existed) {
        return baseResponse(res, {
          code: 409,
          status: false,
          message: "Tên danh mục đã tồn tại!",
        });
      }

      // Lưu DB
      const id = await CategoryModel.create({
        name,
        description,
        color,
        icon,
        status,
      });

      return baseResponse(res, {
        code: 200,
        message: "Thêm danh mục thành công",
        data: { id, name, icon },
      });
    } catch (error) {
      console.error(error);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server khi thêm danh mục",
      });
    }
  },
  // ===============================
  // 🔹 Cập nhật danh mục (Admin)
  // ===============================
  async update(req, res) {
    try {
      const { id, name, description, color, status } = req.body;

      const icon = req.file
        ? `${process.env.URL_SERVER}/uploads/${req.file.filename}`
        : null;

      const current = await CategoryModel.getById(id);
      if (!current) {
        return baseResponse(res, {
          code: 404,
          status: false,
          message: "Không tìm thấy danh mục để cập nhật",
        });
      }

      if (name && (await CategoryModel.checkNameExists(name, id))) {
        return baseResponse(res, {
          code: 409,
          status: false,
          message: "Tên danh mục đã tồn tại!",
        });
      }

      const affected = await CategoryModel.update(id, {
        name,
        description,
        color,
        status,
        icon: icon || current.icon,
      });

      if (!affected) {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Không thể cập nhật danh mục",
        });
      }

      return baseResponse(res, {
        code: 200,
        status: true,
        message: "Cập nhật danh mục thành công",
      });
    } catch (error) {
      console.error("UpdateCategory:", error);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server khi cập nhật danh mục",
      });
    }
  },

  // ===============================
  // 🔹 Xóa danh mục (Admin) - chuyển trạng thái = 0
  // ===============================
  async delete(req, res) {
    try {
      const id = req.params.id;
      const category = await CategoryModel.getById(id);

      if (!category) {
        return baseResponse(res, {
          code: 404,
          status: false,
          message: "Không tìm thấy danh mục để xóa",
        });
      }

      if (category.status === 0) {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Danh mục này đã bị ẩn trước đó",
        });
      }

      const affected = await CategoryModel.delete(id);

      if (!affected) {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Không thể xóa danh mục",
        });
      }

      return baseResponse(res, {
        message: "Xóa danh mục thành công",
      });
    } catch (error) {
      console.error("DeleteCategory:", error);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server khi xóa danh mục",
      });
    }
  },
};
