import { useState } from "react";
import "./SourcesPanel.css";

const SOURCE_ICON = { Wikipedia: "📖", DuckDuckGo: "🔍" };
const INITIAL_IMAGES = 3;

function SourcesPanel({ searchResults = [], images = [], searchQuery = "" }) {
  const [open, setOpen]               = useState(true);  // ✅ open by default
  const [showAllImages, setShowAllImages] = useState(false);
  const [lightbox, setLightbox]       = useState(null);
  const [imgErrors, setImgErrors]     = useState({});    // track broken images

  if (!searchResults.length && !images.length) return null;

  // Filter out images that failed to load
  const validImages = images.filter((_, i) => !imgErrors[i]);
  const visibleImages = showAllImages ? validImages : validImages.slice(0, INITIAL_IMAGES);
  const hasMoreImages = validImages.length > INITIAL_IMAGES && !showAllImages;

  const handleImgError = (i) => {
    setImgErrors((prev) => ({ ...prev, [i]: true }));
  };

  // Prefer full image URL, fall back to thumbnail
  const getImgSrc = (img) => img.url || img.thumbnail || "";

  return (
    <>
      <div className="sourcesPanel">

        {/* Header — clickable to collapse/expand */}
        <div
          className={`sourcesPanelHeader ${open ? "open" : ""}`}
          onClick={() => setOpen((p) => !p)}
        >
          <div className="sourcesPanelTitle">
            <span>🌐</span>
            <span>Web Sources</span>
            {searchQuery && (
              <span className="webBadge">{searchQuery.slice(0, 24)}</span>
            )}
            {validImages.length > 0 && (
              <span className="webBadge" style={{ background: "rgba(99,102,241,0.12)", color: "#818cf8", borderColor: "rgba(99,102,241,0.2)" }}>
                {validImages.length} images
              </span>
            )}
          </div>
          <span className={`sourcesChevron ${open ? "open" : ""}`}>▼</span>
        </div>

        {/* Body — shown immediately, collapsible */}
        {open && (
          <div className="sourcesPanelBody">

            {/* ── Images grid — auto-rendered, no click needed ── */}
            {validImages.length > 0 && (
              <div className="imagesGrid">
                {visibleImages.map((img, i) => (
                  <div
                    key={i}
                    className="imageThumb"
                    onClick={() => setLightbox(getImgSrc(img))}
                    title={img.title || ""}
                  >
                    <img
                      src={getImgSrc(img)}
                      alt={img.title || "image"}
                      loading="lazy"
                      onError={() => handleImgError(i)}
                    />
                    {img.title && (
                      <div className="imageThumbTitle">{img.title}</div>
                    )}
                  </div>
                ))}

                {/* More images button */}
                {hasMoreImages && (
                  <button
                    className="moreImagesBtn"
                    onClick={(e) => { e.stopPropagation(); setShowAllImages(true); }}
                  >
                    + {validImages.length - INITIAL_IMAGES} more images
                  </button>
                )}
              </div>
            )}

            {/* Divider */}
            {validImages.length > 0 && searchResults.length > 0 && (
              <hr className="sourcesDivider" />
            )}

            {/* ── Sources list ── */}
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
          <img
            src={lightbox}
            alt="Preview"
            onClick={(e) => e.stopPropagation()}
            onError={(e) => { e.target.alt = "Image failed to load"; }}
          />
        </div>
      )}
    </>
  );
}

export default SourcesPanel;