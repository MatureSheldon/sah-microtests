import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun } from 'docx';
import { saveAs } from 'file-saver';
import { Question } from './bank';
import { renderGeoJsonSvg } from './geojsonRender';

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


const TRANSPARENT_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';

function base64ToUint8Array(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function svgToImageParagraph(svg: string, title: string) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 220 },
    children: [
      new ImageRun({
        type: 'svg',
        data: new TextEncoder().encode(svg),
        transformation: { width: 520, height: 294 },
        altText: { title, description: title, name: title },
        fallback: {
          type: 'png',
          data: base64ToUint8Array(TRANSPARENT_PNG),
        },
      }),
    ],
  });
}

function assetParagraphs(q: Question, title: string) {
  const format = String(q.assetFormat || '').trim().toLowerCase();
  const data = String(q.assetData || '').trim();
  const visual = data || String(q.imageUrl || '').trim();
  if (!visual) return [] as Paragraph[];

  if (format === 'geojson') {
    const svg = renderGeoJsonSvg(visual, title);
    if (svg) return [svgToImageParagraph(svg, title)];
    return [createParagraph('   [Map could not be rendered. Check GeoJSON asset data.]')];
  }

  if (format === 'svg' || visual.startsWith('<svg')) {
    return [svgToImageParagraph(visual, title)];
  }

  if (format === 'mermaid') {
    return [createParagraph('   [Diagram asset available in app preview; Mermaid export rendering is not enabled yet.]')];
  }

  return [createParagraph(`   [Attached Image: ${visual}]`)];
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

    studentCopy.push(...assetParagraphs(q, `Question ${i + 1} visual`));

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
    teacherCopy.push(...assetParagraphs(q, `Question ${i + 1} visual`));
    
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
