const CONFIG = {
  questionsSheetName: "Questions",
  chaptersSheetName: "Chapters",
  generatedPapersSheetName: "Generated Papers",
  schoolName: "Scholars Academic Home",
  activeClassLevel: "9",
  activeSubject: "Science",
  classes: ["Nursery", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
  subjectsByClass: {
    Nursery: ["English", "Hindi", "Maths", "EVS"],
    LKG: ["English", "Hindi", "Maths", "EVS"],
    UKG: ["English", "Hindi", "Maths", "EVS"],
    "1": ["Science", "Maths", "English", "Hindi", "Social Science"],
    "2": ["Science", "Maths", "English", "Hindi", "Social Science"],
    "3": ["Science", "Maths", "English", "Hindi", "Social Science"],
    "4": ["Science", "Maths", "English", "Hindi", "Social Science"],
    "5": ["Science", "Maths", "English", "Hindi", "Social Science"],
    "6": ["Science", "Maths", "English", "Hindi", "Social Science"],
    "7": ["Science", "Maths", "English", "Hindi", "Social Science"],
    "8": ["Science", "Maths", "English", "Hindi", "Social Science"],
    "9": ["Science", "Maths", "English", "Hindi", "Social Science"],
    "10": ["Science", "Maths", "English", "Hindi", "Social Science"],
    "11": ["Physics", "Chemistry", "Biology", "Mathematics", "English"],
    "12": ["Physics", "Chemistry", "Biology", "Mathematics", "English"]
  }
};

const QUESTION_FIELDS = [
  "Question ID",
  "Class",
  "Subject",
  "Chapter No.",
  "Chapter",
  "Topic",
  "Subtopic",
  "Difficulty",
  "Question Type",
  "Question Style",
  "Marks",
  "Question",
  "Option A",
  "Option B",
  "Option C",
  "Option D",
  "Correct Answer",
  "Answer / Solution",
  "Explanation",
  "Learning Outcome",
  "NCERT Reference",
  "Source Type",
  "PYQ Year",
  "PYQ Board/Exam",
  "PYQ Paper/Set",
  "Use in Papers",
  "Times Asked",
  "Last Asked Date",
  "Last Paper ID",
  "Last Updated",
  "Notes"
];

function doGet(event) {
  const action = event.parameter.action || "getBank";
  if (action === "getBank") return jsonResponse(getQuestionBank());
  return jsonResponse({ ok: false, error: "Unknown action" });
}

function doPost(event) {
  const body = JSON.parse(event.postData.contents || "{}");
  if (body.action === "recordPaper") return jsonResponse(recordPaper(body.payload));
  return jsonResponse({ ok: false, error: "Unknown action" });
}

function jsonResponse(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function getQuestionBank() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(CONFIG.questionsSheetName);
  if (!sheet) throw new Error(`Missing sheet: ${CONFIG.questionsSheetName}`);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return emptyBank();

  const headers = values[0].map(String);
  const rows = values.slice(1);
  const questions = rows
    .map((row, index) => rowToQuestion(headers, row, index + 2))
    .filter((q) => q.id && q.useInPapers !== "No");
  const chapters = mergeChapters(readChaptersSheet(), uniqueChapters(questions));

  return {
    source: "Google Sheets",
    product: {
      schoolName: CONFIG.schoolName,
      activeClassLevel: CONFIG.activeClassLevel,
      activeSubject: CONFIG.activeSubject,
      classes: CONFIG.classes,
      subjectsByClass: CONFIG.subjectsByClass,
      activeDatasets: uniqueDatasets(questions, chapters),
      questionFields: QUESTION_FIELDS,
      questionTypes: ["MCQ", "Assertion-Reason", "Very Short Answer", "Short Answer", "Long Answer", "Case/Source-Based"],
      questionStyles: [
        "Direct Recall",
        "Conceptual",
        "Application",
        "Reasoning",
        "Competency-Based",
        "Numerical",
        "Diagram-Based",
        "Data/Table-Based",
        "Experiment/Activity-Based",
        "Visual/Figure-Based"
      ]
    },
    chapters,
    questions
  };
}

function emptyBank() {
  return {
    source: "Google Sheets",
    product: {
      schoolName: CONFIG.schoolName,
      activeClassLevel: CONFIG.activeClassLevel,
      activeSubject: CONFIG.activeSubject,
      classes: CONFIG.classes,
      subjectsByClass: CONFIG.subjectsByClass,
      activeDatasets: [],
      questionFields: QUESTION_FIELDS,
      questionTypes: [],
      questionStyles: []
    },
    chapters: [],
    questions: []
  };
}

function readChaptersSheet() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(CONFIG.chaptersSheetName);
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(String);
  return values.slice(1)
    .map((row) => {
      const data = {};
      headers.forEach((header, index) => {
        data[header] = row[index];
      });
      return {
        classLevel: String(data["Class"] || "").trim(),
        subject: String(data["Subject"] || "").trim(),
        chapterNumber: Number(data["Chapter No."] || data["Chapter No"] || 0),
        chapterName: String(data["Chapter"] || data["Chapter Name"] || "").trim()
      };
    })
    .filter((chapter) => chapter.classLevel && chapter.subject && chapter.chapterNumber && chapter.chapterName);
}

