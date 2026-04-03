import { useState, useEffect } from "react";
import "./NewsWidget.css";

// Category detection from title/snippet
const getCategoryFromText = (text = "") => {
  const lower = text.toLowerCase();
  if (lower.match(/sport|cricket|football|tennis|ipl|match|win|lose|score/)) return { label: "Sports",   color: "#34d399", dot: "#34d399" };
  if (lower.match(/tech|ai|software|startup|app|google|apple|microsoft|meta/)) return { label: "Tech",      color: "#38bdf8", dot: "#38bdf8" };
  if (lower.match(/politic|election|government|minister|senate|parliament/))   return { label: "Politics",  color: "#a78bfa", dot: "#a78bfa" };
  if (lower.match(/market|stock|economy|gdp|inflation|rupee|dollar|finance/))  return { label: "Finance",   color: "#fbbf24", dot: "#fbbf24" };
  if (lower.match(/health|covid|virus|vaccine|medicine|hospital|doctor/))      return { label: "Health",    color: "#f87171", dot: "#f87171" };
  if (lower.match(/film|movie|actor|bollywood|entertainment|music|award/))     return { label: "Entertainment", color: "#fb7185", dot: "#fb7185" };
  if (lower.match(/science|space|nasa|research|discover|study|climate/))       return { label: "Science",   color: "#818cf8", dot: "#818cf8" };
  return { label: "News", color: "#64748b", dot: "#64748b" };
};

const NewsWidget = ({ newsData }) => {
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 120);
    return () => clearTimeout(t);
  }, []);

  if (!newsData || newsData.length === 0) return null;

  const articles = newsData.filter(a => a.title && a.title.length > 5);
  if (!articles.length) return null;

  const current = articles[active];
  const cat = getCategoryFromText(current.title + " " + (current.snippet || ""));

  return (
    <div className={`nw-wrap ${visible ? "nw-in" : ""}`}>
      <div className="nw-card">
        {/* Header */}
        <div className="nw-header">
          <div className="nw-header-left">
            <span className="nw-live-dot" />
            <span className="nw-header-title">News</span>
          </div>
          <span className="nw-count">{active + 1} / {articles.length}</span>
        </div>

        {/* Main Article */}
        <div className="nw-main" key={active}>
          <div className="nw-tags">
            <span className="nw-cat" style={{ "--cat": cat.color }}>
              <span className="nw-cat-dot" style={{ background: cat.dot }} />
              {cat.label}
            </span>
            {current.source && (
              <span className="nw-source">{current.source}</span>
            )}
          </div>

          <div className="nw-title">{current.title}</div>

          {current.snippet && (
            <p className="nw-snippet">{current.snippet.slice(0, 160)}{current.snippet.length > 160 ? "…" : ""}</p>
          )}

          {current.url && (
            <a
              className="nw-read-link"
              href={current.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Read full article
              <span className="nw-link-arrow">→</span>
            </a>
          )}
        </div>

        {/* Dots + Nav */}
        {articles.length > 1 && (
          <div className="nw-footer">
            <div className="nw-dots">
              {articles.map((_, i) => (
                <button
                  key={i}
                  className={`nw-dot ${i === active ? "nw-dot-active" : ""}`}
                  onClick={() => setActive(i)}
                  aria-label={`Article ${i + 1}`}
                />
              ))}
            </div>
            <div className="nw-nav">
              <button
                className="nw-nav-btn"
                onClick={() => setActive(a => Math.max(0, a - 1))}
                disabled={active === 0}
              >←</button>
              <button
                className="nw-nav-btn"
                onClick={() => setActive(a => Math.min(articles.length - 1, a + 1))}
                disabled={active === articles.length - 1}
              >→</button>
            </div>
          </div>
        )}

        {/* All headlines strip */}
        {articles.length > 1 && (
          <div className="nw-headlines">
            {articles.map((a, i) => (
              <button
                key={i}
                className={`nw-headline-item ${i === active ? "active" : ""}`}
                onClick={() => setActive(i)}
              >
                <span className="nw-hl-num">{String(i + 1).padStart(2, "0")}</span>
                <span className="nw-hl-text">{a.title.slice(0, 70)}{a.title.length > 70 ? "…" : ""}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NewsWidget;
