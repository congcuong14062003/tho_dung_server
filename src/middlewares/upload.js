import multer from "multer";
import path from "path";
import fs from "fs";
import heicConvert from "heic-convert";

const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// ✅ Lưu file với đúng phần mở rộng thật (kể cả .heic)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    const filename = Date.now() + ext.toLowerCase(); // giữ đúng đuôi thật
    cb(null, filename);
  },
});

export const upload = multer({ storage });

// ✅ Middleware tự động convert HEIC sang JPG
export const convertHeicToJpg = async (req, res, next) => {
  if (!req.files || req.files.length === 0) return next();

  try {
    await Promise.all(
      req.files.map(async (file) => {
        // Phát hiện file HEIC hoặc HEIF
        if (
          file.mimetype === "image/heic" ||
          file.mimetype === "image/heif" ||
          /\.heic$/i.test(file.originalname)
        ) {
          const inputBuffer = fs.readFileSync(file.path);

          const outputBuffer = await heicConvert({
            buffer: inputBuffer,
            format: "JPEG",
            quality: 1,
          });

          // ✅ Đổi tên đuôi sang .jpg
          const newFilename = file.filename.replace(/\.[^/.]+$/, ".jpg");
          const newPath = path.join(uploadDir, newFilename);

          fs.writeFileSync(newPath, outputBuffer);
          fs.unlinkSync(file.path); // ❌ xóa file HEIC gốc

          // ✅ Cập nhật lại thông tin file trong req.files
          file.filename = newFilename;
          file.path = newPath;
          file.mimetype = "image/jpeg";
        }
      })
    );
  } catch (err) {
    console.error("❌ Lỗi khi convert HEIC:", err);
  }

  next();
};
