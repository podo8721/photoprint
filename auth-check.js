// auth-check.js
import 'dotenv/config';
import fs from 'fs';
import readline from 'readline';
import { google } from 'googleapis';

// ✅ Google OAuth 클라이언트 생성
const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

console.log("✅ .env 환경 변수 불러오기 성공!");
console.log("Client ID:", process.env.GOOGLE_CLIENT_ID);
console.log("Redirect URI:", process.env.GOOGLE_REDIRECT_URI);

// ✅ 인증 URL 생성
const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.metadata.readonly'
  ],
});

console.log('\n🔗 아래 주소를 브라우저에 복사해서 접속하세요:\n');
console.log(authUrl);
console.log('\n🔑 구글 로그인 후 code= 뒤의 코드를 여기에 붙여넣으세요:');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('👉 code: ', async (code) => {
  try {
    const { tokens } = await oAuth2Client.getToken(code.trim());
    oAuth2Client.setCredentials(tokens);
    fs.writeFileSync('tokens.json', JSON.stringify(tokens, null, 2));
    console.log('✅ 토큰이 tokens.json 파일로 저장되었습니다!');
  } catch (err) {
    console.error('❌ 인증 실패:', err.response?.data || err.message);
  } finally {
    rl.close();
  }
});
