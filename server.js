// server.js (Render 배포용 완전본)
// ───────────────────────────────────────────────────────────
// 1) 어떤 환경에서도 돌아가도록 경로/토큰 처리 강화
// 2) tokens.json: 로컬은 파일, Render는 Secret File 또는 환경변수에서 로드
// 3) 정적페이지: /public 에서 서빙
// 4) 업로드: /api/upload -> Google Drive 업로드
// ───────────────────────────────────────────────────────────

const path = require("path");
const fs = require("fs");
const fse = require("fs-extra");
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const dayjs = require("dayjs");
const { google } = require("googleapis");
require("dotenv").config();

const app = express();

// ── 기본 미들웨어
app.use(cors());
app.use(morgan("dev"));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public"))); // index.html/result.html 제공

// ── 환경변수
const PORT = process.env.PORT || 3000;
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/oauth2/callback";
const ROOT_FOLDER_ID = process.env.ROOT_FOLDER_ID; // 구글드라이브 최상위 업로드 폴더 ID

// ── tokens.json 로딩 (Render: Secret File or ENV, Local: 파일)
function loadTokens() {
  // 1) 환경변수로 전체 JSON을 넘기는 방식 (TOKENS_JSON)
  if (process.env.TOKENS_JSON) {
    try {
      return JSON.parse(process.env.TOKENS_JSON);
    } catch (e) {
      console.error("❌ TOKENS_JSON 파싱 실패:", e.message);
    }
  }

  // 2) 특정 경로에 Secret File을 올린 경우 (Render Secret File Path)
  const tokensPath = process.env.TOKENS_PATH || path.join(__dirname, "tokens.json");
  if (fs.existsSync(tokensPath)) {
    try {
      return JSON.parse(fs.readFileSync(tokensPath, "utf-8"));
    } catch (e) {
      console.error("❌ tokens.json 읽기 실패:", e.message);
    }
  }

  console.error("❌ 토큰을 찾을 수 없습니다. TOKENS_JSON env 또는 tokens.json 준비 필요");
  return null;
}

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
const tokens = loadTokens();
if (tokens) oAuth2Client.setCredentials(tokens);
const drive = google.drive({ version: "v3", auth: oAuth2Client });

// ── Multer (메모리 저장)
const upload = multer({ storage: multer.memoryStorage() });

// ── 유틸: 날짜 폴더/사이즈 폴더 생성
async function ensureFolderOnDrive(name, parentId) {
  // 이미 존재하는지 검색
  const search = await drive.files.list({
    q: `'${parentId}' in parents and name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id, name)",
    spaces: "drive",
  });

  if (search.data.files.length > 0) {
    return search.data.files[0].id; // 기존 폴더
  }

  // 없으면 생성
  const fileMetadata = {
    name,
    mimeType: "application/vnd.google-apps.folder",
    parents: [parentId],
  };
  const res = await drive.files.create({
    resource: fileMetadata,
    fields: "id",
  });
  return res.data.id;
}

// ── API: 파일 업로드
app.post("/api/upload", upload.single("photo"), async (req, res) => {
  try {
    if (!ROOT_FOLDER_ID) {
      return res.status(500).json({ ok: false, error: "ROOT_FOLDER_ID 미설정" });
    }
    if (!req.file) {
      return res.status(400).json({ ok: false, error: "파일이 없습니다" });
    }

    const size = req.body.size || "4x6";
    const now = dayjs();
    const dateFolder = now.format("YYYY-MM-DD");
    const mainFolder = "MAIN";

    // MAIN 폴더
    const mainFolderId = await ensureFolderOnDrive(mainFolder, ROOT_FOLDER_ID);
    // 날짜 폴더
    const dateFolderId = await ensureFolderOnDrive(dateFolder, mainFolderId);
    // 사이즈 폴더
    const sizeFolderId = await ensureFolderOnDrive(size, dateFolderId);

    // 파일 업로드
    const fileName = req.file.originalname || `upload_${Date.now()}.jpg`;
    const fileMetadata = {
      name: fileName,
      parents: [sizeFolderId],
    };

    const media = {
      mimeType: req.file.mimetype || "image/jpeg",
      body: BufferToStream(req.file.buffer),
    };

    const uploadRes = await drive.files.create({
      resource: fileMetadata,
      media,
      fields: "id, name",
    });

    res.json({ ok: true, id: uploadRes.data.id, name: uploadRes.data.name });
  } catch (e) {
    console.error(e.response?.data || e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 버퍼를 스트림으로 변환 (구글 드라이브 업로드용)
function BufferToStream(binary) {
  const { Readable } = require("stream");
  const readable = new Readable();
  readable._read = () => {};
  readable.push(binary);
  readable.push(null);
  return readable;
}

// ── 서버 시작
app.listen(PORT, () => {
  console.log(`🌐 PhotoPrint API 서버 실행 중: http://localhost:${PORT}`);
  console.log(`📤 업로드 엔드포인트: POST /api/upload`);
});
