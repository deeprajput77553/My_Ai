import jsPDF from "jspdf";
import html2canvas from "html2canvas";

if (typeof window !== "undefined") {
  window.html2canvas = html2canvas;
}

export const exportToPdf = async (elementRef, filename = "notes", config = {}) => {
  const element = elementRef.current;
  if (!element) return;

  try {
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });

    // Create a temporary cloned container so we don't mess up the UI width
    const clone = element.cloneNode(true);
    clone.style.width = "500px"; // Force fixed width to fit A4 layout
    clone.style.padding = "0px";
    clone.style.background = "#0f172a"; // Match dark mode
    clone.style.color = "#f8fafc";
    document.body.appendChild(clone);

    await pdf.html(clone, {
      callback: function (doc) {
        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          doc.setPage(i);
          
          if (config.borders) {
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(1);
            doc.rect(15, 15, doc.internal.pageSize.getWidth() - 30, doc.internal.pageSize.getHeight() - 30);
          }
          
          if (config.headerText) {
            doc.setFontSize(10);
            doc.setTextColor(150, 150, 150);
            let hx = 20;
            if (config.headerAlign === "center") hx = doc.internal.pageSize.getWidth() / 2;
            else if (config.headerAlign === "right") hx = doc.internal.pageSize.getWidth() - 20;
            doc.text(config.headerText, hx, 30, { align: config.headerAlign || "left" });
          }
          
          if (config.pageNumbers) {
            doc.setFontSize(9);
            doc.setTextColor(150, 150, 150);
            let fx = doc.internal.pageSize.getWidth() / 2;
            if (config.pageNumAlign === "left") fx = 20;
            else if (config.pageNumAlign === "right") fx = doc.internal.pageSize.getWidth() - 20;
            doc.text(`Page ${i} of ${totalPages}`, fx, doc.internal.pageSize.getHeight() - 25, { align: config.pageNumAlign || "center" });
          }
        }
        
        doc.save(`${filename}.pdf`);
        document.body.removeChild(clone);
      },
      margin: [50, 20, 50, 20], // TOP, RIGHT, BOTTOM, LEFT margins to prevent overlap with headers/footers
      x: 0,
      y: 0,
      width: 500, // Width of html
      windowWidth: 500,
      autoPaging: 'text', // Instructs the engine to NOT cut text in half!
    });
  } catch (err) {
    console.error("PDF export failed:", err);
  }
};