import { CategoryModel } from "../models/category.model.js";
import { baseResponse } from "../utils/response.helper.js";

export const CategoryController = {
  // ===============================
  // 🔹 Lấy tất cả danh mục
  // ===============================
  async getAll(req, res) {
    try {
      const categories = await CategoryModel.getAll();
      return baseResponse(res, {
        code: 200,
        data: categories,
        message: "Lấy danh sách danh mục thành công",
      });
    } catch (error) {
      console.error("GetAllCategories:", error);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server khi lấy danh mục",
      });
    }
  },
  // ===============================
  // 🔹 Lấy danh mục có phân trang
  // ===============================
  async getListPaginated(req, res) {
    try {
      let { page = 1, size = 10, keySearch = "" } = req.body;
      page = Number(page);
      size = Number(size);

      if (page < 1) page = 1;
      if (size < 1) size = 10;

      const offset = (page - 1) * size;

      const { data, total } = await CategoryModel.getPaginated({
        keySearch,
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
          total,
          totalPages: Math.ceil(total / size),
          data: data,
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
  // 🔹 Lấy danh mục theo ID
  // ===============================
  async getById(req, res) {
    try {
      const category = await CategoryModel.getById(req.params.id);
      if (!category)
        return baseResponse(res, {
          code: 404,
          status: false,
          message: "Không tìm thấy danh mục",
        });

      return baseResponse(res, {
        code: 200,
        data: category,
        message: "Lấy thông tin danh mục thành công",
      });
    } catch (error) {
      console.error("GetByIdCategory:", error);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server khi lấy chi tiết danh mục",
      });
    }
  },

  // ===============================
  // 🔹 Tạo danh mục mới
  // ===============================
  async create(req, res) {
    try {
      const { name, description } = req.body;
      const icon = req.file ? `/uploads/${req.file.filename}` : null;

      if (!name) {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Thiếu tên danh mục",
        });
      }
      // 🔍 Kiểm tra danh mục đã tồn tại chưa
      const existed = await CategoryModel.getByName(name);
      if (existed) {
        return baseResponse(res, {
          code: 409, // conflict
          status: false,
          message: "Tên danh mục đã tồn tại!",
        });
      }
      const id = await CategoryModel.create({ name, description, icon });

      return baseResponse(res, {
        code: 201,
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
  // 🔹 Cập nhật danh mục
  // ===============================
  async update(req, res) {
    try {
      const id = req.params.id;
      const { name, description } = req.body;
      const icon = req.file ? `/uploads/${req.file.filename}` : null;

      // Kiểm tra tồn tại danh mục cần cập nhật
      const current = await CategoryModel.getById(id);
      if (!current) {
        return baseResponse(res, {
          code: 404,
          status: false,
          message: "Không tìm thấy danh mục để cập nhật",
        });
      }

      // Nếu có name mới -> kiểm tra trùng
      if (name) {
        const existed = await CategoryModel.getByName(name);
        if (existed && existed.id !== Number(id)) {
          return baseResponse(res, {
            code: 409,
            status: false,
            message: "Tên danh mục đã tồn tại!",
          });
        }
      }

      // Tiến hành cập nhật
      const affected = await CategoryModel.update(id, {
        name,
        description,
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
  // 🔹 Xóa danh mục
  // ===============================
  async delete(req, res) {
    try {
      const id = req.params.id;

      // Kiểm tra danh mục có tồn tại không
      const category = await CategoryModel.getById(id);
      if (!category) {
        return baseResponse(res, {
          code: 404,
          status: false,
          message: "Không tìm thấy danh mục để xóa",
        });
      }

      // Nếu đã bị ẩn rồi thì không cần xóa lại
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
  // ===============================
  // 🔹 Lấy tất cả service của 1 danh mục
  // ===============================
  async getServicesByCategory(req, res) {
    try {
      const categoryId = req.params.id;

      // Kiểm tra danh mục có tồn tại không
      const category = await CategoryModel.getById(categoryId);
      if (!category) {
        return baseResponse(res, {
          code: 404,
          status: false,
          message: "Không tìm thấy danh mục",
        });
      }

      // Lấy danh sách service con
      const services = await CategoryModel.getServicesByCategory(categoryId);

      return baseResponse(res, {
        code: 200,
        message: "Lấy danh sách dịch vụ thành công",
        data: {
          category,
          services,
        },
      });
    } catch (error) {
      console.error("GetServicesByCategory:", error);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server khi lấy dịch vụ theo danh mục",
      });
    }
  },
};
