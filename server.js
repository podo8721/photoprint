// ✅ AWS S3 업로드 서버 (Render 완전호환 버전)
// 작성자: Jaeyoung Choi

import express from "express";
import multer from "multer";
import AWS from "aws-sdk";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ✅ 환경 변수 로드 (.env)
dotenv.config();

// ✅ Express 앱 생성
const app = express();
const port = process.env.PORT || 3000;

// ✅ 경로 관련 설정 (ESM 대응)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ JSON 및 폼 데이터 파싱
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ 정적 파일 경로 (테스트용)
app.use(express.static(path.join(__dirname, "public")));

// ✅ Multer 임시 저장 폴더 설정
const upload = multer({ dest: "temp/" });

// ✅ AWS S3 설정
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();

// ✅ 기본 페이지
app.get("/", (req, res) => {
  res.send(`
    <h2>📸 Podo PhotoPrint - AWS S3 Upload Server</h2>
    <form action="/upload" method="post" enctype="multipart/form-data">
      <input type="file" name="file" />
      <button type="submit">Upload</button>
    </form>
  `);
});

// ✅ 파일 업로드 처리
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "파일이 없습니다." });
    }

    // 파일 경로 및 읽기 스트림
    const filePath = path.resolve(file.path);
    const fileStream = fs.createReadStream(filePath);

    // S3 업로드 파라미터
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `uploads/${Date.now()}_${file.originalname}`,
      Body: fileStream,
      ContentType: file.mimetype,
    };

    // S3 업로드 실행
    const result = await s3.upload(params).promise();

    // 임시 파일 삭제
    fs.unlinkSync(filePath);

    console.log("✅ 업로드 성공:", result.Location);
    res.json({ message: "S3 업로드 성공", url: result.Location });
  } catch (err) {
    console.error("❌ 업로드 오류:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ 서버 실행
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});