import { CategoryModel } from "../models/category.model.js";
import { ServiceModel } from "../models/service.model.js";
import { baseResponse } from "../utils/response.helper.js";

export const ServiceController = {
  // ===============================
  // 🔹 Lấy danh sách service (Admin, phân trang, filter category & keySearch)
  // ===============================
  async getList(req, res) {
    try {
      const { page = 1, size = 50, keySearch = "", catId = "all" } = req.body;

      const limit = Number(size);
      const offset = (Number(page) - 1) * limit;

      let services = [];
      let totalRecord = 0;

      if (catId === "all") {
        services = await ServiceModel.getAll(keySearch, limit, offset);
        totalRecord = await ServiceModel.countAll(keySearch);
      } else {
        services = await ServiceModel.getByCategory(catId, keySearch, limit, offset);
        totalRecord = await ServiceModel.countByCategory(catId, keySearch);
      }

      return baseResponse(res, {
        code: 200,
        status: true,
        message: "Lấy danh sách dịch vụ thành công",
        data: { services, totalRecord },
      });
    } catch (error) {
      console.error("GetListServices:", error);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server khi lấy danh sách dịch vụ",
      });
    }
  },

  // ===============================
  // 🔹 Lấy danh sách service theo danh mục
  // ===============================
  async getByCategory(req, res) {
    try {
      const categoryId = req.params.categoryId;
      const keySearch = req.query.keySearch || "";

      if (categoryId === "all") {
        const services = await ServiceModel.getAll(keySearch);
        return baseResponse(res, {
          code: 200,
          message: "Lấy tất cả dịch vụ thành công",
          data: { category: null, services },
        });
      }

      const category = await CategoryModel.getById(categoryId);
      if (!category) {
        return baseResponse(res, { code: 404, status: false, message: "Không tìm thấy danh mục" });
      }

      const services = await ServiceModel.getByCategory(categoryId, keySearch);
      return baseResponse(res, {
        code: 200,
        message: "Lấy dịch vụ theo danh mục thành công",
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
  // 🔹 Tạo mới service (Admin)
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

      const category = await CategoryModel.getById(category_id);
      if (!category)
        return baseResponse(res, { code: 404, status: false, message: "Không tìm thấy danh mục" });

      const existed = await ServiceModel.getByNameInCategory(name, category_id);
      if (existed)
        return baseResponse(res, {
          code: 409,
          status: false,
          message: "Tên dịch vụ đã tồn tại trong danh mục này",
        });

      const id = await ServiceModel.create({ category_id, name, description, base_price });
      return baseResponse(res, { code: 200, message: "Thêm dịch vụ thành công", data: { id, name, base_price } });
    } catch (error) {
      console.error("CreateService:", error);
      return baseResponse(res, { code: 500, status: false, message: "Lỗi server khi thêm dịch vụ" });
    }
  },

  // ===============================
  // 🔹 Cập nhật service (Admin)
  // ===============================
  async update(req, res) {
    try {
      const id = req.params.id;
      const { name, description, base_price, category_id } = req.body;

      const service = await ServiceModel.getById(id);
      if (!service)
        return baseResponse(res, { code: 404, status: false, message: "Không tìm thấy dịch vụ để cập nhật" });

      if (name && category_id) {
        const existed = await ServiceModel.getByNameInCategory(name, category_id);
        if (existed && existed.id !== id)
          return baseResponse(res, { code: 409, status: false, message: "Tên dịch vụ đã tồn tại trong danh mục này" });
      }

      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (base_price !== undefined) updateData.base_price = base_price;
      if (category_id !== undefined) updateData.category_id = category_id;

      if (Object.keys(updateData).length === 0)
        return baseResponse(res, { code: 200, status: true, message: "Không có thay đổi nào được áp dụng" });

      const affected = await ServiceModel.update(id, updateData);
      if (!affected)
        return baseResponse(res, { code: 400, status: false, message: "Cập nhật thất bại, vui lòng thử lại" });

      return baseResponse(res, { code: 200, status: true, message: "Cập nhật dịch vụ thành công" });
    } catch (error) {
      console.error("UpdateService:", error);
      return baseResponse(res, { code: 500, status: false, message: "Lỗi server khi cập nhật dịch vụ" });
    }
  },

  // ===============================
  // 🔹 Xóa service (Admin) - status = 0
  // ===============================
  async delete(req, res) {
    try {
      const id = req.params.id;
      const affected = await ServiceModel.delete(id);
      if (!affected)
        return baseResponse(res, { code: 404, status: false, message: "Không tìm thấy dịch vụ để xóa" });

      return baseResponse(res, { code: 200, message: "Xóa dịch vụ thành công" });
    } catch (error) {
      console.error("DeleteService:", error);
      return baseResponse(res, { code: 500, status: false, message: "Lỗi server khi xóa dịch vụ" });
    }
  },
};
