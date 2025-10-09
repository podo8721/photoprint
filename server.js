import express from "express";
import multer from "multer";
import fs from "fs";
import dotenv from "dotenv";
import { google } from "googleapis";
import cors from "cors";

dotenv.config();

console.log("✅ Render 환경 테스트:", process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_REDIRECT_URI);

const app = express();
const upload = multer({ dest: "temp/" });

// Render에서 자동 할당하는 포트 사용
const PORT = process.env.PORT || 10000;

// 🔹 CORS 허용 (외부 브라우저 접근 허용)
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// ✅ 구글 인증 클라이언트
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// ✅ Google Drive 연결
const drive = google.drive({ version: "v3", auth: oauth2Client });

// ✅ 토큰 불러오기
let tokens = null;
try {
  const tokenData = fs.readFileSync("tokens.json", "utf-8");
  tokens = JSON.parse(tokenData);
  oauth2Client.setCredentials(tokens);
  console.log("✅ Google OAuth 토큰 로드 완료");
} catch {
  console.error("⚠️ tokens.json 파일을 찾을 수 없습니다. auth-check.js를 실행하세요.");
}

// ✅ 업로드 API
app.post("/api/upload", upload.single("photo"), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: "파일이 없습니다." });

  console.log("📸 업로드 요청:", file.originalname);

  try {
    const fileMetadata = {
      name: file.originalname,
      parents: [process.env.ROOT_FOLDER_ID],
    };
    const media = {
      mimeType: file.mimetype,
      body: fs.createReadStream(file.path),
    };

    const fileData = await drive.files.create({
      resource: fileMetadata,
      media,
      fields: "id, webViewLink",
    });

    fs.unlinkSync(file.path);

    console.log("✅ 업로드 완료:", fileData.data.name);
    res.json({ success: true, link: fileData.data.webViewLink });
  } catch (error) {
    console.error("❌ 업로드 실패:", error.response?.data || error.message);
    res.status(500).json({ error: "업로드 실패", message: error.message });
  }
});

// ✅ 서버 실행
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 PhotoPrint 서버 실행 중: 포트 ${PORT}`);
});
