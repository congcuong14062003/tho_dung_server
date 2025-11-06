import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = "uploads/icons";

// Tạo folder nếu chưa có
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Cấu hình nơi lưu file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = Date.now() + ext;
    cb(null, filename);
  },
});

export const upload = multer({ storage });
