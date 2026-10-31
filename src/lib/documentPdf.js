/** Download a filled document as an A4 PDF. jsPDF loads only when a download starts. */
export async function downloadTextPdf({ title, body, filename }) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 16;
  const width = doc.internal.pageSize.getWidth() - margin * 2;
  const pageH = doc.internal.pageSize.getHeight();

  doc.setFont("times", "bold");
  doc.setFontSize(14);
  const titleLines = doc.splitTextToSize(title || "Document", width);
  let y = 18;
  doc.text(titleLines, margin, y);
  y += titleLines.length * 6 + 4;

  doc.setFont("times", "normal");
  doc.setFontSize(11);
  const lines = doc.splitTextToSize(String(body || ""), width);
  for (const line of lines) {
    if (y > pageH - 16) {
      doc.addPage();
      y = 18;
    }
    doc.text(line, margin, y);
    y += 5.4;
  }

  const safe = String(filename || "document")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-");
  doc.save(safe.endsWith(".pdf") ? safe : `${safe}.pdf`);
}
