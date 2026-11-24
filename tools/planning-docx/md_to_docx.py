"""Markdown planning doc -> Word copy for colleagues (pandoc + table borders).

Usage:
    python -I md_to_docx.py <in.md> <out.docx> [pandoc.exe]

- The first-level heading becomes the Word document title (pandoc --shift-heading-level-by=-1),
  so "## Summary" etc. become Heading 1.
- Every table gets single-line borders and a repeating header row, so the at-a-glance table's
  Include / Comments columns can be filled in by hand or in Word.
- Equations ($...$, $$...$$) become native Word equations (pandoc default).
"""
import os
import subprocess
import sys

from docx import Document
from docx.oxml import OxmlElement
from docx.oxml.ns import qn


def add_borders(table):
    tblPr = table._tbl.tblPr
    for old in tblPr.findall(qn("w:tblBorders")):
        tblPr.remove(old)
    borders = OxmlElement("w:tblBorders")
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        el = OxmlElement(f"w:{edge}")
        el.set(qn("w:val"), "single")
        el.set(qn("w:sz"), "4")
        el.set(qn("w:space"), "0")
        el.set(qn("w:color"), "808080")
        borders.append(el)
    tblPr.append(borders)
    first = table.rows[0]._tr
    trPr = first.get_or_add_trPr()
    if trPr.find(qn("w:tblHeader")) is None:
        trPr.append(OxmlElement("w:tblHeader"))


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    src, out = sys.argv[1], sys.argv[2]
    pandoc = sys.argv[3] if len(sys.argv) > 3 else "pandoc"
    subprocess.run([pandoc, src, "-f", "markdown", "-t", "docx",
                    "--shift-heading-level-by=-1", "-o", out], check=True)
    doc = Document(out)
    for t in doc.tables:
        add_borders(t)
    doc.save(out)
    print(f"{out}: {len(doc.tables)} tables bordered, title {doc.core_properties.title!r}, "
          f"{os.path.getsize(out):,} bytes")


if __name__ == "__main__":
    main()
