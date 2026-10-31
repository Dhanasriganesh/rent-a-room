/** Wohnungsgeberbestätigung (Anmeldung) — fill official AcroForm PDF. */

export const ANMELDUNG_TEMPLATE_URL = "/templates/Anmeldung_application.pdf";

/** Optional stamp/signature PNG drawn near the signature line. */
export const ANMELDUNG_SIGNATURE_URL = "/templates/anmeldung-signature.png";

/** PDF page size of Anmeldung_application.pdf (points). */
export const ANMELDUNG_PAGE = { width: 594.96, height: 842.04 };

/**
 * Map app field keys → official PDF AcroForm field names.
 */
export const ANMELDUNG_PDF_FIELDS = {
  wohnungsgeberName: "Familienname1",
  wohnungsgeberStreet: "Straße1",
  wohnungsgeberPlz: "Postleitzahl1",
  wohnungsgeberOrt: "Ort1",
  eigentuemerName: "Wohnungseigentümer1",
  einzugDate: "Einzugsdatum1",
  wohnungStreet: "Straße2",
  wohnungZusatz: "Zusatzangaben1",
  wohnungPlz: "Postleitzahl2",
  wohnungOrt: "Ort2",
  tenantLastName: "FamiliennameRow1",
  tenantFirstName: "VornameRow1",
  signatureDatePlace: "Datum Unterschrift Wohnungsgeber bzw Wohnungseigentümer",
};

/**
 * Widget rects from Anmeldung_application.pdf (PDF coords: origin bottom-left).
 * Used for the on-screen live overlay preview.
 */
export const ANMELDUNG_WIDGETS = {
  wohnungsgeberName: { x: 68.88, y: 706.25, w: 467.72, h: 14.17 },
  wohnungsgeberStreet: { x: 68.88, y: 681.45, w: 467.72, h: 14.17 },
  wohnungsgeberPlz: { x: 68.88, y: 656.5, w: 82.21, h: 14.17 },
  wohnungsgeberOrt: { x: 153.92, y: 656.5, w: 382.68, h: 14.17 },
  eigentuemerName: { x: 68.88, y: 583.94, w: 467.72, h: 14.17 },
  einzugDate: { x: 342.71, y: 546.52, w: 96.38, h: 14.17 },
  wohnungStreet: { x: 68.88, y: 490.96, w: 467.72, h: 14.17 },
  wohnungZusatz: { x: 68.88, y: 466.3, w: 467.72, h: 14.17 },
  wohnungPlz: { x: 68.88, y: 441.64, w: 82.21, h: 14.17 },
  wohnungOrt: { x: 153.92, y: 441.64, w: 382.68, h: 14.17 },
  tenantLastName: { x: 69.12, y: 365.64, w: 233.88, h: 17.16 },
  tenantFirstName: { x: 305.04, y: 365.64, w: 233.64, h: 17.16 },
  signatureDatePlace: { x: 69.33, y: 156.48, w: 255.24, h: 14.17 },
  signatureImage: { x: 340, y: 140, w: 180, h: 40 },
};

/** Convert PDF widget rect → CSS % for a top-left overlay on the page image. */
export function widgetToCssPercent(rect, page = ANMELDUNG_PAGE) {
  return {
    left: `${(rect.x / page.width) * 100}%`,
    top: `${((page.height - rect.y - rect.h) / page.height) * 100}%`,
    width: `${(rect.w / page.width) * 100}%`,
    height: `${(rect.h / page.height) * 100}%`,
  };
}

