from pypdf import PdfReader
from pathlib import Path

reader = PdfReader(r"H:\rent-a-room\spec.pdf")
out = Path(r"H:\rent-a-room\scripts\spec_text.txt")

lines = [f"PAGES: {len(reader.pages)}", "=" * 80]
for i, page in enumerate(reader.pages):
    lines.append("")
    lines.append("=" * 80)
    lines.append(f"=== PAGE {i + 1} ===")
    lines.append("=" * 80)
    text = page.extract_text() or ""
    lines.append(text)

out.write_text("\n".join(lines), encoding="utf-8")
print(f"Wrote {out} ({len(reader.pages)} pages)")
