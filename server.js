// ✅ server.js — Podo Photoprint AWS S3 Upload Server (Final Version)
// 작성자: Jaeyoung Choi
// 배포환경: Render + AWS S3 (ap-northeast-2)
// ✅ 2025-10-12 기준 완성본

import express from "express";
import multer from "multer";
import AWS from "aws-sdk";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// ✅ 환경변수 로드
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// ✅ Express 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Multer 임시 폴더 지정
const upload = multer({ dest: "temp/" });

// ✅ AWS S3 환경설정
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,       // Render Secrets에 저장된 값
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();

// ✅ 기본 페이지 (업로드 테스트용)
app.get("/", (req, res) => {
  res.send(`
    <h2>📸 Podo Photoprint - AWS S3 Upload Server</h2>
    <form action="/upload" method="post" enctype="multipart/form-data">
      <input type="file" name="file" required />
      <button type="submit">Upload</button>
    </form>
  `);
});

// ✅ 업로드 처리 엔드포인트
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

    // ✅ S3 업로드 실행
    const result = await s3.upload(params).promise();

    // ✅ 임시파일 삭제
    fs.unlinkSync(filePath);

    console.log("✅ 업로드 성공:", result.Location);
    res.json({
      message: "S3 업로드 성공 ✅",
      url: result.Location,
    });
  } catch (err) {
    console.error("❌ 업로드 중 오류 발생:", err);
    res.status(500).json({ error: "서버 오류: " + err.message });
  }
});

// ✅ 서버 실행
app.listen(port, () => {
  console.log(`🚀 Podo Photoprint AWS Server 실행 중 (포트: ${port})`);
});