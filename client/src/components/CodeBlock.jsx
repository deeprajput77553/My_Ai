import { useState } from "react";
import "./CodeBlock.css";

// Detect language from className (react-markdown passes "language-js" etc)
const getLang = (className = "") => {
  const match = className.match(/language-(\w+)/);
  return match ? match[1] : "txt";
};

// Map language to file extension
const EXTENSIONS = {
  javascript: "js", js: "js", typescript: "ts", ts: "ts",
  python: "py",     py: "py", java: "java",      c: "c",
  cpp: "cpp",       cs: "cs", go: "go",          rust: "rs",
  html: "html",     css: "css", json: "json",    bash: "sh",
  sh: "sh",         sql: "sql", php: "php",      ruby: "rb",
  swift: "swift",   kotlin: "kt", r: "r",        yaml: "yaml",
  yml: "yaml",      xml: "xml",  txt: "txt",
};

const getFilename = (code, lang) => {
  const lines = code.split("\n");
  const firstLine = lines[0] || "";
  // Look for // filename: example.js or # filename: example.py
  const match = firstLine.match(/(?:\/\/|#|--) filename:\s*([\w.]+)/i);
  if (match) return match[1];
  
  const ext = getExt(lang, code);
  return `code_snippet.${ext}`;
};

const getExt = (lang, code = "") => {
  const l = (lang || "").toLowerCase();
  if (l && l !== "txt") return EXTENSIONS[l] || "txt";
  
  // Sniff code content
  const c = code.toLowerCase();
  if (c.includes("import ") || c.includes("def ") || c.includes("print(")) return "py";
  if (c.includes("const ") || c.includes("let ") || c.includes("function ") || c.includes("console.log")) return "js";
  if (c.includes("<html>") || c.includes("<!doctype") || c.includes("</div>")) return "html";
  if (c.includes("{") && c.includes(": ") && (c.includes("color:") || c.includes("margin:"))) return "css";
  if (c.includes("public class ") || c.includes("system.out.println")) return "java";
  return "txt";
};

function CodeBlock({ className, children }) {
  const [copied, setCopied]   = useState(false);
  const [editing, setEditing] = useState(false);
  const [code, setCode]       = useState(String(children).replace(/\n$/, ""));

  const lang = getLang(className);
  const filename = getFilename(code, lang);
  const ext = filename.split(".").pop() || "txt";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const el = document.createElement("textarea");
      el.value = code;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="codeBlock">
      {/* Header bar */}
      <div className="codeBlockHeader">
        <div className="codeLang">
          <i className="fi fi-sr-file-code" style={{ color: "#38bdf8", fontSize: "16px" }} />
          <span className="codeLangLabel">{filename}</span>
        </div>
        <div className="codeActions">
          {/* Edit toggle */}
          <button
            className={`codeBtn ${editing ? "active" : ""}`}
            onClick={() => setEditing((p) => !p)}
            title={editing ? "Done editing" : "Edit code"}
          >
            <i className={editing ? "fi fi-sr-check" : "fi fi-sr-pencil"} />
            <span>{editing ? "Done" : "Edit"}</span>
          </button>

          <button
            className="codeBtn"
            onClick={handleCopy}
            title="Copy code"
          >
            <i className={copied ? "fi fi-sr-check" : "fi fi-sr-copy"} />
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>

          <button
            className="codeBtn"
            onClick={handleDownload}
            title={`Download as ${filename}`}
          >
            <i className="fi fi-sr-download" />
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* Code area */}
      {editing ? (
        <textarea
          className="codeEditor"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
        />
      ) : (
        <pre className="codePre">
          <code className={className}>{code}</code>
        </pre>
      )}
    </div>
  );
}

export default CodeBlock;