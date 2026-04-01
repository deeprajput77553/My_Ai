import { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { generateNotes, parseQuestionsFromFile, answerQuestion } from "../api";
import { extractTextFromFile } from "../utils/fileExtractor";
import { exportToPdf } from "../utils/exportPdf";
import { exportToDocx } from "../utils/exportDocx";
import "./Notes.css";

// ── Custom table renderer for polished styling ────────────────────────────────
const MarkdownComponents = {
  table: ({ children }) => (
    <div style={{ overflowX: "auto", margin: "18px 0" }}>
      <table>{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead>{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr:    ({ children }) => <tr>{children}</tr>,
  th:    ({ children }) => <th>{children}</th>,
  td:    ({ children }) => <td>{children}</td>,
};

// ── Rendered markdown with custom table ──────────────────────────────────────
function MdBody({ content, refProp }) {
  return (
    <div className="markdownBody" ref={refProp}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

function Notes({ onNotesSaved }) {
  const [prompt, setPrompt]         = useState("");
  const [notes, setNotes]           = useState("");
  const [loading, setLoading]       = useState(false);

  // File / Q&A state
  const [file, setFile]             = useState(null);
  const [questions, setQuestions]   = useState([]);   // parsed question strings
  const [answers, setAnswers]       = useState({});   // { [index]: markdown string }
  const [activeQ, setActiveQ]       = useState(null); // index
  const [qaLoading, setQaLoading]   = useState(false);
  const [mode, setMode]             = useState("notes"); // "notes" | "qa"

  const fileInputRef = useRef(null);
  const notesRef     = useRef(null);

  // ── File picked ─────────────────────────────────────────────────────────────
  const handleFileChange = async (e) => {
    const picked = e.target.files[0];
    if (!picked) return;
    setFile(picked);
    e.target.value = ""; // reset so same file can be re-picked
  };

  const removeFile = () => { setFile(null); setQuestions([]); setMode("notes"); };

  // ── Generate notes (text prompt) ────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!prompt.trim() && !file) return;
    setLoading(true);
    setNotes("");
    setMode("notes");

    try {
      if (file) {
        // 1. Extract text from file
        const rawText = await extractTextFromFile(file);

        // 2. Ask AI to parse into questions/topics list
        const parseRes = await parseQuestionsFromFile(rawText);
        const parsed = parseRes.data.questions; // string[]

        if (parsed.length > 0) {
          setQuestions(parsed);
          setAnswers({});
          setActiveQ(0);
          setMode("qa");
        } else {
          // Fallback: treat file as regular notes prompt
          const res = await generateNotes(rawText.slice(0, 1500));
          setNotes(res.data.notes);
          saveToHistory(file.name, res.data.notes);
        }
      } else {
        const res = await generateNotes(prompt);
        setNotes(res.data.notes);
        saveToHistory(prompt, res.data.notes);
      }
    } catch (err) {
      console.error("Generation failed:", err);
    }

    setLoading(false);
  };

  const saveToHistory = (p, n) => {
    if (onNotesSaved) onNotesSaved(p, n);
  };

  // ── Answer a single question ─────────────────────────────────────────────────
  const handleAnswerQuestion = async (index) => {
    if (answers[index]) return; // already answered, just switch tab
    setQaLoading(true);
    try {
      const res = await answerQuestion(questions[index]);
      setAnswers((prev) => ({ ...prev, [index]: res.data.answer }));
    } catch (err) {
      console.error("Answer failed:", err);
    }
    setQaLoading(false);
  };

  const handleQaPillClick = (i) => {
    setActiveQ(i);
    if (!answers[i]) handleAnswerQuestion(i);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleGenerate(); }
  };

  const filename = (prompt || file?.name || "notes")
    .slice(0, 30).replace(/\s+/g, "_");

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="notesPage">

      {/* Input row */}
      <div className="notesInputArea">

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt,.json"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />

        {/* + button */}
        <button
          className="fileUploadBtn"
          onClick={() => fileInputRef.current.click()}
          title="Upload file (PDF, DOCX, TXT, JSON)"
        >+</button>

        {/* File badge OR text input */}
        {file ? (
          <div className="fileBadge">
            <span>📎</span>
            <span className="fileBadgeName">{file.name}</span>
            <button className="fileBadgeRemove" onClick={removeFile}>✕</button>
          </div>
        ) : (
          <input
            className="notesInput"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='e.g. "React hooks" or "Machine learning basics"…'
          />
        )}

        <button
          className="notesGenerateBtn"
          onClick={handleGenerate}
          disabled={loading || (!prompt.trim() && !file)}
        >
          {loading ? "Working…" : "✦ Generate"}
        </button>
      </div>

      {/* ── Q&A Mode ── */}
      {mode === "qa" && questions.length > 0 && (
        <div className="qaSection">

          {/* Question pills nav */}
          <div className="qaNav">
            {questions.map((q, i) => (
              <button
                key={i}
                className={`qaPill ${activeQ === i ? "activeQa" : ""} ${answers[i] ? "answered" : ""}`}
                onClick={() => handleQaPillClick(i)}
              >
                Q{i + 1}
              </button>
            ))}
          </div>

          {/* Active question + answer */}
          <div className="qaContent">
            {activeQ !== null && (
              <>
                <div className="qaQuestion">
                  {questions[activeQ]}
                </div>

                {/* Not yet answered */}
                {!answers[activeQ] && !qaLoading && (
                  <button
                    className="qaGenerateBtn"
                    onClick={() => handleAnswerQuestion(activeQ)}
                  >
                    ✦ Generate Answer
                  </button>
                )}

                {/* Loading */}
                {qaLoading && !answers[activeQ] && (
                  <div className="notesLoading">
                    <div className="dots"><span/><span/><span/></div>
                    <div>Answering question {activeQ + 1}…</div>
                  </div>
                )}

                {/* Answer */}
                {answers[activeQ] && (
                  <div className="notesCard" style={{ marginTop: "16px" }}>
                    <div className="downloadBar">
                      <span className="downloadLabel">Answer — Q{activeQ + 1}</span>
                      <div className="downloadBtns">
                        <button className="downloadBtn"
                          onClick={() => exportToPdf(notesRef, `Q${activeQ + 1}_answer`)}>
                          ⬇ PDF
                        </button>
                        <button className="downloadBtn docx"
                          onClick={() => exportToDocx(answers[activeQ], `Q${activeQ + 1}_answer`)}>
                          ⬇ DOCX
                        </button>
                      </div>
                    </div>
                    <MdBody content={answers[activeQ]} refProp={notesRef} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Notes Mode ── */}
      {mode === "notes" && (
        <div className="notesContent">

          {!notes && !loading && (
            <div className="notesEmpty">
              <div className="notesEmptyIcon">📝</div>
              <div>Type a topic or upload a file to get started.</div>
              <div style={{ fontSize: "12px", color: "#334155", marginTop: 4 }}>
                Supports PDF · DOCX · TXT · JSON
              </div>
            </div>
          )}

          {loading && (
            <div className="notesLoading">
              <div className="dots"><span/><span/><span/></div>
              <div>Generating notes…</div>
            </div>
          )}

          {notes && !loading && (
            <div className="notesCard">
              <div className="downloadBar">
                <span className="downloadLabel">📄 Generated Notes</span>
                <div className="downloadBtns">
                  <button className="downloadBtn"
                    onClick={() => exportToPdf(notesRef, filename)}>
                    ⬇ PDF
                  </button>
                  <button className="downloadBtn docx"
                    onClick={() => exportToDocx(notes, filename)}>
                    ⬇ DOCX
                  </button>
                </div>
              </div>
              <MdBody content={notes} refProp={notesRef} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Notes;