/**
 * pdfGenerator.js — client-side PDF generation via html2canvas + jsPDF.
 * Captures the off-screen <PDFReport> DOM node and exports an A4 PDF.
 */
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { FY } from "../engine/constants.js";

/**
 * @param {HTMLElement} node the PDFReport DOM element
 */
export async function downloadPDF(node) {
  if (!node) throw new Error("PDF report node not found");

  const canvas = await html2canvas(node, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  // Paginate if the report is taller than one page.
  let heightLeft = imgHeight;
  let position = 0;
  pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;
  while (heightLeft > 0) {
    position -= pageHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(`TaxSathi_Plan_FY${FY}.pdf`);
}

/** Build a short WhatsApp share message + link. */
export function buildShareText(savings) {
  const amt = new Intl.NumberFormat("en-IN").format(Math.round(savings || 0));
  const text = `I used TaxSathi AI and found I can save ₹${amt} in taxes this year! 🎉 Find your best tax regime free: `;
  return encodeURIComponent(text);
}
