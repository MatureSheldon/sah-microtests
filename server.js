const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");

const root = __dirname;
const publicDir = path.join(root, "public");
const dataDir = path.join(root, "data");
const exportDir = path.join(root, "exports");
const logFile = path.join(dataDir, "microtest-log.json");
const questionBankFile = path.join(dataDir, "class-9-science.json");
const configFile = path.join(root, "config.json");

fs.mkdirSync(exportDir, { recursive: true });
if (!fs.existsSync(logFile)) fs.writeFileSync(logFile, "[]\n");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readConfig() {
  if (!fs.existsSync(configFile)) return {};
  return readJson(configFile);
}

function googleSheetApiUrl() {
  return process.env.GOOGLE_SHEET_API_URL || readConfig().googleSheetApiUrl || "";
}

async function fetchSheetQuestionBank() {
  const apiUrl = googleSheetApiUrl();
  if (!apiUrl) return null;
  const url = new URL(apiUrl);
  url.searchParams.set("action", "getBank");
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Google Sheet API returned ${response.status}`);
  const bank = await response.json();
  if (!bank || !Array.isArray(bank.questions)) throw new Error("Google Sheet API response is not a question bank");
  return bank;
}

async function getQuestionBank() {
  let fallbackReason = "";
  try {
    const sheetBank = await fetchSheetQuestionBank();
    if (sheetBank) return { ...sheetBank, connection: { source: "google-sheets", ok: true } };
  } catch (error) {
    fallbackReason = error.message;
    console.warn(`Using local question bank fallback: ${fallbackReason}`);
  }
  const localBank = readJson(questionBankFile);
  return { ...localBank, connection: { source: "local-fallback", ok: true, fallbackReason } };
}

function updateQuestionUsage(payload) {
  if (payload.test.isDemo) return;
  const bank = readJson(questionBankFile);
  const usedIds = new Set(payload.questions.map((q) => q.id));
  const askedDate = new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });
  bank.questions = bank.questions.map((q) => {
    if (!usedIds.has(q.id)) return q;
    return {
      ...q,
      timesAsked: Number(q.timesAsked || 0) + 1,
      lastAskedDate: askedDate,
      lastPaperId: payload.test.microtestId
    };
  });
  fs.writeFileSync(questionBankFile, `${JSON.stringify(bank, null, 2)}\n`);
}

async function recordPaperInGoogleSheet(payload) {
  const apiUrl = googleSheetApiUrl();
  if (!apiUrl) return false;
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "recordPaper", payload }),
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error(`Google Sheet recordPaper returned ${response.status}`);
  const result = await response.json();
  if (!result.ok) throw new Error(result.error || "Google Sheet recordPaper failed");
  return true;
}

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type });
  res.end(body);
}

function safeName(value) {
  return String(value || "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function xmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function paragraph(text, opts = {}) {
  const boldOpen = opts.bold ? "<w:b/>" : "";
  const size = opts.size ? `<w:sz w:val="${opts.size}"/><w:szCs w:val="${opts.size}"/>` : "";
  const jc = opts.align ? `<w:pPr><w:jc w:val="${opts.align}"/></w:pPr>` : "";
  return `<w:p>${jc}<w:r><w:rPr>${boldOpen}${size}</w:rPr><w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r></w:p>`;
}

function pageBreak() {
  return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
}

function makeDocumentXml(payload) {
  const test = payload.test;
  const questions = payload.questions;
  const created = new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });
  const chapterLine = test.chapterPlan.map((c) => `${c.chapterName} (${c.percentage}%)`).join(", ");
  const testLabel = test.isDemo ? "Demo Microtest" : "Microtest";
  let body = "";

  body += paragraph("Scholars Academic Home, Haldwani", { bold: true, size: 32, align: "center" });
  body += paragraph(`Class ${test.classLevel} ${test.subject} ${testLabel} ${test.microtestNumber}`, { bold: true, size: 28, align: "center" });
  body += paragraph(`Date: ${created}    Time: ${test.durationMinutes} minutes    Maximum Marks: ${test.totalMarks}`, { align: "center" });
  body += paragraph(`Chapters: ${chapterLine}`);
  body += paragraph("Student Name: ____________________________    Roll No.: ____________");
  body += paragraph("");

  let currentSection = "";
  questions.forEach((q, index) => {
    const section = `${q.questionType} Questions`;
    if (section !== currentSection) {
      currentSection = section;
      body += paragraph(section, { bold: true, size: 24 });
    }
    body += paragraph(`${index + 1}. [${q.marks} mark${q.marks === 1 ? "" : "s"}] ${q.question}`);
    if (q.questionType === "MCQ" && q.options) {
      body += paragraph(`   A. ${q.options.A}`);
      body += paragraph(`   B. ${q.options.B}`);
      body += paragraph(`   C. ${q.options.C}`);
      body += paragraph(`   D. ${q.options.D}`);
    }
    body += paragraph("");
  });

  body += pageBreak();
  body += paragraph("Teacher Copy: Answer Key", { bold: true, size: 30, align: "center" });
  body += paragraph(`Microtest ID: ${test.microtestId}`);
  body += paragraph("");
  questions.forEach((q, index) => {
    body += paragraph(`${index + 1}. ${q.answer}`, { bold: true });
    if (q.explanation) body += paragraph(`Explanation: ${q.explanation}`);
    body += paragraph(`Tags: ${q.chapterName}; ${q.topic}; ${q.difficulty}; ${q.questionType}; ${q.questionStyle || "Direct Recall"}; ${q.marks} mark(s)`);
    if (q.sourceType || q.pyqYear) {
      body += paragraph(`Source: ${q.sourceType || "Original"}${q.pyqYear ? `; PYQ ${q.pyqYear} ${q.pyqBoardExam || ""} ${q.pyqPaperSet || ""}` : ""}`);
    }
    body += paragraph("");
  });

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:w10="urn:schemas-microsoft-com:office:word"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
  xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
  xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
  xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
  xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
  mc:Ignorable="w14 wp14">
  <w:body>
    ${body}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
}

function writeDocx(payload) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sah-docx-"));
  const wordDir = path.join(tmp, "word");
  const relsDir = path.join(tmp, "_rels");
  const wordRelsDir = path.join(wordDir, "_rels");
  fs.mkdirSync(wordDir, { recursive: true });
  fs.mkdirSync(relsDir, { recursive: true });
  fs.mkdirSync(wordRelsDir, { recursive: true });

  fs.writeFileSync(path.join(tmp, "[Content_Types].xml"), `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`);
  fs.writeFileSync(path.join(relsDir, ".rels"), `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
  fs.writeFileSync(path.join(wordRelsDir, "document.xml.rels"), `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`);
  fs.writeFileSync(path.join(wordDir, "styles.xml"), `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/><w:sz w:val="22"/></w:rPr>
  </w:style>
</w:styles>`);
  fs.writeFileSync(path.join(wordDir, "document.xml"), makeDocumentXml(payload));

  const fileName = `${safeName(payload.test.microtestId)}.docx`;
  const output = path.join(exportDir, fileName);
  execFileSync("zip", ["-qr", output, "[Content_Types].xml", "_rels", "word"], { cwd: tmp });
  fs.rmSync(tmp, { recursive: true, force: true });
  return { fileName, output };
}

function getBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 5_000_000) {
        req.destroy();
        reject(new Error("Request too large"));
      }
    });
    req.on("end", () => resolve(body ? JSON.parse(body) : {}));
    req.on("error", reject);
  });
}

function serveStatic(req, res) {
  const urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  const relative = urlPath === "/" ? "index.html" : urlPath.slice(1);
  const filePath = path.normalize(path.join(publicDir, relative));
  if (!filePath.startsWith(publicDir)) return send(res, 403, "Forbidden", "text/plain");
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) return send(res, 404, "Not found", "text/plain");
  res.writeHead(200, { "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (req.method === "GET" && url.pathname === "/api/questions") {
      return send(res, 200, JSON.stringify(await getQuestionBank()));
    }
    if (req.method === "GET" && url.pathname === "/api/log") {
      return send(res, 200, fs.readFileSync(logFile, "utf8"));
    }
    if (req.method === "POST" && url.pathname === "/api/export") {
      const payload = await getBody(req);
      const logs = readJson(logFile);
      const existing = logs.find((entry) => entry.microtestId === payload.test.microtestId);
      const docx = writeDocx(payload);
      payload.test.fileName = docx.fileName;
      const logEntry = {
        ...payload.test,
        questionIds: payload.questions.map((q) => q.id),
        fileName: docx.fileName,
        createdAt: new Date().toISOString()
      };
      if (!existing) {
        logs.push(logEntry);
        fs.writeFileSync(logFile, `${JSON.stringify(logs, null, 2)}\n`);
        let recordedInSheet = false;
        try {
          recordedInSheet = await recordPaperInGoogleSheet(payload);
        } catch (error) {
          console.warn(`Could not record in Google Sheet: ${error.message}`);
        }
        if (!recordedInSheet) updateQuestionUsage(payload);
      }
      return send(res, 200, JSON.stringify({ ok: true, fileName: docx.fileName, downloadUrl: `/exports/${docx.fileName}` }));
    }
    if (req.method === "GET" && url.pathname.startsWith("/exports/")) {
      const filePath = path.normalize(path.join(exportDir, path.basename(url.pathname)));
      if (!filePath.startsWith(exportDir) || !fs.existsSync(filePath)) return send(res, 404, "Not found", "text/plain");
      res.writeHead(200, {
        "Content-Type": mimeTypes[".docx"],
        "Content-Disposition": `attachment; filename="${path.basename(filePath)}"`
      });
      return fs.createReadStream(filePath).pipe(res);
    }
    return serveStatic(req, res);
  } catch (error) {
    console.error(error);
    return send(res, 500, JSON.stringify({ error: error.message }));
  }
});

const port = Number(process.env.PORT || 3029);
const host = process.env.HOST || "127.0.0.1";
server.listen(port, host, () => {
  console.log(`SAH Microtests running at http://localhost:${port}`);
});
