#!/usr/bin/env python3
"""Build the Causey internal PowerPoint template (.pptx + .potx)."""

from __future__ import annotations

import zipfile
from io import BytesIO
from pathlib import Path

from lxml import etree
from PIL import Image, ImageDraw, ImageFont
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.oxml.ns import qn
from pptx.util import Emu, Inches, Pt

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent.parent
ASSETS = ROOT / "assets"
FONT_SERIF_PATH = REPO / "app/fonts/SourceSerif4-Semibold.ttf"

# Design tokens — CAUSEY-DESIGN-SYSTEM.txt
BG = RGBColor(0xF5, 0xF9, 0xFC)
SURFACE = RGBColor(0xFF, 0xFF, 0xFF)
SOFT = RGBColor(0xF2, 0xF5, 0xF8)
FORE = RGBColor(0x14, 0x18, 0x1C)
MUTED = RGBColor(0x5A, 0x65, 0x70)
MUTED_STRONG = RGBColor(0x3A, 0x44, 0x50)
RED = RGBColor(0xC2, 0x3B, 0x32)
RED_HOVER = RGBColor(0xA8, 0x32, 0x2A)
BLUE = RGBColor(0x4A, 0x8E, 0xB8)
BLUE_SOFT = RGBColor(0xD4, 0xE8, 0xF4)
BLUE_STRONG = RGBColor(0x3A, 0x7A, 0xA3)
ACCENT_SOFT = RGBColor(0xF8, 0xE8, 0xE6)
LINE = RGBColor(0xDF, 0xE3, 0xE6)

FONT_DISPLAY = "Source Serif 4"
FONT_SANS = "Source Sans 3"

SLIDE_W = Inches(13.333333)
SLIDE_H = Inches(7.5)
NSMAP = {
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}


def _set_solid(shape, color: RGBColor, line=None) -> None:
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    if line is None:
        shape.line.fill.background()
    else:
        shape.line.color.rgb = line


def _force_latin(run, typeface: str) -> None:
    rPr = run._r.get_or_add_rPr()
    for tag in ("latin", "ea", "cs"):
        el = rPr.find(qn(f"a:{tag}"))
        if el is None:
            el = etree.SubElement(rPr, qn(f"a:{tag}"))
        el.set("typeface", typeface)


def add_run(paragraph, text, *, font, size, color, bold=False, italic=False):
    run = paragraph.add_run()
    run.text = text
    run.font.name = font
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = color
    _force_latin(run, font)
    return run


def set_box_text(shape, lines, *, font, size, color, bold=False, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, gap=6):
    tf = shape.text_frame
    tf.clear()
    tf.word_wrap = True
    tf.auto_size = None
    try:
        shape.text_frame._txBody.bodyPr.set("anchor", {MSO_ANCHOR.TOP: "t", MSO_ANCHOR.MIDDLE: "ctr", MSO_ANCHOR.BOTTOM: "b"}[anchor])
    except Exception:
        pass
    for i, line in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        p.clear()
        p.space_after = Pt(gap)
        p.space_before = Pt(0)
        add_run(p, line, font=font, size=size, color=color, bold=bold)


def add_textbox(slide, left, top, width, height, lines, **kwargs):
    box = slide.shapes.add_textbox(left, top, width, height)
    set_box_text(box, lines, **kwargs)
    return box


