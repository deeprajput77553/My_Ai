import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { saveAs } from "file-saver"; // Use file-saver for better mobile support ✅

export const exportToPdf = async (elementRef, filename = "notes", config = {}) => {
  const element = elementRef.current;
  if (!element) return Promise.reject("No element");

  return new Promise(async (resolve, reject) => {
    try {
      // 1. Sanitize filename and ensure a clean base
      const cleanName = typeof filename === "string" ? filename : "notes";
      const safeBase = cleanName.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30);
      const finalFilename = `${safeBase || "my_ai_notes"}.pdf`;

      // 2. Create a high-fidelity clone
      const clone = element.cloneNode(true);
      
      Object.assign(clone.style, {
        width: "650px",
        position: "fixed",
        left: "0",
        top: "0",
        zIndex: "-9999",
        background: "white",
        color: "black",
        padding: "40px",
        fontSize: "14px",
        height: "auto",
        display: "block",
        opacity: "1",
        pointerEvents: "none"
      });

      // Add Header if provided in config
      if (config.headerText) {
        const headerDiv = document.createElement("div");
        headerDiv.style.borderBottom = "1px solid #ddd";
        headerDiv.style.marginBottom = "20px";
        headerDiv.style.paddingBottom = "10px";
        headerDiv.style.textAlign = config.headerAlign || "right";
        headerDiv.style.fontSize = "12px";
        headerDiv.style.color = "#666";
        headerDiv.innerText = config.headerText;
        clone.insertBefore(headerDiv, clone.firstChild);
      }

      clone.querySelectorAll("*").forEach(el => {
        el.style.color = "black";
        el.style.borderColor = "#ddd";
        el.style.backgroundColor = "transparent";
      });

      document.body.appendChild(clone);

      // 3. Initialize PDF
      const pdf = new jsPDF("p", "pt", "a4");
      
      // 4. Render to PDF
      await pdf.html(clone, {
        html2canvas: { 
          scale: 0.8, 
          useCORS: true, 
          backgroundColor: "#ffffff",
          logging: false
        },
        margin: [40, 40, 40, 40],
        autoPaging: 'text',
        x: 0,
        y: 0,
        width: 515,
        windowWidth: 650,
        callback: function (doc) {
          try {
            // Use saveAs for robust cross-browser downloads
            const pdfBlob = doc.output('blob');
            saveAs(pdfBlob, finalFilename);
            
            document.body.removeChild(clone);
            resolve();
          } catch (e) {
            reject(e);
          }
        }
      });
    } catch (err) {
      console.error("PDF generation error:", err);
      reject(err);
    }
  });
};