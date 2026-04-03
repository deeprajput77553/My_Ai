import { useState, useEffect } from "react";
import "./NewsWidget.css";

const NewsWidget = ({ newsData }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState(null);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  if (!newsData || newsData.length === 0) return null;

  return (
    <div className={`news-widget ${isVisible ? "visible" : ""}`}>
      <div className="news-header">
        <span className="news-icon">📰</span>
        <h3>Latest News</h3>
      </div>

      <div className="news-articles">
        {newsData.map((article, index) => (
          <div
            key={index}
            className={`news-article ${expandedIndex === index ? "expanded" : ""}`}
            style={{ animationDelay: `${index * 0.1}s` }}
            onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
          >
            <div className="article-header">
              <div className="article-source">
                <span className="source-badge">{article.source}</span>
                <span className="article-date">{formatDate(article.publishedAt)}</span>
              </div>
              {article.imageUrl && (
                <div className="article-image">
                  <img src={article.imageUrl} alt={article.title} />
                </div>
              )}
            </div>

            <h4 className="article-title">{article.title}</h4>

            <p className="article-summary">
              {expandedIndex === index ? article.summary : truncate(article.summary, 120)}
            </p>

            {article.url && (
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="article-link"
                onClick={(e) => e.stopPropagation()}
              >
                Read more →
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const truncate = (text, maxLength) => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
};

export default NewsWidget;
