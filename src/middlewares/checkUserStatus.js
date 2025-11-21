// middleware/checkUserStatus.js
import { UserModel } from "../models/user.model.js";
import { baseResponse } from "../utils/response.helper.js";

export async function checkUserStatus(req, res, next) {
  try {
    const user = await UserModel.getById(req.user.id);

    if (!user) {
      return baseResponse(res, {
        code: 404,
        status: false,
        message: "Không tìm thấy tài khoản",
      });
    }

    // Nếu tài khoản không active → chặn
    if (user.status !== "active") {
      return baseResponse(res, {
        code: 401,
        status: false,
        message: "Tài khoản đã bị khóa hoặc đang chờ duyệt",
      });
    }

    next();
  } catch (err) {
    console.error(err);
    return baseResponse(res, {
      code: 500,
      status: false,
      message: "Lỗi kiểm tra trạng thái tài khoản",
    });
  }
}
