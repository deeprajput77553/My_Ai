import { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { generateNotes, parseQuestionsFromFile, answerQuestion } from "../api";
import { extractTextFromFile } from "../utils/fileExtractor";
import { exportToPdf } from "../utils/exportPdf";
import { exportToDocx } from "../utils/exportDocx";
import SourcesPanel from "./SourcesPanel";
import CodeBlock from "./CodeBlock";
import "./Notes.css";

// ── Markdown with CodeBlock + left-aligned text ───────────────────────────────
const MarkdownComponents = {
  code({ node, inline, className, children }) {
    if (inline) return (
      <code style={{
        background: "rgba(30,41,59,0.9)", border: "1px solid rgba(255,255,255,0.08)",
        padding: "2px 6px", borderRadius: "4px", fontSize: "13px",
        color: "#7dd3fc", fontFamily: "Fira Code, Consolas, monospace",
      }}>{children}</code>
    );
    return <CodeBlock className={className}>{children}</CodeBlock>;
  },
  table:  ({ children }) => <div style={{ overflowX: "auto", margin: "18px 0" }}><table>{children}</table></div>,
  thead:  ({ children }) => <thead>{children}</thead>,
  tbody:  ({ children }) => <tbody>{children}</tbody>,
  tr:     ({ children }) => <tr>{children}</tr>,
  th:     ({ children }) => <th>{children}</th>,
  td:     ({ children }) => <td>{children}</td>,
};

function MdBody({ content, refProp }) {
  return (
    <div className="markdownBody" ref={refProp}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

// Detect if content is purely a code response
const isCodeOnly = (text = "") => {
  const trimmed = text.trim();
  return trimmed.startsWith("```") && trimmed.split("```").length >= 3;
};

function Notes({ onNotesSaved, preloadedNote }) {
  const [prompt, setPrompt]             = useState("");
  const [notes, setNotes]               = useState(preloadedNote?.notes || "");
  const [loading, setLoading]           = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [images, setImages]             = useState([]);
  const [searchQuery, setSearchQuery]   = useState("");

  // File state
  const [file, setFile]                 = useState(null);
  const [filePrompt, setFilePrompt]     = useState(""); // extra prompt for file ✅

  // Q&A state
  const [questions, setQuestions]       = useState([]);
  const [answers, setAnswers]           = useState({});
  const [activeQ, setActiveQ]           = useState(null);
  const [qaLoading, setQaLoading]       = useState(false);
  const [mode, setMode]                 = useState("notes");

  const fileInputRef = useRef(null);
  const notesRef     = useRef(null);

  const handleFileChange = (e) => {
    const picked = e.target.files[0];
    if (!picked) return;
    setFile(picked);
    e.target.value = "";
  };

  const removeFile = () => {
    setFile(null);
    setFilePrompt("");
    setQuestions([]);
    setMode("notes");
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && !file) return;
    setLoading(true);
    setNotes("");
    setSearchResults([]);
    setImages([]);
    setMode("notes");

    try {
      if (file) {
        const rawText = await extractTextFromFile(file);

        // Append extra user prompt to the extracted text if provided
        const combined = filePrompt.trim()
          ? `${rawText}\n\nAdditional instruction: ${filePrompt}`
          : rawText;

        const parseRes = await parseQuestionsFromFile(combined);
        const parsed   = parseRes.data.questions;

        if (parsed.length > 0) {
          setQuestions(parsed);
          setAnswers({});
          setActiveQ(0);
          setMode("qa");
          
          // Load all answers together
          setQaLoading(true);
          const allAnswers = {};
          for (let i = 0; i < parsed.length; i++) {
            try {
              const res = await answerQuestion(parsed[i]);
              allAnswers[i] = {
                answer:        res.data.answer,
                searchResults: res.data.searchResults || [],
                images:        res.data.images        || [],
              };
            } catch (err) {
              console.error(`Failed to answer question ${i}:`, err);
              allAnswers[i] = {
                answer: "Failed to generate answer.",
                searchResults: [],
                images: [],
              };
            }
          }
          setAnswers(allAnswers);
          setQaLoading(false);
        } else {
          // Fallback: treat as notes prompt
          const res = await generateNotes(combined.slice(0, 1500));
          setNotes(res.data.notes);
          setSearchResults(res.data.searchResults || []);
          setImages(res.data.images || []);
          setSearchQuery(file.name);
          if (onNotesSaved) onNotesSaved(file.name, res.data.notes);
        }
      } else {
        const res = await generateNotes(prompt);
        setNotes(res.data.notes);
        setSearchResults(res.data.searchResults || []);
        setImages(res.data.images || []);
        setSearchQuery(prompt);
        if (onNotesSaved) onNotesSaved(prompt, res.data.notes);
      }
    } catch (err) {
      console.error("Generation failed:", err);
    }
    setLoading(false);
  };

  const handleAnswerQuestion = async (index) => {
    if (answers[index]) return;
    setQaLoading(true);
    try {
      const res = await answerQuestion(questions[index]);
      setAnswers((prev) => ({
        ...prev,
        [index]: {
          answer:        res.data.answer,
          searchResults: res.data.searchResults || [],
          images:        res.data.images        || [],
        },
      }));
    } catch (err) { console.error("Answer failed:", err); }
    setQaLoading(false);
  };

  const handleQaPillClick = (i) => {
    setActiveQ(i);
    if (!answers[i]) handleAnswerQuestion(i);
  };

  const downloadAllQA = async (format) => {
    if (Object.keys(answers).length === 0) return;

    // Build combined content
    let combinedContent = `# Questions and Answers\n\n`;
    combinedContent += `Generated from: ${file?.name || "Document"}\n\n`;
    combinedContent += `---\n\n`;

    questions.forEach((q, i) => {
      combinedContent += `## Question ${i + 1}\n\n`;
      combinedContent += `${q}\n\n`;
      if (answers[i]) {
        combinedContent += `### Answer\n\n`;
        combinedContent += `${answers[i].answer}\n\n`;
        combinedContent += `---\n\n`;
      }
    });

    const filename = `${(file?.name || "QA").slice(0, 30).replace(/\s+/g, "_")}_all_questions`;

    if (format === "pdf") {
      // Create a temporary div with all content
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = `<div class="markdownBody">${combinedContent.replace(/\n/g, "<br>")}</div>`;
      document.body.appendChild(tempDiv);
      await exportToPdf({ current: tempDiv }, filename);
      document.body.removeChild(tempDiv);
    } else {
      await exportToDocx(combinedContent, filename);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleGenerate(); }
  };

  const filename = (prompt || file?.name || "notes").slice(0, 30).replace(/\s+/g, "_");

  return (
    <div className="notesPage">

      {/* ── Input row ── */}
      <div className="notesInputArea">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt,.json"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />

        {/* + upload button */}
        <button
          className="fileUploadBtn"
          onClick={() => fileInputRef.current.click()}
          title="Upload file (PDF, DOCX, TXT, JSON)"
        >+</button>

        {/* File badge OR text prompt */}
        {file ? (
          <div style={{ display: "flex", flex: 1, gap: "8px", alignItems: "center", minWidth: 0 }}>
            <div className="fileBadge" style={{ flexShrink: 0 }}>
              <span>📎</span>
              <span className="fileBadgeName">{file.name}</span>
              <button className="fileBadgeRemove" onClick={removeFile}>✕</button>
            </div>
            {/* Extra prompt for file ✅ */}
            <input
              className="notesInput"
              value={filePrompt}
              onChange={(e) => setFilePrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Optional: add instructions for this file…"
            />
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
          <div className="qaHeader">
            <div className="qaTitle">
              <i className="fi fi-rr-interrogation"></i>
              <span>Question Bank</span>
            </div>
            <div className="qaCountBadge">
              {questions.length} Questions Found
            </div>
          </div>

          <div className="qaNav">
            <div className="qaNavFlex">
              {questions.map((q, i) => (
                <button
                  key={i}
                  className={`qaPill ${activeQ === i ? "activeQa" : ""} ${answers[i] ? "answered" : ""}`}
                  style={{ animationDelay: `${i * 0.05}s` }}
                  onClick={() => handleQaPillClick(i)}
                >
                  <span className="qaPillCircle">{i + 1}</span>
                  <span className="qaPillPrompt">{q.slice(0, 30)}{q.length > 30 ? "…" : ""}</span>
                </button>
              ))}
            </div>
            {Object.keys(answers).length > 0 && (
              <div className="downloadAllBtns">
                <button className="downloadBtn" onClick={() => downloadAllQA("pdf")}>
                  <i className="fi fi-sr-file-pdf"></i> PDF
                </button>
                <button className="downloadBtn docx" onClick={() => downloadAllQA("docx")}>
                  <i className="fi fi-sr-file-word"></i> DOCX
                </button>
              </div>
            )}
          </div>

          {qaLoading && Object.keys(answers).length === 0 && (
            <div className="notesLoading">
              <div className="dots"><span/><span/><span/></div>
              <div>Loading all questions and answers...</div>
            </div>
          )}

          <div className="qaContent">
            {activeQ !== null && (
              <>
                <div className="qaQuestion">{questions[activeQ]}</div>

                {!answers[activeQ] && !qaLoading && (
                  <button className="qaGenerateBtn" onClick={() => handleAnswerQuestion(activeQ)}>
                    ✦ Generate Answer
                  </button>
                )}

                {qaLoading && !answers[activeQ] && (
                  <div className="notesLoading">
                    <div className="dots"><span/><span/><span/></div>
                    <div>Answering question {activeQ + 1}…</div>
                  </div>
                )}

                {answers[activeQ] && (
                  <>
                    <div className="notesCard" style={{ marginTop: "16px" }}>
                      <div className="downloadBar">
                        <span className="downloadLabel">Answer — Q{activeQ + 1}</span>
                        <div className="downloadBtns">
                          <button className="downloadBtn" onClick={() => exportToPdf(notesRef, `Q${activeQ + 1}_answer`)}>⬇ PDF</button>
                          <button className="downloadBtn docx" onClick={() => exportToDocx(answers[activeQ].answer, `Q${activeQ + 1}_answer`)}>⬇ DOCX</button>
                        </div>
                      </div>
                      {/* Code-only: skip explanation wrapper ✅ */}
                      {isCodeOnly(answers[activeQ].answer) ? (
                        <div ref={notesRef}>
                          <MdBody content={answers[activeQ].answer} />
                        </div>
                      ) : (
                        <MdBody content={answers[activeQ].answer} refProp={notesRef} />
                      )}
                    </div>
                    <SourcesPanel
                      searchResults={answers[activeQ].searchResults}
                      images={answers[activeQ].images}
                      searchQuery={questions[activeQ]}
                    />
                  </>
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
            <>
              {/* Code-only: no card wrapper, just the block ✅ */}
              {isCodeOnly(notes) ? (
                <div ref={notesRef}>
                  <MdBody content={notes} />
                </div>
              ) : (
                <div className="notesCard">
                  <div className="downloadBar">
                    <span className="downloadLabel">📄 Generated Notes</span>
                    <div className="downloadBtns">
                      <button className="downloadBtn" onClick={() => exportToPdf(notesRef, filename)}>⬇ PDF</button>
                      <button className="downloadBtn docx" onClick={() => exportToDocx(notes, filename)}>⬇ DOCX</button>
                    </div>
                  </div>
                  <MdBody content={notes} refProp={notesRef} />
                </div>
              )}

              <SourcesPanel searchResults={searchResults} images={images} searchQuery={searchQuery} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default Notes;