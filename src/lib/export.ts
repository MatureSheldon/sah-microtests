import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import { Question } from './bank';

export interface ExportContext {
  testNumber: number;
  classLevel: string;
  subject: string;
  durationMinutes: number;
  totalMarks: number;
  chapters: string;
}

function createParagraph(text: string, isBold = false) {
  return new Paragraph({
    children: [new TextRun({ text, bold: isBold, size: 24 })],
    spacing: { after: 200 }
  });
}

function stripHtml(html: string) {
  // Very basic strip, DOCX generation from HTML usually requires a dedicated parser,
  // but for basic text we just strip tags
  return html.replace(/<[^>]*>?/gm, '');
}

export async function exportDocx(questions: Question[], ctx: ExportContext) {
  const created = new Date().toLocaleDateString('en-IN');
  const title = `Class ${ctx.classLevel} ${ctx.subject} Microtest ${ctx.testNumber}`;

  const studentCopy = [
    new Paragraph({
      text: "Scholars Academic Home, Haldwani",
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      text: title,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      text: `Date: ${created}    Time: ${ctx.durationMinutes} minutes    Maximum Marks: ${ctx.totalMarks}`,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    }),
    new Paragraph({
      text: `Chapters: ${ctx.chapters}`,
      spacing: { after: 200 }
    }),
    new Paragraph({
      text: "Student Name: ____________________________    Roll No.: ____________",
      spacing: { after: 400 }
    }),
  ];

  let currentSection = "";
  questions.forEach((q, i) => {
    const section = `${q.questionType} Questions`;
    if (section !== currentSection) {
      currentSection = section;
      studentCopy.push(new Paragraph({
        text: section,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 }
      }));
    }

    const cleanQuestion = stripHtml(q.question);
    studentCopy.push(createParagraph(`${i + 1}. [${q.marks} mark${q.marks === 1 ? "" : "s"}] ${cleanQuestion}`));

    if (q.options) {
      studentCopy.push(createParagraph(`   A. ${stripHtml(q.options.A)}`));
      studentCopy.push(createParagraph(`   B. ${stripHtml(q.options.B)}`));
      studentCopy.push(createParagraph(`   C. ${stripHtml(q.options.C)}`));
      studentCopy.push(createParagraph(`   D. ${stripHtml(q.options.D)}`));
    }
  });

  const teacherCopy = [
    new Paragraph({
      text: "Teacher Copy: Answer Key",
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      pageBreakBefore: true,
      spacing: { after: 400 }
    }),
  ];

  questions.forEach((q, i) => {
    // In our simplified Question type, answer may not be present but let's safely read it
    const ans = (q as any).answer || (q.options ? "Refer to options" : "Subjective");
    teacherCopy.push(createParagraph(`${i + 1}. ${stripHtml(ans)}`, true));
    
    if ((q as any).explanation) {
      teacherCopy.push(createParagraph(`Explanation: ${stripHtml((q as any).explanation)}`));
    }
  });

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        ...studentCopy,
        ...teacherCopy
      ]
    }]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Microtest_${ctx.classLevel}_${ctx.subject}_T${ctx.testNumber}.docx`);
}
