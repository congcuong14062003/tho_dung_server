import bcrypt from "bcryptjs";
import { generateToken } from "../config/jwt.js";
import { UserModel } from "../models/user.model.js";
import { sendOTP, generateOTP } from "../utils/otp.js";
import { baseResponse } from "../utils/response.helper.js";
import { TechnicianModel } from "../models/technician.model.js";

export const AuthController = {
  validateRole(role) {
    return ["customer", "worker"].includes(role);
  },

  async register(req, res) {
    try {
      const { fullname, phone, idcard, password, role } = req.body;

      if (!fullname || !phone || !idcard || !password || !role) {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Thiếu thông tin đăng ký",
        });
      }

      if (!AuthController.validateRole(role)) {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Role không hợp lệ",
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
        role,
        verified: false,
        otp_code: otp,
        otp_expiry: otpExpiry,
      });

      await sendOTP(phone, otp);

      return baseResponse(res, {
        code: 201,
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

  async login(req, res) {
    try {
      const { phone, password } = req.body;

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

      if (!user.verified) {
        return baseResponse(res, {
          code: 401,
          status: false,
          message: "Tài khoản chưa được xác minh",
        });
      }

      const isMatch = await bcrypt.compare(
        password,
        user.password_hash || user.password
      );
      if (!isMatch) {
        return baseResponse(res, {
          code: 401,
          status: false,
          message: "Sai tên đăng nhập hoặc mật khẩu",
        });
      }

      const token = generateToken(user);

      return baseResponse(res, {
        code: 200,
        message: "Đăng nhập thành công",
        status: true,
        data: {
          token,
          user: {
            id: user.id,
            fullname: user.full_name || user.fullname,
            idcard: user.id_card || user.idcard,
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
        message: "Lỗi server khi đăng nhập",
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
        code: 201,
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

  async updateRole(req, res) {
    try {
      const {
        userId,
        role,
        skill_category_id,
        experience_years,
        description,
        working_area,
        certifications,
      } = req.body;

      if (!userId || !role) {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Thiếu thông tin cập nhật vai trò",
        });
      }

      if (!AuthController.validateRole(role)) {
        return baseResponse(res, {
          code: 400,
          status: false,
          message: "Vai trò không hợp lệ (chỉ customer hoặc worker)",
        });
      }

      const user = await UserModel.getById(userId);
      if (!user) {
        return baseResponse(res, {
          code: 404,
          status: false,
          message: "Không tìm thấy người dùng",
        });
      }

      // Cập nhật role
      await UserModel.updateUser(userId, { role });

      // Nếu là thợ thì lưu thông tin kỹ năng vào technician_profiles
      if (role === "worker") {
        await TechnicianModel.createOrUpdateProfile({
          user_id: userId,
          skill_category_id,
          experience_years,
          description,
          working_area,
          certifications,
        });
      }

      return baseResponse(res, {
        code: 200,
        message: "Cập nhật vai trò thành công",
        data: { userId, role },
      });
    } catch (error) {
      console.error(error);
      return baseResponse(res, {
        code: 500,
        status: false,
        message: "Lỗi server khi cập nhật vai trò",
      });
    }
  },
};
