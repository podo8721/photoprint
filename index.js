// ✅ Google Drive 자동 다운로드 시스템
// 작성자: Jaeyoung Choi

import fs from "fs";
import path from "path";
import { google } from "googleapis";
import dotenv from "dotenv";

// ✅ 환경변수 로드 (.env)
dotenv.config();

// ✅ 다운로드 저장 폴더
const DOWNLOAD_FOLDER = "D:/photoprint/downloads";

// ✅ 폴더가 없으면 생성
if (!fs.existsSync(DOWNLOAD_FOLDER)) {
  fs.mkdirSync(DOWNLOAD_FOLDER, { recursive: true });
}

// ✅ OAuth2 인증 설정
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
const TOKEN_PATH = "tokens.json";

// ✅ 구글 OAuth 클라이언트 생성
const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
const drive = google.drive({ version: "v3", auth: oAuth2Client });

// ✅ 토큰 불러오기
const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
oAuth2Client.setCredentials(tokens);

// ✅ 구글 드라이브 폴더 ID
const FOLDER_ID = process.env.ROOT_FOLDER_ID;

// ✅ 다운로드 함수
async function downloadFile(fileId, fileName) {
  const destPath = path.join(DOWNLOAD_FOLDER, fileName);
  const dest = fs.createWriteStream(destPath);

  const res = await drive.files.get({ fileId, alt: "media" }, { responseType: "stream" });

  await new Promise((resolve, reject) => {
    res.data
      .on("end", () => {
        console.log(`✅ 다운로드 완료: ${fileName}`);
        resolve();
      })
      .on("error", (err) => {
        console.error(`❌ 다운로드 실패 (${fileName}):`, err.message);
        reject(err);
      })
      .pipe(dest);
  });
}

// ✅ 구글 드라이브 폴더 내 파일 확인 함수
async function checkDriveFolder() {
  try {
    const res = await drive.files.list({
      q: `'${FOLDER_ID}' in parents and trashed = false`,
      fields: "files(id, name, createdTime)",
      orderBy: "createdTime desc",
    });

    const files = res.data.files;
    if (!files || files.length === 0) {
      console.log("📭 새 파일 없음 (폴더 비어있음)");
      return;
    }

    for (const file of files) {
      const localPath = path.join(DOWNLOAD_FOLDER, file.name);
      if (!fs.existsSync(localPath)) {
        console.log(`⬇️ 새 파일 감지 → 다운로드 중: ${file.name}`);
        await downloadFile(file.id, file.name);
      }
    }
  } catch (err) {
    console.error("🚨 드라이브 폴더 확인 중 오류:", err.message);
  }
}

// ✅ 주기적으로 폴더 확인 (60초마다)
setInterval(checkDriveFolder, 60000);
console.log("🟢 구글 드라이브 자동 다운로드 감시 시작 (1분 주기)...");
checkDriveFolder();
