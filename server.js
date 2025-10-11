// server.js — AWS S3 업로드 버전 (최종 안정판)
import express from "express";
import multer from "multer";
import AWS from "aws-sdk";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// JSON 및 form 데이터 파싱
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer 임시 저장 폴더 설정
const upload = multer({ dest: "temp/" });

// AWS S3 설정
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();

// 기본 페이지
app.get("/", (req, res) => {
  res.send(`
    <h2>📸 Podo PhotoPrint - AWS S3 Upload Server</h2>
    <form action="/upload" method="post" enctype="multipart/form-data">
      <input type="file" name="file" />
      <button type="submit">Upload</button>
    </form>
  `);
});

// 업로드 처리
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "파일이 없습니다." });

    const filePath = path.resolve(file.path);
    const fileStream = fs.createReadStream(filePath);

    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `uploads/${Date.now()}_${file.originalname}`,
      Body: fileStream,
      ContentType: file.mimetype,
    };

    const result = await s3.upload(params).promise();
    fs.unlinkSync(filePath);

    console.log("✅ 업로드 성공:", result.Location);
    res.json({ message: "S3 업로드 성공", url: result.Location });
  } catch (err) {
    console.error("❌ 업로드 오류:", err);
    res.status(500).json({ error: err.message });
  }
});

// 서버 실행
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});