import { useEffect, useState } from "react";
import "./SplashScreen.css";

function SplashScreen({ onComplete }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFading(true), 2500);
    const completeTimer = setTimeout(() => onComplete(), 3200);
    return () => {
      clearTimeout(timer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className={`splash-screen ${fading ? "splash-fade-out" : ""}`}>
      <div className="splash-logo-container">
        <svg className="splash-svg" viewBox="0 0 100 100" fill="none" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
          <defs>
            <linearGradient id="splashGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#818cf8" />
            </linearGradient>
            <filter id="splashGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path className="splash-path" filter="url(#splashGlow)" stroke="url(#splashGrad)"
            d="M 20 90 L 50 15 L 80 90 M 35 60 L 65 60" />
        </svg>
      </div>
      <h1 className="splash-brand-name">
        <span className="splash-letter" style={{ animationDelay: "0.80s" }}>O</span>
        <span className="splash-letter" style={{ animationDelay: "0.85s" }}>L</span>
        <span className="splash-letter" style={{ animationDelay: "0.90s" }}>L</span>
        <span className="splash-letter" style={{ animationDelay: "0.95s" }}>A</span>
        <span className="splash-letter" style={{ animationDelay: "1.00s" }}>M</span>
        <span className="splash-letter" style={{ animationDelay: "1.05s" }}>A</span>
        <span className="splash-letter" style={{ animationDelay: "1.10s" }}>&nbsp;</span>
        <span className="splash-letter" style={{ animationDelay: "1.15s" }}>A</span>
        <span className="splash-letter" style={{ animationDelay: "1.20s" }}>I</span>
      </h1>
      <div className="splash-pulse"></div>
    </div>
  );
}

export default SplashScreen;
