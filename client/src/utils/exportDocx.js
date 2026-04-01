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
} from "docx";
import { saveAs } from "file-saver";

// Parse a markdown line into TextRun array (handles **bold**, *italic*, `code`)
const parseInline = (text) => {
  const runs = [];
  // Split on **bold**, *italic*, `code`
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Plain text before the match
    if (match.index > lastIndex) {
      runs.push(new TextRun({ text: text.slice(lastIndex, match.index) }));
    }

    if (match[2]) {
      // **bold**
      runs.push(new TextRun({ text: match[2], bold: true }));
    } else if (match[3]) {
      // *italic*
      runs.push(new TextRun({ text: match[3], italics: true }));
    } else if (match[4]) {
      // `code`
      runs.push(new TextRun({ text: match[4], font: "Courier New" }));
    }

    lastIndex = regex.lastIndex;
  }

  // Remaining plain text
  if (lastIndex < text.length) {
    runs.push(new TextRun({ text: text.slice(lastIndex) }));
  }

  return runs.length > 0 ? runs : [new TextRun({ text })];
};

// Convert markdown string → docx Paragraph/Table array
const markdownToDocxElements = (markdown) => {
  const lines = markdown.split("\n");
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // H1
    if (line.startsWith("# ")) {
      elements.push(new Paragraph({
        text: line.slice(2),
        heading: HeadingLevel.HEADING_1,
      }));

    // H2
    } else if (line.startsWith("## ")) {
      elements.push(new Paragraph({
        text: line.slice(3),
        heading: HeadingLevel.HEADING_2,
      }));

    // H3
    } else if (line.startsWith("### ")) {
      elements.push(new Paragraph({
        text: line.slice(4),
        heading: HeadingLevel.HEADING_3,
      }));

    // Bullet list
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(new Paragraph({
        children: parseInline(line.slice(2)),
        bullet: { level: 0 },
      }));

    // Numbered list
    } else if (/^\d+\. /.test(line)) {
      const text = line.replace(/^\d+\. /, "");
      elements.push(new Paragraph({
        children: parseInline(text),
        numbering: { reference: "default-numbering", level: 0 },
      }));

    // Blockquote
    } else if (line.startsWith("> ")) {
      elements.push(new Paragraph({
        children: [new TextRun({ text: line.slice(2), italics: true, color: "666666" })],
        indent: { left: 720 },
      }));

    // Horizontal rule
    } else if (line.startsWith("---") || line.startsWith("***")) {
      elements.push(new Paragraph({
        border: { bottom: { color: "cccccc", style: BorderStyle.SINGLE, size: 6 } },
        text: "",
      }));

    // Table — detect by | at start
    } else if (line.startsWith("|")) {
      const tableLines = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        // skip separator rows like |---|---|
        if (!/^\|[\s\-|:]+\|$/.test(lines[i])) {
          tableLines.push(lines[i]);
        }
        i++;
      }

      const rows = tableLines.map((tl, rowIndex) => {
        const cells = tl.split("|").filter((c) => c.trim() !== "");
        return new TableRow({
          children: cells.map((cell) =>
            new TableCell({
              children: [new Paragraph({
                children: parseInline(cell.trim()),
                alignment: AlignmentType.LEFT,
              })],
              shading: rowIndex === 0
                ? { fill: "e0f2fe" }   // header row light blue
                : { fill: "ffffff" },
            })
          ),
        });
      });

      if (rows.length > 0) {
        elements.push(new Table({
          rows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        }));
      }

      continue; // i already advanced inside the while loop above

    // Code block
    } else if (line.startsWith("```")) {
      i++;
      const codeLines = [];
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      codeLines.forEach((cl) => {
        elements.push(new Paragraph({
          children: [new TextRun({ text: cl, font: "Courier New", size: 20 })],
          shading: { fill: "f1f5f9" },
          indent: { left: 360 },
        }));
      });

    // Empty line → spacer
    } else if (line.trim() === "") {
      elements.push(new Paragraph({ text: "" }));

    // Normal paragraph
    } else {
      elements.push(new Paragraph({ children: parseInline(line) }));
    }

    i++;
  }

  return elements;
};

export const exportToDocx = async (markdown, filename = "notes") => {
  try {
    const doc = new Document({
      numbering: {
        config: [{
          reference: "default-numbering",
          levels: [{
            level: 0,
            format: "decimal",
            text: "%1.",
            alignment: AlignmentType.LEFT,
          }],
        }],
      },
      sections: [{
        properties: {},
        children: markdownToDocxElements(markdown),
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${filename}.docx`);
  } catch (err) {
    console.error("DOCX export failed:", err);
  }
};