function rowToQuestion(headers, row, rowNumber) {
  const data = {};
  headers.forEach((header, index) => {
    data[header] = row[index];
  });

  const options = {};
  if (data["Option A"]) options.A = String(data["Option A"]);
  if (data["Option B"]) options.B = String(data["Option B"]);
  if (data["Option C"]) options.C = String(data["Option C"]);
  if (data["Option D"]) options.D = String(data["Option D"]);

  return {
    rowNumber,
    id: String(data["Question ID"] || "").trim(),
    classLevel: String(data["Class"] || "").trim(),
    subject: String(data["Subject"] || "").trim(),
    chapterNumber: Number(data["Chapter No."] || 0),
    chapterName: String(data["Chapter"] || "").trim(),
    topic: String(data["Topic"] || "").trim(),
    subtopic: String(data["Subtopic"] || "").trim(),
    difficulty: String(data["Difficulty"] || "").trim(),
    questionType: String(data["Question Type"] || "").trim(),
    questionStyle: String(data["Question Style"] || "").trim(),
    marks: Number(data["Marks"] || 0),
    question: String(data["Question"] || "").trim(),
    options: Object.keys(options).length ? options : undefined,
    correctAnswer: String(data["Correct Answer"] || "").trim(),
    answer: String(data["Answer / Solution"] || data["Correct Answer"] || "").trim(),
    answerSolution: String(data["Answer / Solution"] || "").trim(),
    explanation: String(data["Explanation"] || "").trim(),
    learningOutcome: String(data["Learning Outcome"] || "").trim(),
    ncertReference: String(data["NCERT Reference"] || "").trim(),
    sourceType: String(data["Source Type"] || "").trim(),
    pyqYear: String(data["PYQ Year"] || "").trim(),
    pyqBoardExam: String(data["PYQ Board/Exam"] || "").trim(),
    pyqPaperSet: String(data["PYQ Paper/Set"] || "").trim(),
    useInPapers: String(data["Use in Papers"] || "Yes").trim(),
    timesAsked: Number(data["Times Asked"] || 0),
    lastAskedDate: stringifyDate(data["Last Asked Date"]),
    lastPaperId: String(data["Last Paper ID"] || "").trim(),
    lastUpdated: stringifyDate(data["Last Updated"]),
    notes: String(data["Notes"] || "").trim()
  };
}

function recordPaper(payload) {
  if (!payload || !payload.test || !payload.questions) throw new Error("Missing paper payload");
  appendGeneratedPaper(payload);
  if (!payload.test.isDemo) updateUsage(payload);
  return { ok: true };
}

