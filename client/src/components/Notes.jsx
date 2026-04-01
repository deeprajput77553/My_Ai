import { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { generateNotes } from "../api";
import { exportToPdf } from "../utils/exportPdf";
import { exportToDocx } from "../utils/exportDocx";
import "./Notes.css";

function Notes() {
  const [prompt, setPrompt] = useState("");
  const [notes, setNotes] = useState(""); // raw markdown from AI
  const [loading, setLoading] = useState(false);
  const notesRef = useRef(null); // ref for PDF capture

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setNotes("");

    try {
      const res = await generateNotes(prompt);
      setNotes(res.data.notes);
    } catch (err) {
      console.error("Notes generation failed:", err);
    }

    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  // Derive a filename from the prompt
  const filename = prompt.trim().slice(0, 30).replace(/\s+/g, "_") || "notes";

  return (
    <div className="notesPage">

      {/* Input */}
      <div className="notesInputArea">
        <input
          className="notesInput"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='e.g. "Generate notes on React hooks" or "Summarize machine learning basics"'
        />
        <button
          className="notesGenerateBtn"
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading ? "Generating…" : "✦ Generate"}
        </button>
      </div>

      {/* Content */}
      <div className="notesContent">

        {/* Empty state */}
        {!notes && !loading && (
          <div className="notesEmpty">
            <div className="notesEmptyIcon">📝</div>
            <div>Enter a topic above to generate structured notes.</div>
            <div style={{ fontSize: "12px", color: "#334155" }}>
              Notes will include headings, bullet points, tables, and more.
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="notesLoading">
            <div className="dots">
              <span></span><span></span><span></span>
            </div>
            <div>Generating notes…</div>
          </div>
        )}

        {/* Notes card */}
        {notes && !loading && (
          <div className="notesCard">

            {/* Download bar */}
            <div className="downloadBar">
              <span className="downloadLabel">📄 Generated Notes</span>
              <div className="downloadBtns">
                <button
                  className="downloadBtn"
                  onClick={() => exportToPdf(notesRef, filename)}
                >
                  ⬇ PDF
                </button>
                <button
                  className="downloadBtn docx"
                  onClick={() => exportToDocx(notes, filename)}
                >
                  ⬇ DOCX
                </button>
              </div>
            </div>

            {/* Rendered markdown */}
            <div className="markdownBody" ref={notesRef}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {notes}
              </ReactMarkdown>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

export default Notes;