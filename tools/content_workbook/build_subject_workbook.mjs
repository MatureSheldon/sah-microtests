#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const artifactToolModule =
  process.env.ARTIFACT_TOOL_MODULE ??
  "/Users/adityabhatt/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs";

const { SpreadsheetFile, Workbook } = await import(pathToFileURL(artifactToolModule).href);

const BASE_SHEETS = [
  ["Chapter_Map", "Chapter_Map.csv"],
  ["Topic_Map", "Topic_Map.csv"],
  ["Lesson_Plans", "Lesson_Plans.csv"],
  ["Concepts", "Concepts.csv"],
  ["Homework", "Homework.csv"],
  ["Resources", "Resources.csv"],
  ["Questions", "Questions.csv"],
];

const OPTIONAL_SHEETS = [
  ["Worked_Examples", "Worked_Examples.csv"],
  ["Teacher_Review", "Teacher_Review.csv"],
];

const WIDTHS = {
  Chapter_Map: [18, 12, 46, 16, 14],
  Topic_Map: [20, 18, 14, 44, 16, 18, 72, 14, 18, 22, 18, 26, 22],
  Lesson_Plans: [22, 18, 20, 54, 54, 54, 54, 54, 54, 40, 44],
  Concepts: [22, 18, 20, 38, 78, 46, 46, 16, 76, 42],
  Homework: [24, 18, 20, 40, 14, 78, 10, 14, 72, 72, 14, 16, 76, 18, 14, 14],
  Resources: [24, 18, 20, 18, 48, 42, 68, 14],
  Questions: [24, 10, 14, 12, 44, 38, 30, 14, 20, 22, 10, 78, 28, 28, 28, 28, 18, 54, 58, 48, 44, 24, 12, 20, 20, 14, 12, 16, 18, 16, 36, 28, 16, 52, 18, 14, 14, 20, 18, 28, 32],
  Worked_Examples: [26, 18, 20, 42, 72, 90, 42, 58, 58, 16, 76, 14],
  Teacher_Review: [24, 16, 24, 18, 20, 22, 14, 22, 72, 18],
};

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item.startsWith("--")) continue;
    const key = item.slice(2);
    const value = argv[i + 1]?.startsWith("--") ? "true" : argv[i + 1];
    args[key] = value ?? "true";
    if (value !== "true") i += 1;
  }
  return args;
}

function slug(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function padClass(classLevel) {
  return String(classLevel).padStart(2, "0");
}

async function rowCountForCsv(sourceDir, fileName) {
  const text = await fs.readFile(path.join(sourceDir, fileName), "utf8");
  return Math.max(text.split(/\r?\n/).filter(Boolean).length - 1, 0);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourceDir = args["source-dir"];
  const classLevel = args.class;
  const subject = args.subject;
  const subjectId = args["subject-id"] ?? "";

  if (!sourceDir || !classLevel || !subject) {
    console.error("Usage: build_subject_workbook.mjs --source-dir <folder> --class <level> --subject <name> [--subject-id <id>] [--output <xlsx>]");
    process.exit(2);
  }

  const outputPath =
    args.output ??
    path.join(sourceDir, `class-${padClass(classLevel)}-${slug(subject)}-subject-workbook.xlsx`);

  const optionalExisting = [];
  for (const [sheetName, fileName] of OPTIONAL_SHEETS) {
    try {
      await fs.access(path.join(sourceDir, fileName));
      optionalExisting.push([sheetName, fileName]);
    } catch {
      // Optional quality sheet is absent in older workbook folders.
    }
  }
  const sheets = [...BASE_SHEETS, ...optionalExisting];

  const [firstSheetName, firstFile] = sheets[0];
  const firstCsv = await fs.readFile(path.join(sourceDir, firstFile), "utf8");
  const workbook = await Workbook.fromCSV(firstCsv, { sheetName: firstSheetName });

  for (const [sheetName, fileName] of sheets.slice(1)) {
    const csvText = await fs.readFile(path.join(sourceDir, fileName), "utf8");
    await workbook.fromCSV(csvText, { sheetName });
  }

  for (const [sheetName] of sheets) {
    const sheet = workbook.worksheets.getItem(sheetName);
    const used = sheet.getUsedRange();
    used.format.font.name = "Aptos";
    used.format.font.size = 10;
    used.format.wrapText = true;
    sheet.freezePanes.freezeRows(1);
    sheet.showGridLines = false;

    const rowCount = used.rowCount;
    const colCount = used.columnCount;
    const header = sheet.getRangeByIndexes(0, 0, 1, colCount);
    header.format.fill.color = "#1E40AF";
    header.format.font.color = "#FFFFFF";
    header.format.font.bold = true;
    header.format.rowHeightPx = 34;
    header.format.borders = { preset: "all", style: "thin", color: "#1E3A8A" };

    if (rowCount > 1) {
      sheet.getRangeByIndexes(1, 0, rowCount - 1, colCount).format.borders = {
        preset: "inside",
        style: "thin",
        color: "#E2E8F0",
      };
    }

    const widths = WIDTHS[sheetName] ?? [];
    for (let col = 0; col < colCount; col += 1) {
      sheet.getRangeByIndexes(0, col, rowCount, 1).format.columnWidth = widths[col] || 20;
    }
  }

  const counts = {};
  for (const [sheetName, fileName] of sheets) {
    counts[sheetName] = await rowCountForCsv(sourceDir, fileName);
  }

  const summary = workbook.worksheets.add("README");
  summary.showGridLines = false;
  summary.getRange("A1:G1").merge();
  summary.getRange("A1").values = [[`Class ${classLevel} ${subject} Subject Workbook`]];
  summary.getRange("A1").format.fill.color = "#0F172A";
  summary.getRange("A1").format.font.color = "#FFFFFF";
  summary.getRange("A1").format.font.bold = true;
  summary.getRange("A1").format.font.size = 14;
  summary.getRange("A1").format.rowHeightPx = 34;

  summary.getRange("A3:B14").values = [
    ["Class", String(classLevel)],
    ["Subject", subject],
    ["Subject ID", subjectId],
    ["Chapters included", String(counts.Chapter_Map)],
    ["Topics included", String(counts.Topic_Map)],
    ["Concept cards", String(counts.Concepts)],
    ["Homework rows", String(counts.Homework)],
    ["Question rows", String(counts.Questions)],
    ["Courseware tabs", "Chapter_Map, Topic_Map, Lesson_Plans, Concepts, Homework, Resources"],
    ["Question bank tab", "Questions"],
    ["Quality tabs", optionalExisting.map(([name]) => name).join(", ") || "None"],
    ["Concept visual format", "Use visual_type = mermaid for flows/cycles/trees and svg for spatial/scientific diagrams."],
    ["Homework design", "Homework is concept-depth practice, not timed testing. Homework may include Mermaid or SVG assets in asset_format/asset_data."],
  ];
  summary.getRange("A3:A14").format.font.bold = true;
  summary.getRange("A3:B14").format.borders = { preset: "all", style: "thin", color: "#CBD5E1" };
  summary.getRange("A3:B14").format.wrapText = true;
  summary.getRange("A:A").format.columnWidth = 24;
  summary.getRange("B:B").format.columnWidth = 92;
  summary.freezePanes.freezeRows(1);

  const output = await SpreadsheetFile.exportXlsx(workbook);
  await output.save(outputPath);
  console.log(outputPath);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