function appendGeneratedPaper(payload) {
  const sheet = ensureGeneratedPapersSheet();
  const test = payload.test;
  const chapters = test.chapterPlan.map((c) => `${c.chapterNumber}: ${c.percentage}%`).join(", ");
  const difficulty = Object.entries(test.difficultyMix).map(([name, pct]) => `${name}: ${pct}%`).join(", ");
  const questionIds = payload.questions.map((q) => q.id).join(", ");
  sheet.appendRow([
    test.microtestId,
    new Date(),
    test.classLevel,
    test.subject,
    chapters,
    test.totalMarks,
    `${test.durationMinutes} minutes`,
    difficulty,
    questionIds,
    test.fileName || "",
    test.teacherName || "",
    test.isDemo ? "Demo export" : ""
  ]);
}

function updateUsage(payload) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(CONFIG.questionsSheetName);
  if (!sheet) throw new Error(`Missing sheet: ${CONFIG.questionsSheetName}`);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);
  const idCol = headers.indexOf("Question ID") + 1;
  const timesCol = headers.indexOf("Times Asked") + 1;
  const dateCol = headers.indexOf("Last Asked Date") + 1;
  const paperCol = headers.indexOf("Last Paper ID") + 1;
  if (!idCol || !timesCol || !dateCol || !paperCol) throw new Error("Missing usage columns");

  const used = new Set(payload.questions.map((q) => q.id));
  for (let r = 2; r <= values.length; r += 1) {
    const id = String(values[r - 1][idCol - 1] || "").trim();
    if (!used.has(id)) continue;
    const current = Number(values[r - 1][timesCol - 1] || 0);
    sheet.getRange(r, timesCol).setValue(current + 1);
    sheet.getRange(r, dateCol).setValue(new Date());
    sheet.getRange(r, paperCol).setValue(payload.test.microtestId);
  }
}

function ensureGeneratedPapersSheet() {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName(CONFIG.generatedPapersSheetName);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.generatedPapersSheetName);
    sheet.appendRow(["Paper ID", "Date", "Class", "Subject", "Chapters", "Total Marks", "Duration", "Difficulty Mix", "Question IDs", "Export File", "Created By", "Notes"]);
  }
  return sheet;
}

function uniqueChapters(questions) {
  const map = {};
  questions.forEach((q) => {
    const key = `${q.classLevel}|${q.subject}|${q.chapterNumber}`;
    map[key] = {
      classLevel: q.classLevel,
      subject: q.subject,
      chapterNumber: q.chapterNumber,
      chapterName: q.chapterName
    };
  });
  return Object.values(map).sort((a, b) => {
    return String(a.classLevel).localeCompare(String(b.classLevel), undefined, { numeric: true }) ||
      a.subject.localeCompare(b.subject) ||
      a.chapterNumber - b.chapterNumber;
  });
}

function mergeChapters(primary, secondary) {
  const map = {};
  primary.concat(secondary).forEach((chapter) => {
    const key = `${chapter.classLevel}|${chapter.subject}|${chapter.chapterNumber}`;
    map[key] = chapter;
  });
  return Object.values(map).sort((a, b) => {
    return String(a.classLevel).localeCompare(String(b.classLevel), undefined, { numeric: true }) ||
      a.subject.localeCompare(b.subject) ||
      a.chapterNumber - b.chapterNumber;
  });
}

function uniqueDatasets(questions, chapters) {
  const map = {};
  questions.forEach((q) => {
    if (q.classLevel && q.subject) map[`${q.classLevel}|${q.subject}`] = { classLevel: q.classLevel, subject: q.subject };
  });
  chapters.forEach((chapter) => {
    if (chapter.classLevel && chapter.subject) map[`${chapter.classLevel}|${chapter.subject}`] = { classLevel: chapter.classLevel, subject: chapter.subject };
  });
  return Object.values(map);
}

function stringifyDate(value) {
  if (!value) return "";
  if (Object.prototype.toString.call(value) === "[object Date]") {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(value);
}
