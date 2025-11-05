// src/utils/otp.js
export function generateOTP() {
  // Sinh OTP ngẫu nhiên 6 chữ số (chuỗi)
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendOTP(phone, otp) {
  // Mock — không gửi thật, chỉ log ra console  
  console.log(`📱 [TEST MODE] OTP gửi đến ${phone}: ${otp}`);
}