def draw_mark(size: int = 512) -> Image.Image:
    """Red rounded square + white open C, matching CauseyLogo.svg."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    s = size / 32.0
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=round(7 * s), fill=(0xC2, 0x3B, 0x32, 255))
    cx, cy, r = 16.405 * s, 16 * s, 7 * s
    stroke = max(2, round(3.4 * s))
    bbox = [cx - r, cy - r, cx + r, cy + r]
    d.arc(bbox, start=43.3, end=316.7, fill=(255, 255, 255, 255), width=stroke)
    cap = stroke / 2
    for px, py in ((21.5 * s, 11.2 * s), (21.5 * s, 20.8 * s)):
        d.ellipse([px - cap, py - cap, px + cap, py + cap], fill=(255, 255, 255, 255))
    return img


def draw_lockup() -> Image.Image:
    mark = draw_mark(256)
    font = ImageFont.truetype(str(FONT_SERIF_PATH), 168)
    word = "Causey"
    tmp = Image.new("RGBA", (8, 8), (0, 0, 0, 0))
    tw = ImageDraw.Draw(tmp).textbbox((0, 0), word, font=font)
    text_w, text_h = tw[2] - tw[0], tw[3] - tw[1]
    gap = 28
    pad = 16
    w = pad * 2 + mark.width + gap + text_w
    h = pad * 2 + max(mark.height, text_h)
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    my = (h - mark.height) // 2
    img.paste(mark, (pad, my), mark)
    d = ImageDraw.Draw(img)
    tx = pad + mark.width + gap
    ty = (h - text_h) // 2 - tw[1]
    d.text((tx, ty), word, font=font, fill=(0x14, 0x18, 0x1C, 255))
    return img


def draw_grid() -> Image.Image:
    w, h = 1920, 1080
    bg = (245, 249, 252)
    img = Image.new("RGBA", (w, h), bg + (255,))
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    line = (20, 24, 28, 16)
    step = 46
    for x in range(0, w + 1, step):
        d.line([(x, 0), (x, h)], fill=line, width=1)
    for y in range(0, h + 1, step):
        d.line([(0, y), (w, y)], fill=line, width=1)
    return Image.alpha_composite(img, overlay).convert("RGB")


def write_assets() -> dict[str, Path]:
    ASSETS.mkdir(parents=True, exist_ok=True)
    paths = {
        "mark": ASSETS / "mark.png",
        "lockup": ASSETS / "lockup.png",
        "grid": ASSETS / "grid.png",
    }
    draw_mark(512).save(paths["mark"])
    draw_lockup().save(paths["lockup"])
    draw_grid().save(paths["grid"], quality=95)
    return paths


def _theme_part(prs: Presentation):
    for rel in prs.slide_masters[0].part.rels.values():
        if "theme" in rel.reltype:
            return rel.target_part
    raise RuntimeError("theme part missing")


def patch_theme(prs: Presentation) -> None:
    part = _theme_part(prs)
    root = etree.fromstring(part.blob)
    ns = NSMAP["a"]

    def set_srgb(parent_tag: str, hex6: str) -> None:
        parent = root.find(f".//{{{ns}}}{parent_tag}")
        if parent is None:
            return
        for child in list(parent):
            parent.remove(child)
        el = etree.SubElement(parent, f"{{{ns}}}srgbClr")
        el.set("val", hex6)

    scheme = root.find(f".//{{{ns}}}clrScheme")
    if scheme is not None:
        scheme.set("name", "Causey")
    set_srgb("dk1", "14181C")
    set_srgb("lt1", "FFFFFF")
    set_srgb("dk2", "3A4450")
    set_srgb("lt2", "F5F9FC")
    set_srgb("accent1", "C23B32")
    set_srgb("accent2", "4A8EB8")
    set_srgb("accent3", "3A7AA3")
    set_srgb("accent4", "5A6570")
    set_srgb("accent5", "D4E8F4")
    set_srgb("accent6", "F8E8E6")
    set_srgb("hlink", "C23B32")
    set_srgb("folHlnk", "A8322A")

    for which, face in (("majorFont", FONT_DISPLAY), ("minorFont", FONT_SANS)):
        node = root.find(f".//{{{ns}}}{which}")
        if node is None:
            continue
        latin = node.find(f"{{{ns}}}latin")
        if latin is not None:
            latin.set("typeface", face)

    font_scheme = root.find(f".//{{{ns}}}fontScheme")
    if font_scheme is not None:
        font_scheme.set("name", "Causey")

    part._blob = etree.tostring(
        root, xml_declaration=True, encoding="UTF-8", standalone=True
    )


def patch_master_text_styles(prs: Presentation) -> None:
    el = prs.slide_masters[0]._element
    a = NSMAP["a"]
    for def_rpr in el.findall(f".//{{{a}}}defRPr"):
        latin = def_rpr.find(f"{{{a}}}latin")
        if latin is not None and latin.get("typeface") in ("+mj-lt",):
            latin.set("typeface", FONT_DISPLAY)
        elif latin is not None and latin.get("typeface") in ("+mn-lt",):
            latin.set("typeface", FONT_SANS)
        for bu in def_rpr.xpath("ancestor::*[local-name()='lvl1pPr' or local-name()='lvl2pPr']/*[local-name()='buFont']"):
            bu.set("typeface", FONT_SANS)

    title = el.find(f".//{{{NSMAP['p']}}}titleStyle/{{{a}}}lvl1pPr")
    if title is not None:
        title.set("algn", "l")
        rpr = title.find(f"{{{a}}}defRPr")
        if rpr is not None:
            rpr.set("sz", "3600")
            rpr.set("b", "1")


def fill_background(obj, color: RGBColor) -> None:
    fill = obj.background.fill
    fill.solid()
    fill.fore_color.rgb = color


def style_placeholder(shape, *, font, size, color, bold=False, align=PP_ALIGN.LEFT):
    if not shape.has_text_frame:
        return
    tf = shape.text_frame
    tf.word_wrap = True
    for p in tf.paragraphs:
        p.alignment = align
        p.font.name = font
        p.font.size = Pt(size)
        p.font.bold = bold
        p.font.color.rgb = color
        if p.runs:
            for run in p.runs:
                run.font.name = font
                run.font.size = Pt(size)
                run.font.bold = bold
                run.font.color.rgb = color
                _force_latin(run, font)
        else:
            run = p.add_run()
            run.font.name = font
            run.font.size = Pt(size)
            run.font.bold = bold
            run.font.color.rgb = color
            _force_latin(run, font)


def _next_shape_id(sp_tree) -> int:
    ids = [0]
    for el in sp_tree.xpath(".//*[@id]"):
        try:
            ids.append(int(el.get("id")))
        except (TypeError, ValueError):
            pass
    return max(ids) + 1


def _append_rect(sp_tree, *, name: str, x, y, cx, cy, fill_hex: str) -> None:
    p, a = NSMAP["p"], NSMAP["a"]
    sid = _next_shape_id(sp_tree)
    sp = etree.SubElement(sp_tree, f"{{{p}}}sp")
    nv = etree.SubElement(sp, f"{{{p}}}nvSpPr")
    cNvPr = etree.SubElement(nv, f"{{{p}}}cNvPr")
    cNvPr.set("id", str(sid))
    cNvPr.set("name", name)
    etree.SubElement(nv, f"{{{p}}}cNvSpPr")
    etree.SubElement(nv, f"{{{p}}}nvPr")
    spPr = etree.SubElement(sp, f"{{{p}}}spPr")
    xfrm = etree.SubElement(spPr, f"{{{a}}}xfrm")
    off = etree.SubElement(xfrm, f"{{{a}}}off")
    off.set("x", str(int(x)))
    off.set("y", str(int(y)))
    ext = etree.SubElement(xfrm, f"{{{a}}}ext")
    ext.set("cx", str(int(cx)))
    ext.set("cy", str(int(cy)))
    geom = etree.SubElement(spPr, f"{{{a}}}prstGeom")
    geom.set("prst", "rect")
    etree.SubElement(geom, f"{{{a}}}avLst")
    solid = etree.SubElement(spPr, f"{{{a}}}solidFill")
    clr = etree.SubElement(solid, f"{{{a}}}srgbClr")
    clr.set("val", fill_hex)
    ln = etree.SubElement(spPr, f"{{{a}}}ln")
    etree.SubElement(ln, f"{{{a}}}noFill")
    txBody = etree.SubElement(sp, f"{{{p}}}txBody")
    etree.SubElement(txBody, f"{{{a}}}bodyPr")
    etree.SubElement(txBody, f"{{{a}}}lstStyle")
    p_el = etree.SubElement(txBody, f"{{{a}}}p")
    etree.SubElement(p_el, f"{{{a}}}endParaRPr")


def _append_picture(part, sp_tree, image_path: Path, *, name: str, x, y, cx, cy) -> None:
    p, a, r = NSMAP["p"], NSMAP["a"], NSMAP["r"]
    _image_part, rId = part.get_or_add_image_part(str(image_path))
    sid = _next_shape_id(sp_tree)
    pic = etree.SubElement(sp_tree, f"{{{p}}}pic")
    nv = etree.SubElement(pic, f"{{{p}}}nvPicPr")
    cNvPr = etree.SubElement(nv, f"{{{p}}}cNvPr")
    cNvPr.set("id", str(sid))
    cNvPr.set("name", name)
    cNvPr.set("descr", image_path.name)
    cNvPicPr = etree.SubElement(nv, f"{{{p}}}cNvPicPr")
    locks = etree.SubElement(cNvPicPr, f"{{{a}}}picLocks")
    locks.set("noChangeAspect", "1")
    etree.SubElement(nv, f"{{{p}}}nvPr")
    blipFill = etree.SubElement(pic, f"{{{p}}}blipFill")
    blip = etree.SubElement(blipFill, f"{{{a}}}blip")
    blip.set(f"{{{r}}}embed", rId)
    stretch = etree.SubElement(blipFill, f"{{{a}}}stretch")
    etree.SubElement(stretch, f"{{{a}}}fillRect")
    spPr = etree.SubElement(pic, f"{{{p}}}spPr")
    xfrm = etree.SubElement(spPr, f"{{{a}}}xfrm")
    off = etree.SubElement(xfrm, f"{{{a}}}off")
    off.set("x", str(int(x)))
    off.set("y", str(int(y)))
    ext = etree.SubElement(xfrm, f"{{{a}}}ext")
    ext.set("cx", str(int(cx)))
    ext.set("cy", str(int(cy)))
    geom = etree.SubElement(spPr, f"{{{a}}}prstGeom")
    geom.set("prst", "rect")
    etree.SubElement(geom, f"{{{a}}}avLst")


def add_master_chrome(prs: Presentation, assets: dict[str, Path]) -> None:
    master = prs.slide_masters[0]
    fill_background(master, BG)
    sp_tree = master.shapes._spTree
    _append_rect(
        sp_tree,
        name="Brand rail",
        x=0,
        y=0,
        cx=Inches(0.08),
        cy=SLIDE_H,
        fill_hex="C23B32",
    )
    _append_rect(
        sp_tree,
        name="Footer rule",
        x=Inches(0.72),
        y=Inches(7.12),
        cx=Inches(11.9),
        cy=Emu(12700),
        fill_hex="DFE3E6",
    )
    mark = Inches(0.26)
    _append_picture(
        master.part,
        sp_tree,
        assets["mark"],
        name="Causey mark",
        x=Inches(0.72),
        y=Inches(7.18),
        cx=mark,
        cy=mark,
    )

    for ph in master.placeholders:
        name = ph.name.lower()
        if "title" in name:
            style_placeholder(ph, font=FONT_DISPLAY, size=36, color=FORE, bold=True)
        elif "text" in name:
            style_placeholder(ph, font=FONT_SANS, size=18, color=FORE)
        elif "date" in name:
            ph.left, ph.top = Inches(1.18), Inches(7.18)
            ph.width, ph.height = Inches(3.2), Inches(0.28)
            style_placeholder(ph, font=FONT_SANS, size=11, color=MUTED)
        elif "footer" in name:
            ph.left, ph.top = Inches(4.5), Inches(7.18)
            ph.width, ph.height = Inches(4.4), Inches(0.28)
            style_placeholder(ph, font=FONT_SANS, size=11, color=MUTED, align=PP_ALIGN.CENTER)
        elif "slide number" in name:
            ph.left, ph.top = Inches(11.4), Inches(7.18)
            ph.width, ph.height = Inches(1.2), Inches(0.28)
            style_placeholder(ph, font=FONT_SANS, size=11, color=MUTED, align=PP_ALIGN.RIGHT)


def style_layouts(prs: Presentation) -> None:
    for layout in prs.slide_layouts:
        fill_background(layout, BG)
        for ph in layout.placeholders:
            name = ph.name.lower()
            if name.startswith("title"):
                ph.left, ph.top = Inches(0.72), Inches(0.42)
                ph.width, ph.height = Inches(11.9), Inches(0.95)
                style_placeholder(ph, font=FONT_DISPLAY, size=32, color=FORE, bold=True)
            elif "subtitle" in name:
                ph.left, ph.top = Inches(0.72), Inches(3.55)
                ph.width, ph.height = Inches(10.4), Inches(1.1)
                style_placeholder(ph, font=FONT_SANS, size=20, color=MUTED)
            elif "content placeholder" in name or "text placeholder" in name:
                style_placeholder(ph, font=FONT_SANS, size=18, color=FORE)
            elif "date" in name:
                style_placeholder(ph, font=FONT_SANS, size=11, color=MUTED)
                if not ph.text_frame.paragraphs[0].runs:
                    ph.text = "Internal"
                else:
                    ph.text_frame.paragraphs[0].runs[0].text = "Internal"
            elif "footer" in name:
                style_placeholder(ph, font=FONT_SANS, size=11, color=MUTED, align=PP_ALIGN.CENTER)
                ph.text = "Causey"

    # Title slide: larger type, lockup lives on the sample slide.
    title_layout = prs.slide_layouts[0]
    for ph in title_layout.placeholders:
        name = ph.name.lower()
        if name.startswith("title"):
            ph.left, ph.top = Inches(0.72), Inches(2.35)
            ph.width, ph.height = Inches(11.6), Inches(1.35)
            style_placeholder(ph, font=FONT_DISPLAY, size=44, color=FORE, bold=True)
        elif "subtitle" in name:
            ph.left, ph.top = Inches(0.72), Inches(3.75)
            ph.width, ph.height = Inches(10.2), Inches(1.0)

    # Section header
    section = prs.slide_layouts[2]
    for ph in section.placeholders:
        name = ph.name.lower()
        if name.startswith("title"):
            ph.left, ph.top = Inches(0.72), Inches(2.55)
            ph.width, ph.height = Inches(11.6), Inches(1.4)
            style_placeholder(ph, font=FONT_DISPLAY, size=40, color=FORE, bold=True)
        elif "text placeholder" in name:
            ph.left, ph.top = Inches(0.72), Inches(4.05)
            ph.width, ph.height = Inches(10.2), Inches(0.9)
            style_placeholder(ph, font=FONT_SANS, size=18, color=MUTED)

    # Content body boxes
    for idx in (1, 3, 4):
        layout = prs.slide_layouts[idx]
        contents = [ph for ph in layout.placeholders if "content" in ph.name.lower() or (ph.placeholder_format.idx in (1, 2, 3, 4) and "title" not in ph.name.lower() and "date" not in ph.name.lower() and "footer" not in ph.name.lower() and "slide" not in ph.name.lower())]
        if idx == 1 and contents:
            ph = contents[0]
            ph.left, ph.top = Inches(0.72), Inches(1.5)
            ph.width, ph.height = Inches(11.9), Inches(5.35)
        if idx == 3 and len(contents) >= 2:
            contents[0].left, contents[0].top = Inches(0.72), Inches(1.5)
            contents[0].width, contents[0].height = Inches(5.7), Inches(5.35)
            contents[1].left, contents[1].top = Inches(6.9), Inches(1.5)
            contents[1].width, contents[1].height = Inches(5.7), Inches(5.35)


def apply_slide_footer_fields(slide) -> None:
    for ph in slide.placeholders:
        name = ph.name.lower()
        try:
            if "date" in name:
                ph.text = "Internal"
                style_placeholder(ph, font=FONT_SANS, size=11, color=MUTED)
            elif "footer" in name:
                ph.text = "Causey"
                style_placeholder(ph, font=FONT_SANS, size=11, color=MUTED, align=PP_ALIGN.CENTER)
        except Exception:
            pass


def add_bullets(shape, items: list[str], *, size=18, color=FORE) -> None:
    tf = shape.text_frame
    tf.clear()
    tf.word_wrap = True
    for i, item in enumerate(items):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.clear()
        p.level = 0
        p.space_after = Pt(10)
        p.space_before = Pt(0)
        p.alignment = PP_ALIGN.LEFT
        add_run(p, item, font=FONT_SANS, size=size, color=color, bold=False)


def card(slide, left, top, width, height, title, body, *, tint=SURFACE, bar_color=RED, label_color=RED):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    _set_solid(shape, tint, LINE)
    try:
        shape.adjustments[0] = 0.08
    except Exception:
        pass
    bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, Inches(0.07), height)
    _set_solid(bar, bar_color)
    add_textbox(
        slide, left + Inches(0.28), top + Inches(0.22), width - Inches(0.4), Inches(0.4),
        [title], font=FONT_SANS, size=14, color=label_color, bold=True,
    )
    add_textbox(
        slide, left + Inches(0.28), top + Inches(0.62), width - Inches(0.4), height - Inches(0.78),
        [body], font=FONT_SANS, size=15, color=FORE,
    )


def style_table(table, rows, cols):
    for r in range(rows):
        for c in range(cols):
            cell = table.cell(r, c)
            cell.margin_left = Inches(0.12)
            cell.margin_right = Inches(0.12)
            cell.margin_top = Inches(0.08)
            cell.margin_bottom = Inches(0.08)
            fill = cell.fill
            fill.solid()
            if r == 0:
                fill.fore_color.rgb = RED
                color = SURFACE
                bold = True
            else:
                fill.fore_color.rgb = SURFACE if r % 2 else SOFT
                color = FORE
                bold = False
            for p in cell.text_frame.paragraphs:
                p.alignment = PP_ALIGN.LEFT
                for run in p.runs:
                    run.font.name = FONT_SANS
                    run.font.size = Pt(13)
                    run.font.bold = bold
                    run.font.color.rgb = color
                    _force_latin(run, FONT_SANS)
            cell.text_frame.word_wrap = True


def send_to_back(slide, shape) -> None:
    tree = slide.shapes._spTree
    tree.remove(shape._element)
    tree.insert(2, shape._element)


def build_sample_slides(prs: Presentation, assets: dict[str, Path]) -> None:
    # 1. Title
    slide = prs.slides.add_slide(prs.slide_layouts[0])
    grid = slide.shapes.add_picture(str(assets["grid"]), Inches(0.08), Inches(0), Inches(13.25), Inches(6.95))
    send_to_back(slide, grid)
    slide.shapes.add_picture(str(assets["lockup"]), Inches(0.72), Inches(1.15), height=Inches(0.52))
    apply_slide_footer_fields(slide)
    set_box_text(slide.placeholders[0], ["[Meeting title]"], font=FONT_DISPLAY, size=44, color=FORE, bold=True)
    set_box_text(
        slide.placeholders[1],
        ["Internal working deck  ·  replace this title  ·  not for external distribution"],
        font=FONT_SANS, size=18, color=MUTED,
    )

    # 2. How to use
    slide = prs.slides.add_slide(prs.slide_layouts[1])
    apply_slide_footer_fields(slide)
    set_box_text(slide.placeholders[0], ["Using this template"], font=FONT_DISPLAY, size=32, color=FORE, bold=True)
    add_bullets(
        slide.placeholders[1],
        [
            "Internal only. Do not send this file to districts, clubs, families, or press as official collateral.",
            "Duplicate an existing slide. Home → New Slide uses the branded layouts (title, section, bullets, two-column).",
            "One job per slide. One headline. Say the next action, not “learn more.”",
            "Do not invent listing counts, fees, pathways, or coverage. Chess search is usable; other types are incomplete.",
            "Install Source Serif 4 and Source Sans 3 so type matches the product. Red is the action color; blue is secondary. Do not use gold.",
            "Delete this slide once the deck has a real purpose.",
        ],
        size=17,
    )

    # 3. Agenda
    slide = prs.slides.add_slide(prs.slide_layouts[1])
    apply_slide_footer_fields(slide)
    set_box_text(slide.placeholders[0], ["Agenda"], font=FONT_DISPLAY, size=32, color=FORE, bold=True)
    add_bullets(
        slide.placeholders[1],
        [
            "Context: what this meeting has to settle",
            "What we know: evidence, not aspiration",
            "Decision: the actual choice, with owners",
            "Risks and open questions",
            "Next actions: who does what by when",
        ],
    )

    # 4. Section
    slide = prs.slides.add_slide(prs.slide_layouts[2])
    apply_slide_footer_fields(slide)
    set_box_text(slide.placeholders[0], ["[Section]"], font=FONT_DISPLAY, size=40, color=FORE, bold=True)
    set_box_text(
        slide.placeholders[1],
        ["One sentence on why this section exists in the meeting."],
        font=FONT_SANS, size=18, color=MUTED,
    )

    # 5. Content
    slide = prs.slides.add_slide(prs.slide_layouts[1])
    apply_slide_footer_fields(slide)
    set_box_text(slide.placeholders[0], ["[What we know]"], font=FONT_DISPLAY, size=32, color=FORE, bold=True)
    add_bullets(
        slide.placeholders[1],
        [
            "State the fact in a full sentence.",
            "Separate verified product behavior from plans.",
            "Name the gap if the data is incomplete.",
            "Leave a bullet off rather than filling it with filler.",
        ],
    )

    # 6. Two column
    slide = prs.slides.add_slide(prs.slide_layouts[3])
    apply_slide_footer_fields(slide)
    set_box_text(slide.placeholders[0], ["[Compare / split]"], font=FONT_DISPLAY, size=32, color=FORE, bold=True)
    left, right = None, None
    for ph in slide.placeholders:
        if ph.placeholder_format.idx == 1:
            left = ph
        elif ph.placeholder_format.idx == 2:
            right = ph
    if left:
        add_bullets(left, ["Left column heading lives in the title.", "Keep both columns equally full.", "If one side is thin, stack instead."], size=16)
    if right:
        add_bullets(right, ["Right column is a peer, not a caption.", "Same type size as the left.", "End with the implication for the decision."], size=16)

    # 7. Three workstreams (custom cards)
    slide = prs.slides.add_slide(prs.slide_layouts[5])
    apply_slide_footer_fields(slide)
    set_box_text(slide.placeholders[0], ["[Three workstreams]"], font=FONT_DISPLAY, size=32, color=FORE, bold=True)
    w, gap = Inches(3.8), Inches(0.25)
    x0 = Inches(0.72)
    y = Inches(1.55)
    card(slide, x0, y, w, Inches(4.9), "Students & families", "Discover, track, reminders, and the next action for each child. Not a feature tour.")
    card(slide, x0 + w + gap, y, w, Inches(4.9), "Club / team", "Roster → travel or host → attendance → results → season report. Copy says Club/Team.")
    card(slide, x0 + 2 * (w + gap), y, w, Inches(4.9), "School / district", "Provision schools, hand off, host school and district events, family RSVP, aggregate reports.")

    # 8. Decision
    slide = prs.slides.add_slide(prs.slide_layouts[5])
    apply_slide_footer_fields(slide)
    set_box_text(slide.placeholders[0], ["Decision needed"], font=FONT_DISPLAY, size=32, color=FORE, bold=True)
    panel = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.72), Inches(1.55), Inches(11.9), Inches(2.15))
    _set_solid(panel, ACCENT_SOFT)
    try:
        panel.adjustments[0] = 0.04
    except Exception:
        pass
    add_textbox(
        slide, Inches(0.98), Inches(1.75), Inches(11.4), Inches(0.35),
        ["THE CHOICE"], font=FONT_SANS, size=12, color=RED, bold=True,
    )
    add_textbox(
        slide, Inches(0.98), Inches(2.12), Inches(11.4), Inches(1.3),
        ["[Write the decision as a sentence a person can say yes or no to.]"],
        font=FONT_DISPLAY, size=22, color=FORE, bold=True,
    )
    card(slide, Inches(0.72), Inches(3.9), Inches(5.8), Inches(2.55), "If we do it", "[What changes in the product or the pilot. Owner. Date.]")
    card(
        slide, Inches(6.82), Inches(3.9), Inches(5.8), Inches(2.55),
        "If we wait", "[What stays true. What gets worse. Who is blocked.]",
        bar_color=BLUE, label_color=BLUE_STRONG,
    )

    # 9. Principle / quote
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    apply_slide_footer_fields(slide)
    add_textbox(
        slide, Inches(0.72), Inches(0.55), Inches(11.9), Inches(0.35),
        ["PRINCIPLE"], font=FONT_SANS, size=12, color=RED, bold=True,
    )
    add_textbox(
        slide, Inches(0.72), Inches(2.15), Inches(11.6), Inches(2.4),
        ["Connecting talent to opportunity should not depend on zip code, insider knowledge, or a polished-looking product we have not actually built."],
        font=FONT_DISPLAY, size=28, color=FORE, bold=True,
    )
    add_textbox(
        slide, Inches(0.72), Inches(4.85), Inches(11.6), Inches(0.8),
        ["Use this layout for a constraint the room has to keep, not for decoration."],
        font=FONT_SANS, size=16, color=MUTED,
    )

    # 10. Status table
    slide = prs.slides.add_slide(prs.slide_layouts[5])
    apply_slide_footer_fields(slide)
    set_box_text(slide.placeholders[0], ["Status"], font=FONT_DISPLAY, size=32, color=FORE, bold=True)
    rows, cols = 5, 4
    table_shape = slide.shapes.add_table(rows, cols, Inches(0.72), Inches(1.55), Inches(11.9), Inches(4.85))
    table = table_shape.table
    table.columns[0].width = Inches(2.6)
    table.columns[1].width = Inches(2.2)
    table.columns[2].width = Inches(4.4)
    table.columns[3].width = Inches(2.7)
    data = [
        ["Surface", "State", "What is true", "Owner"],
        ["Chess discovery", "Usable", "Search works; coverage is still incomplete", "[name]"],
        ["Other competition types", "Thin", "Few official sources; expect sparse results", "[name]"],
        ["Club / team workspace", "In progress", "Walk roster through results, not a public directory", "[name]"],
        ["District workspace", "Assisted pilot", "No self-serve district signup; reports fail closed", "[name]"],
    ]
    for r in range(rows):
        for c in range(cols):
            table.cell(r, c).text = data[r][c]
    style_table(table, rows, cols)

    # 11. Next actions
    slide = prs.slides.add_slide(prs.slide_layouts[1])
    apply_slide_footer_fields(slide)
    set_box_text(slide.placeholders[0], ["Next actions"], font=FONT_DISPLAY, size=32, color=FORE, bold=True)
    add_bullets(
        slide.placeholders[1],
        [
            "[Owner]  ·  [action]  ·  [date]",
            "[Owner]  ·  [action]  ·  [date]",
            "[Owner]  ·  [action]  ·  [date]",
            "Write the first concrete step, not a theme.",
        ],
    )

    # 12. Close
    slide = prs.slides.add_slide(prs.slide_layouts[2])
    apply_slide_footer_fields(slide)
    slide.shapes.add_picture(str(assets["lockup"]), Inches(0.72), Inches(1.55), height=Inches(0.48))
    set_box_text(slide.placeholders[0], ["[What happens next]"], font=FONT_DISPLAY, size=36, color=FORE, bold=True)
    # Move title down a bit after lockup
    slide.placeholders[0].top = Inches(2.35)
    set_box_text(
        slide.placeholders[1],
        ["Internal. Questions stay in this room until they have an owner."],
        font=FONT_SANS, size=18, color=MUTED,
    )


def to_potx(pptx_path: Path, potx_path: Path) -> None:
    old = b"application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"
    new = b"application/vnd.openxmlformats-officedocument.presentationml.template.main+xml"
    buf = BytesIO()
    with zipfile.ZipFile(pptx_path, "r") as src, zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as dst:
        for item in src.infolist():
            data = src.read(item.filename)
            if item.filename == "[Content_Types].xml":
                data = data.replace(old, new)
            dst.writestr(item, data)
    potx_path.write_bytes(buf.getvalue())


def main() -> None:
    assets = write_assets()
    prs = Presentation()
    prs.slide_width = SLIDE_W
    prs.slide_height = SLIDE_H
    prs.core_properties.title = "Causey Internal"
    prs.core_properties.subject = "Internal working deck"
    prs.core_properties.author = "Causey"
    prs.core_properties.comments = "Internal use only. Not for external distribution."
    patch_theme(prs)
    patch_master_text_styles(prs)
    add_master_chrome(prs, assets)
    style_layouts(prs)
    build_sample_slides(prs, assets)

    pptx_path = ROOT / "Causey Internal.pptx"
    potx_path = ROOT / "Causey Internal.potx"
    prs.save(str(pptx_path))
    to_potx(pptx_path, potx_path)
    print(f"Wrote {pptx_path}")
    print(f"Wrote {potx_path}")


if __name__ == "__main__":
    main()
