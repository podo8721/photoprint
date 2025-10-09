// ✅ Google Drive 인증 테스트용 (최신 안정화 버전)
const { google } = require("googleapis");
const dotenv = require("dotenv");
const readline = require("readline");
const fs = require("fs");

// 환경 변수 로드
dotenv.config();

// 환경변수 읽기
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

// OAuth2 클라이언트 생성
const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// ✅ 범위 지정 (인코딩 오류 방지를 위해 완전한 배열 형태 유지)
const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

console.log("✅ .env 환경 변수 불러오기 성공!");
console.log("Client ID:", CLIENT_ID);
console.log("Redirect URI:", REDIRECT_URI);
console.log("----------------------------------------");

// ✅ URL 자동 인코딩 방지 (Google SDK가 인코딩 수행)
const authUrl = oAuth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: SCOPES,
});

console.log("🔗 아래 주소를 브라우저에 복사해서 접속하세요:");
console.log(authUrl);

// ✅ 터미널 입력 인터페이스
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("👉 구글 로그인 후 code= 뒤의 코드를 여기에 붙여넣으세요: ", async (code) => {
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    console.log("✅ 인증 완료!");
    console.log("💾 tokens.json 파일로 저장 중...");
    fs.writeFileSync("tokens.json", JSON.stringify(tokens, null, 2));
    console.log("✅ 저장 완료! 이제 index.ts에서 자동 업로드를 사용할 수 있습니다.");
    rl.close();
  } catch (err) {
    console.error("❌ 인증 실패:", err.message);
    rl.close();
  }
});
