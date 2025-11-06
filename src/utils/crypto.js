import crypto from "crypto";
import bcrypt from 'bcrypt';
require("dotenv").config();
const CryptoJS = require("crypto-js");

//Tạo random String với 8 ký tự
export function generateId(prefix) {
  return `${prefix}${crypto.randomBytes(8).toString('hex')}`;
}

//Tạo hàm băm với bcrypt
const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS);


export async function hashString(input) {
  // Chờ đợi để tạo salt
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  // Chờ đợi để tạo hash
  const hashedString = await bcrypt.hash(input, salt);
  return hashedString;
}

// So sánh hàm băm
export const compareHash = (string, hash) => {
  return bcrypt.compareSync(string, hash);
}

//Tạo randomString với length ký tự
export function generateRandomString(length = 10) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const charactersLength = characters.length;

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charactersLength);
    result += characters.charAt(randomIndex);
  }

  return result;
}


// Khóa bí mật (bạn nên lưu trữ và quản lý khóa này một cách an toàn)
const secretKey = process.env.KEY_AES;
const secretKeySame = process.env.KEY_AES_SAME;

// Hàm mã hóa
export function encryptAES(text, secretKeyAES = secretKey) {
    return CryptoJS.AES.encrypt(text, secretKeyAES).toString();
}

// Hàm giải mã
export function decryptAES(cipherText, secretKeyAES = secretKey) {
    const bytes = CryptoJS.AES.decrypt(cipherText, secretKeyAES);
    return bytes.toString(CryptoJS.enc.Utf8);
}




const iv = CryptoJS.enc.Utf8.parse('00000000000000000000000000000000'); // IV cố định

// Hàm mã hóa với đầu vào và đầu ra có lượng chuỗi ký tự bằng nhau
export function encryptAESSame(text) {
    const encrypted = CryptoJS.AES.encrypt(text, CryptoJS.enc.Utf8.parse(secretKeySame), {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });
    return encrypted.toString();
}

// Hàm giải mã
export function decryptAESSame(cipherText) {
    const decrypted = CryptoJS.AES.decrypt(cipherText, CryptoJS.enc.Utf8.parse(secretKeySame), {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });
    return decrypted.toString(CryptoJS.enc.Utf8);
}





// hàm RSA
export function encryptWithPublicKey(data, public_key) {
  return crypto.publicEncrypt(public_key, Buffer.from(data)).toString('hex');
}
export function decryptWithPrivateKey(encryptedData, private_key) {
  try {
    return crypto.privateDecrypt(private_key, Buffer.from(encryptedData, 'hex')).toString();
  } catch (error) {
    console.error('Decryption failed:', error.message);
    return null; // Hoặc một giá trị khác tùy bạn xử lý khi giải mã thất bại
  }
}

