// ===============================
// 📦 AWS S3 업로드 버전 server.js
// ===============================

import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import AWS from "aws-sdk";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// ======================================
// 📁 multer 설정 (업로드된 파일을 임시 폴더에 저장)
// ======================================
const upload = multer({ dest: "temp/" });

// ======================================
// 🌍 AWS S3 설정
// ======================================
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();
const bucketName = process.env.S3_BUCKET_NAME;

// ======================================
// 🧭 업로드 페이지 (테스트용)
// ======================================
app.get("/", (req, res) => {
  res.send(`
    <h2>📸 Podo PhotoPrint - AWS S3 업로드 테스트</h2>
    <form action="/api/upload" method="post" enctype="multipart/form-data">
      <input type="file" name="file" />
      <button type="submit">업로드</button>
    </form>
  `);
});

// ======================================
// 🚀 업로드 처리 (S3에 저장)
// ======================================
app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).send("❌ 파일이 없습니다.");

    // S3 업로드 설정
    const fileStream = fs.createReadStream(file.path);
    const params = {
      Bucket: bucketName,
      Key: file.originalname,
      Body: fileStream,
      ContentType: file.mimetype,
    };

    // 업로드 실행
    const result = await s3.upload(params).promise();

    // 임시파일 삭제
    fs.unlinkSync(file.path);

    console.log("✅ S3 업로드 성공:", result.Location);
    res.json({
      message: "✅ S3 업로드 성공!",
      fileUrl: result.Location,
    });
  } catch (error) {
    console.error("❌ S3 업로드 오류:", error);
    res.status(500).json({ error: "S3 업로드 실패", details: error.message });
  }
});

// ======================================
// 🖥️ 서버 실행
// ======================================
app.listen(PORT, () => {
  console.log(`🚀 PhotoPrint S3 Server running on port ${PORT}`);
});
