// 📦 필요한 모듈 불러오기
import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";
import { google } from "googleapis";

// 📁 환경 변수 로드 (.env 불러오기)
dotenv.config();
console.log("✅ .env 불러오기 확인");
console.log("Client ID:", process.env.GOOGLE_CLIENT_ID);
console.log("Redirect URI:", process.env.GOOGLE_REDIRECT_URI);

// 📁 Express 서버 초기화
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// 🗂️ 업로드 폴더 설정 (임시 저장용)
const upload = multer({ dest: "temp/" });

// 🧠 구글 OAuth 클라이언트 설정
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// 🔑 토큰 파일 불러오기 (tokens.json)
let tokens;
try {
  const tokenData = fs.readFileSync("tokens.json", "utf-8");
  tokens = JSON.parse(tokenData);
  oauth2Client.setCredentials(tokens);
  console.log("✅ Google OAuth 토큰 로드 완료");
} catch (error) {
  console.error("❌ tokens.json 파일이 없습니다. 인증 절차가 필요합니다.");
}

// 🧭 구글 드라이브 객체 생성
const drive = google.drive({ version: "v3", auth: oauth2Client });

// 📤 업로드 엔드포인트
app.post("/api/upload", upload.single("photo"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "파일이 업로드되지 않았습니다." });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;

    console.log(`✅ 업로드 요청: ${fileName}`);

    const fileMetadata = {
      name: fileName,
      parents: [process.env.ROOT_FOLDER_ID], // Google Drive 폴더 ID
    };

    const media = {
      mimeType: req.file.mimetype,
      body: fs.createReadStream(filePath),
    };

    // 🔼 Google Drive 업로드 실행
    const file = await drive.files.create({
      resource: fileMetadata,
      media,
      fields: "id, webViewLink, name",
    });

    // ✅ 업로드 완료 후 임시 파일 삭제
    fs.unlinkSync(filePath);

    console.log(`✅ 업로드 완료: ${file.data.name}`);
    res.json({
      success: true,
      fileId: file.data.id,
      link: file.data.webViewLink,
    });
  } catch (error) {
    console.error("❌ 업로드 오류:", error.response?.data || error.message);
    res.status(500).json({
      error: "업로드 실패",
      message: error.message,
    });
  }
});

// 🚀 서버 실행 (Render 호환)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 PhotoPrint 서버 실행 중: http://localhost:${PORT}`);
});
