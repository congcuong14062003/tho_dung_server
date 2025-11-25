import bcrypt from "bcryptjs";
import { generateToken } from "../config/jwt.js";
import { UserModel } from "../models/user.model.js";
import { sendOTP, generateOTP } from "../utils/otp.js";
import { baseResponse } from "../utils/response.helper.js";
import { TechnicianModel } from "../models/technician.model.js";
import { DeviceModel } from "../models/device.model.js";

export const AuthController = {
  async register(req, res) {
    try {
      const { fullname, phone, idcard, password, role } = req.body;

      if (!fullname || !phone || !idcard || !password) {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Thiếu thông tin đăng ký",
        });
      }
      const existing = await UserModel.findByPhone(phone);
      if (existing) {
        // Nếu tài khoản chưa verify → gửi lại OTP mới
        if (!existing.verified) {
          const otp = generateOTP();
          const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
          await UserModel.updateUser(existing.id, {
            otp_code: otp,
            otp_expiry: otpExpiry,
          });
          await sendOTP(phone, otp);
          return baseResponse(res, {
            code: 200,
            message: "Tài khoản chưa xác minh, OTP mới đã được gửi lại.",
            data: { phone, role: existing.role },
          });
        }

        // Nếu đã verify rồi → báo lỗi trùng
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Số điện thoại đã được đăng ký và xác minh.",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const otp = generateOTP();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

      const userId = await UserModel.createUser({
        fullname,
        phone,
        idcard,
        password: hashedPassword,
        verified: false,
        otp_code: otp,
        otp_expiry: otpExpiry,
      });

      await sendOTP(phone, otp);

      return baseResponse(res, {
        code: 200,
        message: "Đăng ký thành công, vui lòng xác minh OTP.",
        data: { userId, phone, role },
      });
    } catch (error) {
      console.error(error);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server khi đăng ký",
      });
    }
  },

  async verifyOTP(req, res) {
    try {
      const { phone, otp } = req.body;

      if (!phone || !otp) {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Thiếu thông tin xác minh",
        });
      }

      const user = await UserModel.findByPhone(phone);
      if (!user) {
        return baseResponse(res, {
          code: 404,
          status: false,
          message: "Không tìm thấy tài khoản",
        });
      }

      if (user.verified) {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Tài khoản đã xác minh",
        });
      }

      if (user.otp_code !== otp || new Date() > new Date(user.otp_expiry)) {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "OTP không hợp lệ hoặc đã hết hạn",
        });
      }

      await UserModel.updateUser(user.id, {
        verified: true,
        otp_code: null,
        otp_expiry: null,
      });

      const token = generateToken(user);

      return baseResponse(res, {
        code: 200,
        message: "Xác minh thành công",
        data: {
          user: {
            id: user.id,
            fullname: user.full_name || user.fullname,
            phone: user.phone,
            role: user.role,
          },
        },
      });
    } catch (error) {
      console.error(error);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi xác minh OTP",
      });
    }
  },

  async resendOTP(req, res) {
    try {
      const { phone } = req.body;

      if (!phone) {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Thiếu số điện thoại",
        });
      }

      const user = await UserModel.findByPhone(phone);
      if (!user) {
        return baseResponse(res, {
          code: 404,
          status: false,
          message: "Không tìm thấy người dùng",
        });
      }

      if (user.verified) {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Tài khoản đã được xác minh, không cần gửi lại OTP",
        });
      }

      const otp = generateOTP();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

      await UserModel.updateUser(user.id, {
        otp_code: otp,
        otp_expiry: otpExpiry,
      });

      await sendOTP(phone, otp);

      return baseResponse(res, {
        code: 200,
        status: true,
        message: "Đã gửi lại mã OTP thành công.",
        data: { phone },
      });
    } catch (error) {
      console.error(error);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server khi gửi lại OTP",
      });
    }
  },

  // =========================================
  // ĐĂNG NHẬP CLIENT (khách hàng + thợ)
  // =========================================
  async loginClient(req, res) {
    try {
      const { phone, password, device_id, fcm_token } = req.body;

      if (!phone || !password) {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Thiếu số điện thoại hoặc mật khẩu",
        });
      }

      const user = await UserModel.findByPhone(phone);
      if (!user) {
        return baseResponse(res, {
          code: 404,
          status: false,
          message: "Tài khoản không tồn tại",
        });
      }

      // Không cho admin đăng nhập bằng API này
      if (user.role === "admin") {
        return baseResponse(res, {
          code: 403,
          status: false,
          message: "Tài khoản không tồn tại",
        });
      }

      if (!user.verified) {
        return baseResponse(res, {
          code: 402,
          status: false,
          message: "Tài khoản chưa được xác minh OTP",
        });
      }

      if (user.status !== "active") {
        return baseResponse(res, {
          code: 403,
          status: false,
          message: "Tài khoản bị khóa hoặc đang chờ duyệt",
        });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return baseResponse(res, {
          code: 401,
          status: false,
          message: "Mật khẩu không đúng",
        });
      }

      const token = generateToken({
        id: user.id,
        phone: user.phone,
        role: user.role,
      });

      // 🔥 LƯU FCM + DEVICE ID
      if (device_id && fcm_token) {
        await DeviceModel.saveDevice({
          user_id: user.id,
          device_id,
          fcm_token,
          platform: platform || "unknown",
        });
      }

      // Nếu là thợ → lấy thêm thông tin profile
      let workerInfor = null;
      if (user.role === "technician") {
        workerInfor = await TechnicianModel.getProfileByUserId(user.id);
      }

      return baseResponse(res, {
        code: 200,
        status: true,
        message: "Đăng nhập thành công",
        data: {
          token,
          userInfor: {
            id: user.id,
            full_name: user.full_name,
            phone: user.phone,
            role: user.role,
            avatar_link: user.avatar_link,
          },
          workerInfor,
        },
      });
    } catch (error) {
      console.error("LoginClient Error:", error);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server",
      });
    }
  },

  // =========================================
  // ĐĂNG NHẬP ADMIN (riêng biệt, bảo mật cao hơn)
  // =========================================
  async loginAdmin(req, res) {
    try {
      const { phone, password, device_id, fcm_token } = req.body;

      if (!phone || !password) {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Thiếu thông tin đăng nhập",
        });
      }

      const user = await UserModel.findByPhone(phone);
      if (!user) {
        return baseResponse(res, {
          code: 404,
          status: false,
          message: "Tài khoản không tồn tại",
        });
      }

      // Chỉ cho phép role = admin
      if (user.role !== "admin") {
        return baseResponse(res, {
          code: 403,
          status: false,
          message: "Bạn không có quyền admin",
        });
      }

      if (user.status !== "active") {
        return baseResponse(res, {
          code: 403,
          status: false,
          message: "Tài khoản admin bị khóa",
        });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return baseResponse(res, {
          code: 401,
          status: false,
          message: "Mật khẩu không đúng",
        });
      }

      const token = generateToken(
        {
          id: user.id,
          phone: user.phone,
          role: "admin",
        },
        "1h"
      ); // Admin token hết hạn nhanh hơn (tùy chỉnh)

      // 🔥 LƯU FCM + DEVICE ID
      if (device_id && fcm_token) {
        await DeviceModel.saveDevice({
          user_id: user.id,
          device_id,
          fcm_token,
        });
      }
      return baseResponse(res, {
        code: 200,
        status: true,
        message: "Đăng nhập admin thành công",
        data: {
          token,
          adminInfor: {
            id: user.id,
            full_name: user.full_name,
            phone: user.phone,
            role: "admin",
          },
        },
      });
    } catch (error) {
      console.error("LoginAdmin Error:", error);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server",
      });
    }
  },

  async createAdmin(req, res) {
    try {
      const { fullname, phone, password } = req.body;

      if (!fullname || !phone || !password) {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Thiếu thông tin tạo admin",
        });
      }

      const existing = await UserModel.findByPhone(phone);
      if (existing) {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Số điện thoại đã tồn tại",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const adminId = await UserModel.createUser({
        fullname,
        phone,
        password: hashedPassword,
        role: "admin",
        verified: true,
      });

      const admin = await UserModel.getById(adminId);
      const token = generateToken(admin);

      return baseResponse(res, {
        code: 200,
        message: "Tạo admin thành công",
        data: {
          token,
          user: {
            id: admin.id,
            fullname: admin.full_name || admin.fullname,
            phone: admin.phone,
            role: admin.role,
          },
        },
      });
    } catch (error) {
      console.error(error);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server khi tạo admin",
      });
    }
  },
};
