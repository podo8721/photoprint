// ===============================
// 📦 PhotoPrint Render 버전 server.js
// ===============================

// 1️⃣ 필요한 모듈 로드
import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config(); // .env 또는 Render Secrets 로드

// 2️⃣ 기본 설정
const app = express();
const PORT = process.env.PORT || 10000;
const upload = multer({ dest: "uploads/" });

// 3️⃣ Google OAuth2 클라이언트 설정 (Render 환경변수와 연결)
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
const ROOT_FOLDER_ID = process.env.ROOT_FOLDER_ID; // ✅ Render Secret에서 지정된 폴더 ID

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const drive = google.drive({ version: "v3", auth: oauth2Client });

// 4️⃣ tokens.json 불러오기
const TOKEN_PATH = path.join(process.cwd(), "tokens.json");

if (fs.existsSync(TOKEN_PATH)) {
  try {
    const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
    oauth2Client.setCredentials(tokens);
    console.log("✅ Google OAuth tokens.json 로드 완료");
  } catch (err) {
    console.error("⚠️ tokens.json 파일 파싱 오류:", err.message);
  }
} else {
  console.log("⚠️ tokens.json 없음 — 새 인증 필요");
}

// 5️⃣ 인증 URL 생성 라우트
app.get("/auth", (req, res) => {
  const scopes = ["https://www.googleapis.com/auth/drive.file"];
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
  });
  res.redirect(url);
});

// 6️⃣ 인증 완료 후 콜백 처리
app.get("/oauth2/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send("인증 코드가 없습니다.");
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
    console.log("✅ 새 tokens.json 저장 완료");
    res.send("✅ 인증이 완료되었습니다. 이제 창을 닫고 다시 업로드 테스트하세요.");
  } catch (error) {
    console.error("🚨 OAuth 콜백 처리 오류:", error);
    res.status(500).send("OAuth 인증 실패: " + error.message);
  }
});

// 7️⃣ 파일 업로드 API
app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("파일이 업로드되지 않았습니다.");
    }

    const filePath = req.file.path;
    const fileMetadata = {
      name: req.file.originalname,
      parents: [ROOT_FOLDER_ID],
    };
    const media = {
      mimeType: req.file.mimetype,
      body: fs.createReadStream(filePath),
    };

    const result = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: "id, name, webViewLink",
    });

    // 업로드 완료 후 로컬 임시파일 삭제
    fs.unlinkSync(filePath);

    console.log("✅ 파일 업로드 성공:", result.data);
    res.send(`✅ 업로드 완료! 파일명: ${result.data.name}<br>
              Google Drive 링크: <a href="${result.data.webViewLink}" target="_blank">${result.data.webViewLink}</a>`);
  } catch (error) {
    console.error("🚨 업로드 중 오류 발생:", error);
    res.status(500).send("Upload failed: " + error.message);
  }
});

// 8️⃣ 루트 페이지
app.get("/", (req, res) => {
  res.send(`
    <h2>📸 PhotoPrint Google Drive 업로드 서버</h2>
    <p>상태: ${fs.existsSync(TOKEN_PATH) ? "✅ 인증 완료" : "❌ 인증 필요"}</p>
    <p><a href="/auth">Google Drive 인증하기</a></p>
  `);
});

// 9️⃣ 서버 실행
app.listen(PORT, () => {
  console.log(`🚀 PhotoPrint Server is running on port ${PORT}`);
});
