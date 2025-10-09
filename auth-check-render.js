// auth-check-render.js
// Render 서버 환경에서도 직접 Google OAuth 토큰을 생성하고 tokens.json으로 저장

import fs from "fs";
import express from "express";
import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();
const app = express();

// 환경 변수 확인 로그
console.log("✅ Render 환경 변수 확인");
console.log("Client ID:", process.env.GOOGLE_CLIENT_ID);
console.log("Redirect URI:", process.env.GOOGLE_REDIRECT_URI);

// OAuth 설정
const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// 구글 로그인 URL 생성
app.get("/", (req, res) => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/drive.metadata.readonly"
    ]
  });
  res.send(`
    <h2>Render 서버용 Google 로그인</h2>
    <p>👇 아래 링크를 클릭해서 구글 로그인 후 code를 복사하세요.</p>
    <a href="${authUrl}" target="_blank">${authUrl}</a>
  `);
});

// callback 처리
app.get("/oauth2/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send("❌ code 값이 없습니다.");

  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    // tokens.json 파일로 저장
    fs.writeFileSync("tokens.json", JSON.stringify(tokens, null, 2));
    console.log("✅ tokens.json 파일이 Render 서버에 저장되었습니다.");
    res.send("✅ Google OAuth 토큰이 성공적으로 발급되었습니다!");
  } catch (err) {
    console.error("❌ 토큰 발급 실패:", err.message);
    res.status(500).send("토큰 발급 중 오류 발생");
  }
});

// 서버 실행
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 auth-check-render.js 실행 중: http://localhost:${PORT}`);
});
