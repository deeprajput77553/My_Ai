import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export const exportToPdf = async (elementRef, filename = "notes") => {
  const element = elementRef.current;
  if (!element) return;

  try {
    const canvas = await html2canvas(element, {
      scale: 2,                        // retina quality
      backgroundColor: "#0f172a",      // match app dark bg
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    // First page
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Add extra pages if content is long
    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`${filename}.pdf`);
  } catch (err) {
    console.error("PDF export failed:", err);
  }
};