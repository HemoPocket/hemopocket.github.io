#!/usr/bin/env python3
"""Convierte los documentos Markdown de HemoPocket a .docx con formato.
Soporta: títulos (#..####), negrita/cursiva/código en línea, tablas, listas
con viñetas y numeradas, citas (>), reglas horizontales y enlaces."""
import re, sys
from docx import Document
from docx.shared import Pt, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT

BRAND = RGBColor(0xC4, 0x1E, 0x3A)
GREY  = RGBColor(0x66, 0x66, 0x66)

INLINE = re.compile(r'(\*\*.+?\*\*|\*[^*]+?\*|`[^`]+?`|\[[^\]]+?\]\([^)]+?\))')

def add_runs(par, text):
    """Añade texto con formato en línea (negrita, cursiva, código, enlaces)."""
    text = text.replace('—', '—').replace('–', '–')
    for part in INLINE.split(text):
        if not part:
            continue
        if part.startswith('**') and part.endswith('**'):
            r = par.add_run(part[2:-2]); r.bold = True
        elif part.startswith('`') and part.endswith('`'):
            r = par.add_run(part[1:-1]); r.font.name = 'Consolas'; r.font.size = Pt(10)
        elif part.startswith('[') and '](' in part:
            label = part[1:part.index(']')]
            r = par.add_run(label); r.italic = True
        elif part.startswith('*') and part.endswith('*'):
            r = par.add_run(part[1:-1]); r.italic = True
        else:
            par.add_run(part)

def style_table_header(cell):
    for p in cell.paragraphs:
        for r in p.runs:
            r.bold = True

def convert(md_path, docx_path, title=None):
    with open(md_path, encoding='utf-8') as f:
        lines = f.read().split('\n')

    doc = Document()
    # Estilo base
    normal = doc.styles['Normal']
    normal.font.name = 'Calibri'
    normal.font.size = Pt(11)

    i = 0
    n = len(lines)
    while i < n:
        line = lines[i]
        stripped = line.strip()

        # Línea en blanco
        if not stripped:
            i += 1
            continue

        # Regla horizontal
        if re.match(r'^-{3,}$', stripped):
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(4)
            p.paragraph_format.space_after = Pt(4)
            r = p.add_run('_' * 50); r.font.color.rgb = RGBColor(0xCC, 0xCC, 0xCC)
            i += 1
            continue

        # Tabla (cabecera | ... | seguida de separador |---|)
        if stripped.startswith('|') and i + 1 < n and re.match(r'^\s*\|?[\s:|-]+\|?\s*$', lines[i+1]):
            header = [c.strip() for c in stripped.strip('|').split('|')]
            rows = []
            j = i + 2
            while j < n and lines[j].strip().startswith('|'):
                rows.append([c.strip() for c in lines[j].strip().strip('|').split('|')])
                j += 1
            table = doc.add_table(rows=1, cols=len(header))
            table.style = 'Light Grid Accent 1'
            table.alignment = WD_TABLE_ALIGNMENT.CENTER
            hdr = table.rows[0].cells
            for k, h in enumerate(header):
                hdr[k].paragraphs[0].text = ''
                add_runs(hdr[k].paragraphs[0], h)
                style_table_header(hdr[k])
            for row in rows:
                cells = table.add_row().cells
                for k in range(len(header)):
                    val = row[k] if k < len(row) else ''
                    cells[k].paragraphs[0].text = ''
                    add_runs(cells[k].paragraphs[0], val)
            doc.add_paragraph()
            i = j
            continue

        # Títulos
        m = re.match(r'^(#{1,6})\s+(.*)$', stripped)
        if m:
            level = len(m.group(1))
            txt = m.group(2).strip()
            if level == 1:
                p = doc.add_paragraph()
                r = p.add_run(txt); r.bold = True; r.font.size = Pt(20); r.font.color.rgb = BRAND
                p.paragraph_format.space_after = Pt(6)
            elif level == 2:
                p = doc.add_paragraph()
                r = p.add_run(txt); r.bold = True; r.font.size = Pt(15); r.font.color.rgb = BRAND
                p.paragraph_format.space_before = Pt(10); p.paragraph_format.space_after = Pt(4)
            elif level == 3:
                p = doc.add_paragraph()
                r = p.add_run(txt); r.bold = True; r.font.size = Pt(12.5); r.font.color.rgb = BRAND
                p.paragraph_format.space_before = Pt(8)
            else:
                p = doc.add_paragraph()
                r = p.add_run(txt); r.bold = True; r.font.size = Pt(11)
            i += 1
            continue

        # Cita
        if stripped.startswith('>'):
            txt = stripped.lstrip('>').strip()
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Inches(0.3)
            add_runs(p, txt)
            for r in p.runs:
                r.italic = True; r.font.color.rgb = GREY
            i += 1
            continue

        # Lista numerada
        m = re.match(r'^(\d+)\.\s+(.*)$', stripped)
        if m:
            p = doc.add_paragraph(style='List Number')
            add_runs(p, m.group(2))
            i += 1
            continue

        # Lista con viñetas
        if re.match(r'^[-*]\s+', stripped):
            txt = re.sub(r'^[-*]\s+', '', stripped)
            p = doc.add_paragraph(style='List Bullet')
            add_runs(p, txt)
            i += 1
            continue

        # Párrafo normal
        p = doc.add_paragraph()
        add_runs(p, stripped)
        i += 1

    doc.save(docx_path)
    print('Generado:', docx_path)

if __name__ == '__main__':
    convert('docs/PROYECTO_HemoPocket.md', 'docs/PROYECTO_HemoPocket.docx')
    convert('docs/RECOMENDACIONES_aprobacion.md', 'docs/RECOMENDACIONES_aprobacion.docx')
