import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const KEY = crypto.createHash("sha256").update(String(process.env.SECRET_KEY_MESSAGE)).digest("base64").substring(0, 32);
const IV_LENGTH = 16;

export function encryptText(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, "utf8", "base64");
  encrypted += cipher.final("base64");

  return iv.toString("base64") + ":" + encrypted;
}

export function decryptText(encrypted) {
  const [ivBase64, data] = encrypted.split(":");
  const iv = Buffer.from(ivBase64, "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  let decrypted = decipher.update(data, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
