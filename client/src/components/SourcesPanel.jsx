import { useState } from "react";
import "./SourcesPanel.css";

const SOURCE_ICON = { Wikipedia: "📖", DuckDuckGo: "🔍" };
const INITIAL_IMAGES = 3; // show 3 initially, "more" shows all 6

function SourcesPanel({ searchResults = [], images = [], searchQuery = "" }) {
  const [open, setOpen] = useState(false);
  const [showAllImages, setShowAllImages] = useState(false);
  const [lightbox, setLightbox] = useState(null); // image url

  if (!searchResults.length && !images.length) return null;

  const visibleImages = showAllImages ? images : images.slice(0, INITIAL_IMAGES);
  const hasMoreImages = images.length > INITIAL_IMAGES && !showAllImages;

  return (
    <>
      <div className="sourcesPanel">

        {/* Toggle header */}
        <div
          className={`sourcesPanelHeader ${open ? "open" : ""}`}
          onClick={() => setOpen((p) => !p)}
        >
          <div className="sourcesPanelTitle">
            <span>🌐</span>
            <span>Web Sources</span>
            {searchQuery && <span className="webBadge">{searchQuery.slice(0, 24)}</span>}
          </div>
          <span className={`sourcesChevron ${open ? "open" : ""}`}>▼</span>
        </div>

        {/* Collapsible body */}
        {open && (
          <div className="sourcesPanelBody">

            {/* Images grid */}
            {images.length > 0 && (
              <>
                <div className="imagesGrid">
                  {visibleImages.map((img, i) => (
                    <div
                      key={i}
                      className="imageThumb"
                      onClick={() => setLightbox(img.url || img.thumbnail)}
                    >
                      <img
                        src={img.thumbnail || img.url}
                        alt={img.title || ""}
                        loading="lazy"
                        onError={(e) => { e.target.style.display = "none"; }}
                      />
                      <div className="imageThumbTitle">{img.title}</div>
                    </div>
                  ))}

                  {hasMoreImages && (
                    <button
                      className="moreImagesBtn"
                      onClick={(e) => { e.stopPropagation(); setShowAllImages(true); }}
                    >
                      + {images.length - INITIAL_IMAGES} more images
                    </button>
                  )}
                </div>
              </>
            )}

            {/* Divider between images and sources */}
            {images.length > 0 && searchResults.length > 0 && (
              <hr className="sourcesDivider" />
            )}

            {/* Sources list */}
            {searchResults.length > 0 && (
              <div className="sourcesList">
                {searchResults.map((r, i) => (
                  <a
                    key={i}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sourceItem"
                  >
                    <span className="sourceIcon">
                      {SOURCE_ICON[r.source] || "🔗"}
                    </span>
                    <div className="sourceInfo">
                      <div className="sourceTitle">{r.title}</div>
                      <div className="sourceSnippet">{r.snippet}</div>
                    </div>
                    <span className={`sourceBadge ${r.source === "Wikipedia" ? "wiki" : "ddg"}`}>
                      {r.source}
                    </span>
                  </a>
                ))}
              </div>
            )}

          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <button className="lightboxClose" onClick={() => setLightbox(null)}>✕</button>
          <img src={lightbox} alt="Preview" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}

export default SourcesPanel;