export const ANMELDUNG_FORM_FIELDS = [
  {
    key: "wohnungsgeberName",
    label: "Wohnungsgeber — name / company",
    required: true,
    group: "provider",
  },
  {
    key: "wohnungsgeberStreet",
    label: "Wohnungsgeber — street, house no.",
    required: true,
    group: "provider",
  },
  {
    key: "wohnungsgeberPlz",
    label: "Wohnungsgeber — PLZ",
    required: true,
    group: "provider",
  },
  {
    key: "wohnungsgeberOrt",
    label: "Wohnungsgeber — city",
    required: true,
    group: "provider",
  },
  {
    key: "eigentuemerName",
    label: "Eigentümer (only if different from Wohnungsgeber)",
    required: false,
    group: "owner",
  },
  {
    key: "einzugDate",
    label: "Move-in date (TT.MM.JJJJ)",
    required: true,
    group: "move",
  },
  {
    key: "wohnungStreet",
    label: "Wohnung — street, house no.",
    required: true,
    group: "unit",
  },
  {
    key: "wohnungZusatz",
    label: "Wohnung — Zusatz (floor, room, WE…)",
    required: false,
    group: "unit",
  },
  {
    key: "wohnungPlz",
    label: "Wohnung — PLZ",
    required: true,
    group: "unit",
  },
  {
    key: "wohnungOrt",
    label: "Wohnung — city",
    required: true,
    group: "unit",
  },
  {
    key: "tenantLastName",
    label: "Tenant — Familienname",
    required: true,
    group: "person",
  },
  {
    key: "tenantFirstName",
    label: "Tenant — Vorname",
    required: true,
    group: "person",
  },
  {
    key: "signatureDatePlace",
    label: "Datum, Ort (signature line)",
    required: true,
    group: "sign",
  },
];

export function emptyAnmeldungFields() {
  return Object.fromEntries(ANMELDUNG_FORM_FIELDS.map((f) => [f.key, ""]));
}

/** Split "First Last" / "Last, First" into Familienname + Vorname. */
export function splitGermanName(fullName = "") {
  const raw = String(fullName || "").trim().replace(/\s+/g, " ");
  if (!raw) return { lastName: "", firstName: "" };
  if (raw.includes(",")) {
    const [last, ...rest] = raw.split(",");
    return { lastName: last.trim(), firstName: rest.join(",").trim() };
  }
  const parts = raw.split(" ");
  if (parts.length === 1) return { lastName: parts[0], firstName: "" };
  return {
    lastName: parts[parts.length - 1],
    firstName: parts.slice(0, -1).join(" "),
  };
}

export function formatGermanDate(value) {
  if (!value) return "";
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(String(value).trim())) return String(value).trim();
  const d = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

export function formatGermanDateShort(value) {
  const full = formatGermanDate(value);
  if (!/^\d{2}\.\d{2}\.\d{4}$/.test(full)) return full;
  return `${full.slice(0, 6)}${full.slice(8)}`; // TT.MM.JJ
}

export function missingAnmeldungFields(fields = {}) {
  return ANMELDUNG_FORM_FIELDS.filter((f) => f.required && !String(fields[f.key] || "").trim()).map(
    (f) => f.key
  );
}

/**
 * Prefill Anmeldung fields from allocation + related property / owner / application.
 */
export function buildAnmeldungDefaults({
  allocation = null,
  property = null,
  owner = null,
  application = null,
  providerDefaults = {},
} = {}) {
  const name = allocation?.applicantName || application?.applicantName || "";
  const { lastName, firstName } = splitGermanName(name);
  const moveIn =
    allocation?.startDate ||
    application?.desiredMoveIn ||
    new Date().toISOString().slice(0, 10);
  const einzug = formatGermanDate(moveIn);
  const signDate = formatGermanDateShort(new Date());
  const city = property?.city || "Berlin";

  const zusatz = [
    allocation?.roomLabel || application?.roomLabel,
    allocation?.bedLabel || application?.bedLabel,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    ...emptyAnmeldungFields(),
    wohnungsgeberName:
      providerDefaults.wohnungsgeberName ||
      owner?.legalName ||
      owner?.fullName ||
      "",
    wohnungsgeberStreet:
      providerDefaults.wohnungsgeberStreet || owner?.address || "",
    wohnungsgeberPlz: providerDefaults.wohnungsgeberPlz || "",
    wohnungsgeberOrt: providerDefaults.wohnungsgeberOrt || "Berlin",
    eigentuemerName: providerDefaults.eigentuemerName || "",
    einzugDate: einzug,
    wohnungStreet: property?.address || "",
    wohnungZusatz: zusatz,
    wohnungPlz: property?.postalCode || "",
    wohnungOrt: city,
    tenantLastName: lastName,
    tenantFirstName: firstName,
    signatureDatePlace: `${signDate}, ${city}`,
  };
}
