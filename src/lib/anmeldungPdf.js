import {
  ANMELDUNG_PDF_FIELDS,
  ANMELDUNG_SIGNATURE_URL,
  ANMELDUNG_TEMPLATE_URL,
  ANMELDUNG_WIDGETS,
  missingAnmeldungFields,
} from "./anmeldung";

async function fetchTemplateBytes() {
  const res = await fetch(ANMELDUNG_TEMPLATE_URL);
  if (!res.ok) {
    throw new Error(
      "Anmeldung template missing. Place Anmeldung_application.pdf in public/templates/."
    );
  }
  return new Uint8Array(await res.arrayBuffer());
}

async function tryFetchSignatureBytes() {
  try {
    const res = await fetch(ANMELDUNG_SIGNATURE_URL);
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return null;
  }
}

/**
 * Fill the official Anmeldung AcroForm PDF (sharp vector text, correct field boxes).
 * Returns { blob, dataUrl, filename }.
 */
export async function generateAnmeldungPdf(fields, { filename, flatten = true } = {}) {
  const missing = missingAnmeldungFields(fields);
  if (missing.length) {
    const err = new Error(`Fill required fields: ${missing.join(", ")}`);
    err.missing = missing;
    throw err;
  }

  const { PDFDocument, StandardFonts } = await import("pdf-lib");
  const templateBytes = await fetchTemplateBytes();
  const pdf = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
  const form = pdf.getForm();
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  for (const [key, pdfName] of Object.entries(ANMELDUNG_PDF_FIELDS)) {
    const value = String(fields[key] ?? "").trim();
    try {
      const field = form.getTextField(pdfName);
      field.setText(value);
      field.setFontSize(9);
    } catch (err) {
      console.warn(`Anmeldung field missing in template: ${pdfName}`, err);
    }
  }

  // Optional stamp image (only if file exists) — placed beside the signature date field
  const stampBytes = await tryFetchSignatureBytes();
  if (stampBytes) {
    try {
      const page = pdf.getPages()[0];
      const stamp = await pdf.embedPng(stampBytes).catch(() => pdf.embedJpg(stampBytes));
      const s = ANMELDUNG_WIDGETS.signatureImage;
      page.drawImage(stamp, {
        x: s.x,
        y: s.y,
        width: s.w,
        height: s.h,
      });
    } catch (err) {
      console.warn("Could not embed Anmeldung signature image", err);
    }
  }

  try {
    form.updateFieldAppearances(font);
  } catch {
    // Some PDF viewers still show values without appearance streams
  }

  if (flatten) {
    try {
      form.flatten();
    } catch (err) {
      console.warn("Anmeldung flatten skipped", err);
    }
  }

  const outBytes = await pdf.save();
  const blob = new Blob([outBytes], { type: "application/pdf" });
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not encode PDF"));
    reader.readAsDataURL(blob);
  });

  const safeName = String(
    filename ||
      `Anmeldung_${fields.tenantLastName || "document"}_${fields.einzugDate || ""}`
  )
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-");
  const finalName = safeName.endsWith(".pdf") ? safeName : `${safeName}.pdf`;

  return { blob, dataUrl, filename: finalName, bytes: outBytes };
}

export async function downloadAnmeldungPdf(fields, options) {
  const { blob, filename } = await generateAnmeldungPdf(fields, options);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return { filename };
}

/** Browser preview: object URL for iframe / new tab. Caller must revoke. */
export async function previewAnmeldungPdfUrl(fields, options) {
  const { blob, filename } = await generateAnmeldungPdf(fields, options);
  return { url: URL.createObjectURL(blob), filename, blob };
}

export async function anmeldungPdfFile(fields, options) {
  const { blob, filename } = await generateAnmeldungPdf(fields, options);
  return new File([blob], filename, { type: "application/pdf" });
}
