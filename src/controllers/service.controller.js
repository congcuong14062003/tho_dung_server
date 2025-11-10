import { CategoryModel } from "../models/category.model.js";
import { ServiceModel } from "../models/service.model.js";
import { baseResponse } from "../utils/response.helper.js";

export const ServiceController = {
  // ===============================
  // 🔹 Lấy danh sách service theo danh mục
  // ===============================
  async getByCategory(req, res) {
    try {
      const categoryId = req.params.categoryId;
      const category = await CategoryModel.getById(categoryId);
      if (!category) {
        return baseResponse(res, {
          code: 404,
          status: false,
          message: "Không tìm thấy danh mục",
        });
      }

      const services = await ServiceModel.getByCategory(categoryId);
      return baseResponse(res, {
        code: 200,
        message: "Lấy danh sách dịch vụ thành công",
        data: { category, services },
      });
    } catch (error) {
      console.error("GetByCategoryServices:", error);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server khi lấy dịch vụ",
      });
    }
  },

  // ===============================
  // 🔹 Tạo mới service
  // ===============================
  async create(req, res) {
    try {
      const { category_id, name, description, base_price } = req.body;

      if (!category_id || !name) {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Vui lòng chọn danh mục và tên dịch vụ",
        });
      }

      // Kiểm tra danh mục tồn tại
      const category = await CategoryModel.getById(category_id);
      if (!category)
        return baseResponse(res, {
          code: 404,
          status: false,
          message: "Không tìm thấy danh mục",
        });

      // Kiểm tra trùng tên trong danh mục
      const existed = await ServiceModel.getByNameInCategory(name, category_id);
      if (existed)
        return baseResponse(res, {
          code: 409,
          status: false,
          message: "Tên dịch vụ đã tồn tại trong danh mục này",
        });

      const id = await ServiceModel.create({
        category_id,
        name,
        description,
        base_price,
      });

      return baseResponse(res, {
        code: 200,
        message: "Thêm dịch vụ thành công",
        data: { id, name, base_price },
      });
    } catch (error) {
      console.error("CreateService:", error);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server khi thêm dịch vụ",
      });
    }
  },
  // ===============================
  // 🔹 Cập nhật service
  // ===============================
  async update(req, res) {
    try {
      const id = req.params.id;
      const { name, description, base_price, category_id } = req.body; // 👈 FE gửi "base_price"

      // Kiểm tra service có tồn tại không
      const service = await ServiceModel.getById(id);
      if (!service)
        return baseResponse(res, {
          code: 404,
          status: false,
          message: "Không tìm thấy dịch vụ để cập nhật",
        });

      // Kiểm tra trùng tên trong danh mục
      const existed = await ServiceModel.getByNameInCategory(name, category_id);
      if (existed && existed.id !== parseInt(id))
        return baseResponse(res, {
          code: 409,
          status: false,
          message: "Tên dịch vụ đã tồn tại trong danh mục này",
        });

      // Cập nhật dữ liệu
      const affected = await ServiceModel.update(id, {
        name,
        description,
        base_price,
        category_id,
      });

      if (!affected)
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Không có thay đổi nào được áp dụng",
        });

      return baseResponse(res, {
        code: 200,
        message: "Cập nhật dịch vụ thành công",
      });
    } catch (error) {
      console.error("UpdateService:", error);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server khi cập nhật dịch vụ",
      });
    }
  },
  // ===============================
  // 🔹 Xóa service (status = 0)
  // ===============================
  async delete(req, res) {
    try {
      const id = req.params.id;
      const affected = await ServiceModel.delete(id);
      if (!affected)
        return baseResponse(res, {
          code: 404,
          status: false,
          message: "Không tìm thấy dịch vụ để xóa",
        });

      return baseResponse(res, {
        code: 200,
        message: "Xóa dịch vụ thành công",
      });
    } catch (error) {
      console.error("DeleteService:", error);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server khi xóa dịch vụ",
      });
    }
  },
};
