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

const getExt = (lang) => EXTENSIONS[lang.toLowerCase()] || "txt";

function CodeBlock({ className, children }) {
  const [copied, setCopied]   = useState(false);
  const [editing, setEditing] = useState(false);
  const [code, setCode]       = useState(String(children).replace(/\n$/, ""));

  const lang = getLang(className);
  const ext  = getExt(lang);

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
    a.download = `code.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="codeBlock">
      {/* Header bar */}
      <div className="codeBlockHeader">
        <div className="codeLang">
          <span className="codeDot red" />
          <span className="codeDot yellow" />
          <span className="codeDot green" />
          <span className="codeLangLabel">{lang}</span>
        </div>
        <div className="codeActions">
          {/* Edit toggle */}
          <button
            className={`codeBtn ${editing ? "active" : ""}`}
            onClick={() => setEditing((p) => !p)}
            title={editing ? "Done editing" : "Edit code"}
          >
            {editing ? "✓ Done" : "✏ Edit"}
          </button>

          {/* Copy */}
          <button
            className="codeBtn"
            onClick={handleCopy}
            title="Copy code"
          >
            {copied ? "✓ Copied" : "⧉ Copy"}
          </button>

          {/* Download */}
          <button
            className="codeBtn"
            onClick={handleDownload}
            title={`Download as .${ext}`}
          >
            ⬇ .{ext}
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