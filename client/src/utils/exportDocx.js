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
  PageNumber,
  TabStopType,
  TabStopPosition
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
    if (match.index > lastIndex) {
      runs.push(new TextRun({ text: text.slice(lastIndex, match.index) }));
    }
    if (match[2]) runs.push(new TextRun({ text: match[2], bold: true }));
    else if (match[3]) runs.push(new TextRun({ text: match[3], italics: true }));
    else if (match[4]) runs.push(new TextRun({ text: match[4], font: "Courier New" }));
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
    const line = lines[i];

    if (line.includes("---PAGEBREAK---")) {
      elements.push(new Paragraph({ children: [new PageBreak()] }));
    }
    else if (line.startsWith("# ")) {
      elements.push(new Paragraph({ text: line.slice(2), heading: HeadingLevel.HEADING_1 }));
    } else if (line.startsWith("## ")) {
      elements.push(new Paragraph({ text: line.slice(3), heading: HeadingLevel.HEADING_2 }));
    } else if (line.startsWith("### ")) {
      elements.push(new Paragraph({ text: line.slice(4), heading: HeadingLevel.HEADING_3 }));
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(new Paragraph({ children: parseInline(line.slice(2)), bullet: { level: 0 } }));
    } else if (/^\d+\. /.test(line)) {
      elements.push(new Paragraph({ children: parseInline(line.replace(/^\d+\. /, "")), numbering: { reference: "default-numbering", level: 0 } }));
    } else if (line.startsWith("> ")) {
      elements.push(new Paragraph({ children: [new TextRun({ text: line.slice(2), italics: true, color: "666666" })], indent: { left: 720 } }));
    } else if (line.startsWith("---") || line.startsWith("***")) {
      elements.push(new Paragraph({ border: { bottom: { color: "cccccc", style: BorderStyle.SINGLE, size: 6 } }, text: "" }));
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
              shading: rowIndex === 0 ? { fill: "e0f2fe" } : { fill: "ffffff" },
            })
          ),
        });
      });
      if (rows.length > 0) elements.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }));
      continue;
    } else if (line.startsWith("```")) {
      i++;
      const codeLines = [];
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      codeLines.forEach((cl) => elements.push(new Paragraph({ children: [new TextRun({ text: cl, font: "Courier New", size: 20 })], shading: { fill: "f1f5f9" }, indent: { left: 360 } })));
    } else if (line.trim() === "") {
      elements.push(new Paragraph({ text: "" }));
    } else {
      elements.push(new Paragraph({ children: parseInline(line) }));
    }
    i++;
  }
  return elements;
};

export const exportToDocx = async (markdown, filename = "notes", config = {}) => {
  try {
    const headerAlignMap = {
      "left": AlignmentType.LEFT,
      "center": AlignmentType.CENTER,
      "right": AlignmentType.RIGHT
    };
    
    const hAlign = headerAlignMap[config.headerAlign] || AlignmentType.RIGHT;
    const fAlign = headerAlignMap[config.pageNumAlign] || AlignmentType.CENTER;

    const sectionsData = {
      properties: {
        page: config.borders ? {
          borders: {
            pageBorders: {
              display: "allPages",
              left: { style: BorderStyle.SINGLE, size: 6, color: "aaaaaa" },
              right: { style: BorderStyle.SINGLE, size: 6, color: "aaaaaa" },
              top: { style: BorderStyle.SINGLE, size: 6, color: "aaaaaa" },
              bottom: { style: BorderStyle.SINGLE, size: 6, color: "aaaaaa" }
            }
          }
        } : {}
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: hAlign,
              children: [
                new TextRun({ text: config.headerText || "MY AI Generated", bold: true, color: "555555" })
              ],
            }),
            new Paragraph({
              border: { bottom: { color: "cccccc", style: BorderStyle.SINGLE, size: 6 } }, text: ""
            })
          ],
        }),
      },
      children: markdownToDocxElements(markdown),
    };

    if (config.pageNumbers) {
      sectionsData.footers = {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: fAlign,
              children: [
                new TextRun("Page "),
                new TextRun({ children: [PageNumber.CURRENT] }),
                new TextRun(" of "),
                new TextRun({ children: [PageNumber.TOTAL_PAGES] }),
              ],
            }),
          ],
        }),
      };
    }

    const doc = new Document({
      numbering: {
        config: [{ reference: "default-numbering", levels: [{ level: 0, format: "decimal", text: "%1.", alignment: AlignmentType.LEFT }] }],
      },
      sections: [sectionsData],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${filename}.docx`);
  } catch (err) {
    console.error("DOCX export failed:", err);
  }
};