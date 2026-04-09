import { useState, useRef, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
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
  table: ({ children }) => <div style={{ overflowX: "auto", margin: "18px 0" }}><table>{children}</table></div>,
  thead: ({ children }) => <thead>{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr>{children}</tr>,
  th: ({ children }) => <th>{children}</th>,
  td: ({ children }) => <td>{children}</td>,
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

function Notes({ onNotesSaved, preloadedNote, genMode, setGenMode }) {
  const [prompt, setPrompt] = useState("");
  const [notes, setNotes] = useState(preloadedNote?.notes || "");
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [images, setImages] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // File state
  const [file, setFile] = useState(null);
  const [filePrompt, setFilePrompt] = useState(""); // extra prompt for file ✅

  // Q&A state
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [activeQ, setActiveQ] = useState(null);
  const [qaLoading, setQaLoading] = useState(false);
  const [mode, setMode] = useState("notes"); // notes, preview, qa
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  
  // Reload note when preloadedNote changes ✅
  useEffect(() => {
    if (preloadedNote) {
      setNotes(preloadedNote.notes || "");
      setPrompt(preloadedNote.prompt || "");
      setMode("notes");
    }
  }, [preloadedNote]);

  // Export Modal State
  const [exportTarget, setExportTarget] = useState(null); // { type: 'pdf'|'docx', ref: any, content: string, filename: string }
  const [exportConfig, setExportConfig] = useState({
    headerText: "MY AI Document generated",
    headerAlign: "right", // left, center, right
    pageNumbers: true,
    pageNumAlign: "center", // left, center, right
    borders: true
  });

  const triggerExport = (type, ref, content, filename) => {
    setExportTarget({ type, ref, content, filename });
  };

  const confirmExport = async () => {
    if (!exportTarget) return;
    try {
      if (exportTarget.type === "pdf") {
        await exportToPdf(exportTarget.ref, exportTarget.filename, exportConfig);
      } else {
        await exportToDocx(exportTarget.content, exportTarget.filename, exportConfig);
      }
    } catch (e) { console.error(e); }
    setExportTarget(null);
  };


  const fileInputRef = useRef(null);
  const notesRef = useRef(null);
  const lastSavedContent = useRef(null); // Prevent duplicate saves ✅

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

        const parseRes = await parseQuestionsFromFile(combined, genMode);
        const parsed = parseRes.data.questions;

        if (parsed.length > 0) {
          setQuestions(parsed);
          setAnswers({});
          setMode("preview");
        } else {
          // Fallback: treat as notes prompt
          const res = await generateNotes(combined.slice(0, 1500), genMode);
          setNotes(res.data.notes);
          setSearchResults(res.data.searchResults || []);
          setImages(res.data.images || []);
          setSearchQuery(file.name);
          if (onNotesSaved && lastSavedContent.current !== res.data.notes) {
            onNotesSaved(file.name, res.data.notes);
            lastSavedContent.current = res.data.notes;
          }
        }
      } else {
        // Multi-question input handling
        const lines = prompt.split("\n").filter(l => l.trim().length > 3);
        if (lines.length > 1) {
          setQuestions(lines);
          setAnswers({});
          setMode("preview");
        } else {
          const res = await generateNotes(prompt, genMode);
          setNotes(res.data.notes);
          setSearchResults(res.data.searchResults || []);
          setImages(res.data.images || []);
          setSearchQuery(prompt);
          if (onNotesSaved && lastSavedContent.current !== res.data.notes) {
            onNotesSaved(prompt, res.data.notes);
            lastSavedContent.current = res.data.notes;
          }
        }
      }
    } catch (err) {
      console.error("Generation failed:", err);
    }
    setLoading(false);
  };

  const handleNotesRegenerate = () => {
    handleGenerate();
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const list = [...questions];
    const [reorderedItem] = list.splice(result.source.index, 1);
    list.splice(result.destination.index, 0, reorderedItem);
    setQuestions(list);
  };

  const handleStartGeneration = async () => {
    setMode("qa");
    setActiveQ(0);
    setIsGeneratingAll(true);
    setQaLoading(true);

    const allAnswers = {};
    for (let i = 0; i < questions.length; i++) {
      try {
        const res = await answerQuestion(questions[i], genMode);
        allAnswers[i] = {
          answer: res.data.answer,
          searchResults: res.data.searchResults || [],
          images: res.data.images || [],
        };
        // Update state as we go for better UX
        setAnswers({ ...allAnswers });
      } catch (err) {
        console.error(`Failed to answer question ${i}:`, err);
        allAnswers[i] = {
          answer: "Failed to generate answer.",
          searchResults: [],
          images: [],
        };
        setAnswers({ ...allAnswers });
      }
    }
    setIsGeneratingAll(false);
    setQaLoading(false);
  };

  const removeQuestion = (idx) => {
    const list = [...questions];
    list.splice(idx, 1);
    setQuestions(list);
    if (list.length === 0) setMode("notes");
  };

  const handleAnswerQuestion = async (index) => {
    if (answers[index]) return;
    setQaLoading(true);
    try {
      const res = await answerQuestion(questions[index], genMode);
      setAnswers((prev) => ({
        ...prev,
        [index]: {
          answer: res.data.answer,
          searchResults: res.data.searchResults || [],
          images: res.data.images || [],
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
      if (answers[i]) {
        if (i > 0) combinedContent += `\n---PAGEBREAK---\n\n`;
        combinedContent += `## Question ${i + 1}: ${q}\n\n`;
        combinedContent += `${answers[i].answer}\n\n`;
      }
    });

    const baseName = (file?.name || "QA").replace(/\.[^/.]+$/, "");
    const filename = `${baseName.slice(0, 30).replace(/\s+/g, "_")}_all_questions`;

    if (format === "pdf") {
      const tempDiv = document.createElement("div");
      tempDiv.className = "markdownBody";
      tempDiv.innerHTML = combinedContent.replace(/\n/g, "<br>");
      document.body.appendChild(tempDiv);
      exportToPdf({ current: tempDiv }, filename, exportConfig);
      setTimeout(() => document.body.removeChild(tempDiv), 5000); // Cleanup later
    } else {
      exportToDocx(combinedContent, filename, exportConfig);
    }
  };

  const saveCombinedToHistory = () => {
    if (Object.keys(answers).length === 0) return;
    let combinedContent = `# Questions and Answers\n\n`;
    combinedContent += `Generated from: ${file?.name || "Document"}\n\n`;
    combinedContent += `---\n\n`;
    questions.forEach((q, i) => {
      if (answers[i]) {
        if (i > 0) combinedContent += `\n---PAGEBREAK---\n\n`;
        combinedContent += `## Question ${i + 1}: ${q}\n\n`;
        combinedContent += `${answers[i].answer}\n\n`;
      }
    });

    const baseName = (file?.name || "QA").replace(/\.[^/.]+$/, "");
    const title = `${baseName}_Q_A`;
    if (onNotesSaved && lastSavedContent.current !== combinedContent) {
      onNotesSaved(title, combinedContent);
      lastSavedContent.current = combinedContent;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleGenerate(); }
  };

  const getBaseFilename = () => {
    let name = "notes";
    if (file?.name) name = file.name.split('.')[0];
    else if (prompt && prompt.trim()) name = prompt.slice(0, 20);
    
    // Remove all special characters
    const sanitized = name.replace(/[^a-zA-Z0-9]/g, "_");
    return sanitized || "my_notes"; // Hard fallback
  };
  const filename = getBaseFilename();

  // Android File Picker often ignores simple extensions, so we conditionally add explicit MIME types for it.
  const isAndroid = /Android/i.test(navigator.userAgent);
  const acceptTypes = isAndroid
    ? "application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,application/json,.pdf,.docx,.txt,.json"
    : ".pdf,.docx,.txt,.json";

  return (
    <div className="notesPage">

      {/* ── Input row ── */}
      <div className="notesInputArea">
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptTypes}
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

        <div className="notes-mode-picker input-area-mode-picker" data-active={genMode}>
          <div className="mode-slider-highlight"></div>
          <label className={`mode-option ${genMode === "assignment" ? "active" : ""}`}>
            <input type="radio" className="mode-radio-hidden" value="assignment" checked={genMode === "assignment"} onChange={(e) => setGenMode(e.target.value)} />
            <span className="mode-name">Assignment</span>
          </label>
          <label className={`mode-option ${genMode === "practical" ? "active" : ""}`}>
            <input type="radio" className="mode-radio-hidden" value="practical" checked={genMode === "practical"} onChange={(e) => setGenMode(e.target.value)} />
            <span className="mode-name">Practical</span>
          </label>
        </div>

        <button
          className="notesGenerateBtn"
          onClick={handleGenerate}
          disabled={loading || (!prompt.trim() && !file)}
        >
          {loading ? "Generating…" : "Generate"}
        </button>
      </div>



      {/* ── Preview Mode ── */}
      {mode === "preview" && (
        <div className="previewSection">
          <div className="qaHeader">
            <div className="qaTitle">
              <i className="fi fi-rr-edit"></i>
              <span>Refine Topics & Questions</span>
            </div>
            <button className="previewStartBtn" onClick={handleStartGeneration}>
              ✦ Start Sequential Generation
            </button>
          </div>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="questions-list">
              {(provided) => (
                <div
                  className="previewList"
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  {questions.map((q, i) => (
                    <Draggable key={`${q}-${i}`} draggableId={`q-${i}`} index={i}>
                      {(provided, snapshot) => (
                        <div
                          className={`previewRow ${snapshot.isDragging ? "dragging" : ""}`}
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                        >
                          <div className="previewHandle">⠿</div>
                          <div className="previewIndex">{i + 1}</div>
                          <div className="previewText">{q}</div>
                          <button className="previewDelete" onClick={(e) => { e.stopPropagation(); removeQuestion(i); }} title="Delete Topic">
                            <i className="fi fi-rr-trash"></i>
                          </button>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      )}

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
                <button className="downloadBtn" style={{ background: "rgba(34, 197, 94, 0.15)", color: "#4ade80", border: "1px solid rgba(74, 222, 128, 0.2)" }} onClick={saveCombinedToHistory}>
                  <i className="fi fi-rr-disk"></i> Save to History
                </button>
                <button className="downloadBtn" onClick={() => downloadAllQA("pdf")}>
                  <i className="fi fi-sr-file-pdf"></i> PDF
                </button>
                <button className="downloadBtn docx" onClick={() => downloadAllQA("docx")}>
                  <i className="fi fi-sr-file-word"></i> DOCX
                </button>
              </div>
            )}
          </div>

          {isGeneratingAll && (
            <div className="sequentialLoadingBar">
              <div className="loadingProgress" style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }}></div>
              <div className="loadingText">Generating answers sequentially... {Object.keys(answers).length} / {questions.length}</div>
            </div>
          )}

          <div className="qaContent">
            {activeQ !== null && (
              <>
                <div className="qaQuestion">
                  <span>{questions[activeQ]}</span>
                  {answers[activeQ] && !isGeneratingAll && (
                    <button className="retryBtn" onClick={() => {
                      const newAnswers = { ...answers };
                      delete newAnswers[activeQ];
                      setAnswers(newAnswers);
                      handleAnswerQuestion(activeQ);
                    }} title="Retry Answer">🔄</button>
                  )}
                </div>

                {!answers[activeQ] && !qaLoading && (
                  <button className="qaGenerateBtn" onClick={() => handleAnswerQuestion(activeQ)}>
                    ✦ Generate Answer
                  </button>
                )}

                {qaLoading && !answers[activeQ] && (
                  <div className="notesLoading">
                    <div className="dots"><span /><span /><span /></div>
                    <div>Answering question {activeQ + 1}…</div>
                  </div>
                )}

                {answers[activeQ] && (
                  <>
                    <div className="notesCard" style={{ marginTop: "16px" }}>
                      <div className="downloadBar">
                        <span className="downloadLabel">Answer — Q{activeQ + 1}</span>
                        <div className="downloadBtns">
                          <button className="downloadBtn retry-glow" onClick={() => {
                            const newAnswers = { ...answers };
                            delete newAnswers[activeQ];
                            setAnswers(newAnswers);
                            handleAnswerQuestion(activeQ);
                          }} title="Regenerate individual answer"><i className="fi fi-rr-refresh"></i> Regenerate</button>
                          <button className="downloadBtn" onClick={() => triggerExport("pdf", notesRef, null, `Q${activeQ + 1}_answer`)}>⬇ PDF</button>
                          <button className="downloadBtn docx" onClick={() => triggerExport("docx", null, answers[activeQ].answer, `Q${activeQ + 1}_answer`)}>⬇ DOCX</button>
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
              <div className="dots"><span /><span /><span /></div>
              <div>Generating notes…</div>
            </div>
          )}

          {notes && !loading && (
            <>
              {/* Code-only: no card wrapper, just the block ✅ */}
              {isCodeOnly(notes) ? (
                <div ref={notesRef}>
                  <div className="downloadBar" style={{ borderBottom: "none", marginBottom: "8px" }}>
                    <div className="downloadBtns" style={{ marginLeft: "auto" }}>
                      <button className="downloadBtn retry-glow" onClick={handleNotesRegenerate} title="Regenerate notes"><i className="fi fi-rr-refresh"></i> Regenerate</button>
                      <button className="downloadBtn" onClick={() => triggerExport("pdf", notesRef, null, filename)}>⬇ PDF</button>
                      <button className="downloadBtn docx" onClick={() => triggerExport("docx", null, notes, filename)}>⬇ DOCX</button>
                    </div>
                  </div>
                  <MdBody content={notes} />
                </div>
              ) : (
                <div className="notesCard">
                  <div className="downloadBar">
                    <span className="downloadLabel">📄 Generated Notes</span>
                    <div className="downloadBtns">
                      <button className="downloadBtn retry-glow" onClick={handleNotesRegenerate} title="Regenerate notes"><i className="fi fi-rr-refresh"></i> Regenerate</button>
                      <button className="downloadBtn" onClick={() => triggerExport("pdf", notesRef, null, filename)}>⬇ PDF</button>
                      <button className="downloadBtn docx" onClick={() => triggerExport("docx", null, notes, filename)}>⬇ DOCX</button>
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

      {/* ── EXPORT MODAL ── */}
      {exportTarget && (
        <div className="exportModalOverlay" onClick={() => setExportTarget(null)}>
          <div className="exportModal" onClick={(e) => e.stopPropagation()}>
            <div className="exportModalHeader">
              <h3>Configure {exportTarget.type.toUpperCase()} Export</h3>
              <button onClick={() => setExportTarget(null)}>✕</button>
            </div>

            <div className="exportModalBody">
              <label>
                Header Text:
                <input type="text" value={exportConfig.headerText} onChange={(e) => setExportConfig({ ...exportConfig, headerText: e.target.value })} />
              </label>

              <label>
                Header Alignment:
                <select value={exportConfig.headerAlign} onChange={(e) => setExportConfig({ ...exportConfig, headerAlign: e.target.value })}>
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </label>

              <label className="checkboxLabel">
                <input type="checkbox" checked={exportConfig.pageNumbers} onChange={(e) => setExportConfig({ ...exportConfig, pageNumbers: e.target.checked })} />
                Include Page Numbers
              </label>

              {exportConfig.pageNumbers && (
                <label>
                  Page Number Alignment:
                  <select value={exportConfig.pageNumAlign} onChange={(e) => setExportConfig({ ...exportConfig, pageNumAlign: e.target.value })}>
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </label>
              )}

              <label className="checkboxLabel">
                <input type="checkbox" checked={exportConfig.borders} onChange={(e) => setExportConfig({ ...exportConfig, borders: e.target.checked })} />
                Include Page Borders
              </label>
            </div>

            <div className="exportModalFooter">
              <button className="exportCancelBtn" onClick={() => setExportTarget(null)}>Cancel</button>
              <button className="exportConfirmBtn" onClick={confirmExport}>
                {exportTarget.type === 'pdf' ? <i className="fi fi-sr-file-pdf"></i> : <i className="fi fi-sr-file-word"></i>} Download
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Notes;