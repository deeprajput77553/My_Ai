import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  PageBreak,
  Header,
  Footer,
  PageNumber
} from "docx";
import { saveAs } from "file-saver";

// Parse a markdown line into TextRun array (handles **bold**, *italic*, `code`)
const parseInline = (text) => {
  if (!text) return [new TextRun("")];
  const runs = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      runs.push(new TextRun({ text: text.slice(lastIndex, match.index) }));
    }
    if (match[2]) runs.push(new TextRun({ text: match[2], bold: true }));
    else if (match[3]) runs.push(new TextRun({ text: match[3], italics: true }));
    else if (match[4]) runs.push(new TextRun({ text: match[4], font: "Courier New", color: "2c3e50" }));
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    runs.push(new TextRun({ text: text.slice(lastIndex) }));
  }

  return runs.length > 0 ? runs : [new TextRun({ text })];
};

const markdownToDocxElements = (markdown) => {
  const lines = markdown.split("\n");
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trimEnd();

    if (line.includes("---PAGEBREAK---")) {
      elements.push(new Paragraph({ children: [new PageBreak()] }));
    }
    else if (line.startsWith("# ")) {
      elements.push(new Paragraph({ text: line.slice(2), heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }));
    } else if (line.startsWith("## ")) {
      elements.push(new Paragraph({ text: line.slice(3), heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 150 } }));
    } else if (line.startsWith("### ")) {
      elements.push(new Paragraph({ text: line.slice(4), heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100 } }));
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(new Paragraph({ children: parseInline(line.slice(2)), bullet: { level: 0 }, spacing: { after: 100 } }));
    } else if (/^\d+\. /.test(line)) {
      elements.push(new Paragraph({ children: parseInline(line.replace(/^\d+\. /, "")), numbering: { reference: "default-numbering", level: 0 }, spacing: { after: 100 } }));
    } else if (line.startsWith("> ")) {
      elements.push(new Paragraph({ children: [new TextRun({ text: line.slice(2), italics: true, color: "666666" })], indent: { left: 720 }, spacing: { before: 200, after: 200 } }));
    } else if (line.startsWith("---") || line.startsWith("***")) {
      elements.push(new Paragraph({ border: { bottom: { color: "cccccc", style: BorderStyle.SINGLE, size: 6 } }, spacing: { after: 240 } }));
    } else if (line.startsWith("|")) {
      const tableLines = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        if (!/^\|[\s\-|:]+\|$/.test(lines[i])) tableLines.push(lines[i]);
        i++;
      }
      const rows = tableLines.map((tl, rowIndex) => {
        return new TableRow({
          children: tl.split("|").filter((c) => c.trim() !== "").map((cell) =>
            new TableCell({
              children: [new Paragraph({ children: parseInline(cell.trim()), alignment: AlignmentType.LEFT })],
              shading: rowIndex === 0 ? { fill: "f1f5f9" } : undefined,
              verticalAlign: AlignmentType.CENTER,
              margins: { top: 100, bottom: 100, left: 100, right: 100 }
            })
          ),
        });
      });
      if (rows.length > 0) elements.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE }, margins: { top: 200, bottom: 200 } }));
      continue;
    } else if (line.startsWith("```")) {
      i++;
      const codeLines = [];
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      codeLines.forEach((cl) => elements.push(new Paragraph({ children: [new TextRun({ text: cl, font: "Courier New", size: 18 })], shading: { fill: "f8fafc" }, indent: { left: 360 }, spacing: { before: 40, after: 40 } })));
    } else if (line.trim() === "") {
      elements.push(new Paragraph({ spacing: { after: 120 } }));
    } else {
      elements.push(new Paragraph({ children: parseInline(line), spacing: { after: 120 } }));
    }
    i++;
  }
  return elements;
};

export const exportToDocx = async (markdown, filename = "notes", config = {}) => {
  if (!markdown) return Promise.reject("No content");
  
  try {
    const cleanName = typeof filename === "string" ? filename : "notes";
    const safeBase = cleanName.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30);
    const finalFilename = `${safeBase || "my_ai_notes"}.docx`;
    const hAlign = config.headerAlign === "center" ? AlignmentType.CENTER : (config.headerAlign === "right" ? AlignmentType.RIGHT : AlignmentType.LEFT);
    const fAlign = config.pageNumAlign === "left" ? AlignmentType.LEFT : (config.pageNumAlign === "right" ? AlignmentType.RIGHT : AlignmentType.CENTER);

    const doc = new Document({
      numbering: {
        config: [{ reference: "default-numbering", levels: [{ level: 0, format: "decimal", text: "%1.", alignment: AlignmentType.LEFT }] }],
      },
      sections: [{
        properties: {
          page: config.borders ? {
            borders: {
              pageBorders: {
                display: "allPages",
                left: { style: BorderStyle.SINGLE, size: 6, color: "cccccc" },
                right: { style: BorderStyle.SINGLE, size: 6, color: "cccccc" },
                top: { style: BorderStyle.SINGLE, size: 6, color: "cccccc" },
                bottom: { style: BorderStyle.SINGLE, size: 6, color: "cccccc" }
              }
            }
          } : {}
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: hAlign,
                children: [new TextRun({ text: config.headerText || "MY AI Generated", bold: true, color: "555555", size: 18 })],
              }),
              new Paragraph({ border: { bottom: { color: "dddddd", style: BorderStyle.SINGLE, size: 6 } }, spacing: { after: 400 } })
            ],
          }),
        },
        footers: config.pageNumbers ? {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: fAlign,
                spacing: { before: 200 },
                children: [
                  new TextRun({ text: "Page ", size: 18 }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 18 }),
                  new TextRun({ text: " of ", size: 18 }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18 }),
                ],
              }),
            ],
          }),
        } : {},
        children: markdownToDocxElements(markdown),
      }],
    });


    const blob = await Packer.toBlob(doc);
    saveAs(blob, finalFilename);
    return Promise.resolve();
  } catch (err) {
    console.error("DOCX export failed:", err);
    return Promise.reject(err);
  }
};