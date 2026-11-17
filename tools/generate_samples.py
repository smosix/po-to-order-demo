"""Generate the sample purchase-order PDFs used by the demo.

All companies, people, addresses, phone numbers and prices are fictional.
Phone numbers use Ofcom's drama ranges (UK) or 555 numbers.

Usage (needs reportlab + pillow; macOS system fonts are used for variety):
    python tools/generate_samples.py
"""
import math
import os
import random

from PIL import Image, ImageDraw, ImageFilter, ImageFont
from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (KeepTogether, PageBreak, Paragraph, SimpleDocTemplate,
                                Spacer, Table, TableStyle)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "samples")
SUPP = "/System/Library/Fonts/Supplemental/"

for name, file in [("Arial", "Arial.ttf"), ("Arial-Bold", "Arial Bold.ttf"),
                   ("Georgia", "Georgia.ttf"), ("Georgia-Bold", "Georgia Bold.ttf"),
                   ("Verdana", "Verdana.ttf"), ("Verdana-Bold", "Verdana Bold.ttf")]:
    pdfmetrics.registerFont(TTFont(name, SUPP + file))
for fam in ("Arial", "Georgia", "Verdana"):
    pdfmetrics.registerFontFamily(fam, normal=fam, bold=fam + "-Bold", italic=fam, boldItalic=fam + "-Bold")


def S(font="Arial", size=9, leading=None, color=colors.black, align=0, bold=False):
    return ParagraphStyle("s", fontName=font + ("-Bold" if bold else ""), fontSize=size,
                          leading=leading or size * 1.3, textColor=color, alignment=align)


def eur(v):
    return f"€{v:,.2f}"


def gbp(v):
    return f"£{v:,.2f}"


def nl_eur(v):
    s = f"{v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return f"€ {s}"


# --------------------------------------------------------------------------------------
# 1. Brightwater Security Systems: clean, modern PO (EUR)
# --------------------------------------------------------------------------------------
def brightwater():
    path = os.path.join(OUT, "01-brightwater-cctv-po.pdf")
    navy = colors.HexColor("#0E3A5B")
    teal = colors.HexColor("#1BA39C")
    doc = SimpleDocTemplate(path, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm,
                            topMargin=16 * mm, bottomMargin=16 * mm,
                            title="Purchase Order BWS-PO-24117", author="Brightwater Security Systems Ltd")
    st = []
    logo = Table([[Paragraph("BRIGHTWATER", S("Verdana", 17, bold=True, color=navy)),
                   Paragraph("PURCHASE ORDER", S("Verdana", 18, bold=True, color=teal, align=TA_RIGHT))],
                  [Paragraph("Security Systems Ltd", S("Verdana", 9, color=navy)), ""]],
                 colWidths=[95 * mm, 79 * mm])
    logo.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("BOTTOMPADDING", (0, 0), (-1, -1), 0)]))
    st += [logo, Spacer(1, 3 * mm)]
    st.append(Paragraph("Unit 7, Ballymount Business Park, Dublin 12, D12 X9K4 &nbsp;|&nbsp; Tel +353 1 555 0142 &nbsp;|&nbsp; "
                        "accounts@brightwatersecurity.ie &nbsp;|&nbsp; VAT IE 3345678QH", S("Arial", 8, color=colors.grey)))
    st.append(Spacer(1, 6 * mm))

    meta = [
        ["PO Number", "BWS-PO-24117", "Supplier", "Fortus – Dublin Branch"],
        ["PO Date", "12/11/2026", "Supplier A/C", "C10421"],
        ["Required By", "20/11/2026", "Buyer", "Aoife Brennan"],
        ["Job / Project", "Clontarf Medical Centre – CCTV upgrade", "Email", "aoife.brennan@brightwatersecurity.ie"],
    ]
    t = Table([[Paragraph(f"<b>{a}</b>", S(size=8.5, color=navy)), Paragraph(b, S(size=8.5)),
                Paragraph(f"<b>{c}</b>", S(size=8.5, color=navy)), Paragraph(d, S(size=8.5))] for a, b, c, d in meta],
              colWidths=[26 * mm, 62 * mm, 24 * mm, 62 * mm])
    t.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), 0.6, navy), ("INNERGRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#C9D6E0")),
                           ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#EEF4F8")),
                           ("BACKGROUND", (2, 0), (2, -1), colors.HexColor("#EEF4F8")),
                           ("VALIGN", (0, 0), (-1, -1), "MIDDLE")]))
    st += [t, Spacer(1, 5 * mm)]

    addr = Table([[Paragraph("<b>DELIVER TO</b>", S(size=8, color=teal)), Paragraph("<b>INVOICE TO</b>", S(size=8, color=teal))],
                  [Paragraph("Brightwater Security Systems Ltd<br/>Unit 7, Ballymount Business Park<br/>Ballymount Road Upper<br/>Dublin 12, D12 X9K4<br/>"
                             "<i>Goods-in open 08:00 – 16:30, Mon–Fri</i>", S(size=9)),
                   Paragraph("Accounts Payable<br/>Brightwater Security Systems Ltd<br/>Unit 7, Ballymount Business Park<br/>Dublin 12, D12 X9K4", S(size=9))]],
                 colWidths=[87 * mm, 87 * mm])
    addr.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0)]))
    st += [addr, Spacer(1, 6 * mm)]

    lines = [
        ("DS-2CD2347G2-LU", "Hikvision 4MP ColorVu Turret 2.8mm c/w mic", 10, 139.00),
        ("DS-2CD2T47G2-L", "Hikvision 4MP ColorVu Bullet 4mm", 4, 149.00),
        ("DS-1280ZJ-XS", "Junction box to suit turret", 10, 12.00),
        ("DS-7616NXI-K2/16P", "Hikvision 16ch AcuSense NVR 16 x PoE", 1, 459.00),
        ("ST8000VE001", "Seagate SkyHawk AI 8TB HDD", 2, 229.00),
        ("CAT6-EXT-305", "CAT6 External PE Black 305m box", 2, 169.00),
        ("DS-D5022FN-C", "Hikvision 22\" monitor", 1, 129.00),
    ]
    head = ["#", "Part No.", "Description", "Qty", "Unit Price", "Total"]
    rows = [head] + [[str(i + 1), p, Paragraph(d, S(size=8.5)), str(q), eur(u), eur(q * u)] for i, (p, d, q, u) in enumerate(lines)]
    sub = sum(q * u for _, _, q, u in lines)
    vat = round(sub * 0.23, 2)
    lt = Table(rows, colWidths=[8 * mm, 36 * mm, 70 * mm, 12 * mm, 23 * mm, 25 * mm], repeatRows=1)
    lt.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), navy), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                            ("FONTNAME", (0, 0), (-1, 0), "Arial-Bold"), ("FONTNAME", (0, 1), (-1, -1), "Arial"),
                            ("FONTSIZE", (0, 0), (-1, -1), 8.5), ("ALIGN", (3, 0), (-1, -1), "RIGHT"),
                            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F5F8FA")]),
                            ("LINEBELOW", (0, -1), (-1, -1), 0.6, navy), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                            ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
    st += [lt, Spacer(1, 3 * mm)]
    tot = Table([["Subtotal (excl. VAT)", eur(sub)], ["VAT @ 23%", eur(vat)], ["TOTAL", eur(sub + vat)]],
                colWidths=[45 * mm, 28 * mm], hAlign="RIGHT")
    tot.setStyle(TableStyle([("FONTNAME", (0, 0), (-1, -1), "Arial"), ("FONTSIZE", (0, 0), (-1, -1), 9),
                             ("ALIGN", (1, 0), (1, -1), "RIGHT"), ("FONTNAME", (0, 2), (-1, 2), "Arial-Bold"),
                             ("BACKGROUND", (0, 2), (-1, 2), colors.HexColor("#EEF4F8")), ("LINEABOVE", (0, 2), (-1, 2), 0.8, navy)]))
    st += [tot, Spacer(1, 8 * mm)]
    st.append(Paragraph("<b>Notes</b>", S(size=9, color=navy)))
    st.append(Paragraph("Please quote PO number BWS-PO-24117 on all delivery dockets and invoices. Payment terms 30 days end of month "
                        "as per account. Contact Aoife on +353 1 555 0142 with any queries or substitutions — no substitutions without approval.",
                        S(size=8.5)))
    st.append(Spacer(1, 12 * mm))
    st.append(Paragraph("<font name='Georgia' size='14' color='#0E3A5B'><i>A. Brennan</i></font><br/>"
                        "<font size='8' color='grey'>Authorised signature – Aoife Brennan, Purchasing</font>", S(size=8)))
    doc.build(st)


# --------------------------------------------------------------------------------------
# 2. Northpoint Fire Protection: older, boxy layout; loose descriptions; site delivery (GBP)
# --------------------------------------------------------------------------------------
def northpoint():
    path = os.path.join(OUT, "02-northpoint-fire-site-delivery.pdf")
    red = colors.HexColor("#9B1C1C")
    doc = SimpleDocTemplate(path, pagesize=A4, leftMargin=15 * mm, rightMargin=15 * mm, topMargin=14 * mm, bottomMargin=14 * mm,
                            title="Order NFP/0876", author="Northpoint Fire Protection Ltd")
    st = []
    head = Table([[Paragraph("NORTHPOINT<br/><font size='10'>FIRE PROTECTION LTD</font>", S("Georgia", 20, 22, bold=True, color=red)),
                   Paragraph("22 Cobden Street<br/>Salford, Manchester M6 6WF<br/>T: 0161 496 0876<br/>purchasing@northpointfire.co.uk<br/>"
                             "VAT Reg: GB 287 4410 93", S("Georgia", 8.5, align=TA_RIGHT))]], colWidths=[100 * mm, 80 * mm])
    st += [head, Spacer(1, 4 * mm)]
    bar = Table([["OFFICIAL ORDER"]], colWidths=[180 * mm])
    bar.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#333333")), ("TEXTCOLOR", (0, 0), (-1, -1), colors.white),
                             ("FONTNAME", (0, 0), (-1, -1), "Georgia-Bold"), ("FONTSIZE", (0, 0), (-1, -1), 13), ("ALIGN", (0, 0), (-1, -1), "CENTER")]))
    st += [bar, Spacer(1, 4 * mm)]
    box = Table([
        [Paragraph("<b>To:</b> Fortus Ltd, Manchester branch<br/>Attn: Trade Counter / Sales", S("Georgia", 9)),
         Paragraph("<b>Order No:</b> NFP/0876<br/><b>Date:</b> 10 Nov 2026<br/><b>Your Quote:</b> Q-MAN-55210<br/>"
                   "<b>Contract:</b> TPLH Unit 4 – L2 fire alarm", S("Georgia", 9))],
        [Paragraph("<b>DELIVER TO SITE:</b><br/>Trafford Park Logistics Hub – Unit 4<br/>Westinghouse Road<br/>Trafford Park, Manchester<br/>M17 1PJ",
                   S("Georgia", 9)),
         Paragraph("<b>Delivery required:</b> w/c 23/11/2026<br/><b>Site contact:</b> Dave Hughes 07700 900123<br/>"
                   "<b>!! NO DELIVERIES BEFORE 8AM !!</b><br/>Tail-lift vehicle required. Ring site 30 mins before arrival.",
                   S("Georgia", 9))],
    ], colWidths=[90 * mm, 90 * mm])
    box.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.8, colors.black), ("VALIGN", (0, 0), (-1, -1), "TOP"),
                             ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5)]))
    st += [box, Spacer(1, 5 * mm)]
    lines = [
        ("NFP-ESP-OPT", "Hochiki ESP optical heads", 48, 36.50),
        ("NFP-BASE", "Std bases to suit above", 48, 6.50),
        ("NFP-ESP-HEAT", "ESP heat heads (kitchen / plant rm)", 6, 36.00),
        ("NFP-MCP", "Addressable MCPs red", 12, 33.00),
        ("NFP-SNDR", "Sounder bases", 20, 42.00),
        ("NFP-PANEL", "MxPro 5 single loop panel", 1, None),
        ("NFP-FP200", "FP200 red 1.5 2c x 100m drums", 8, 109.00),
        ("NFP-BATT", "Batts 12v 7Ah (panel standby)", 2, 16.00),
    ]
    rows = [["Our Code", "Description", "Qty", "Price", "Value"]]
    for code, d, q, u in lines:
        rows.append([code, d, str(q), gbp(u) if u else "As quoted", gbp(q * u) if u else "—"])
    sub = sum(q * u for _, _, q, u in lines if u)
    rows += [["", "", "", "Goods total", gbp(sub)], ["", "Panel price as per quote Q-MAN-55210. VAT to be added at standard rate.", "", "", ""]]
    t = Table(rows, colWidths=[28 * mm, 92 * mm, 14 * mm, 22 * mm, 24 * mm])
    t.setStyle(TableStyle([("FONTNAME", (0, 0), (-1, -1), "Georgia"), ("FONTSIZE", (0, 0), (-1, -1), 9),
                           ("FONTNAME", (0, 0), (-1, 0), "Georgia-Bold"), ("GRID", (0, 0), (-1, -3), 0.5, colors.black),
                           ("ALIGN", (2, 0), (-1, -1), "RIGHT"), ("FONTNAME", (3, -2), (-1, -2), "Georgia-Bold"),
                           ("BOX", (3, -2), (-1, -2), 0.8, colors.black), ("FONTSIZE", (0, -1), (-1, -1), 8),
                           ("SPAN", (1, -1), (-1, -1)), ("ALIGN", (1, -1), (-1, -1), "LEFT"), ("TEXTCOLOR", (0, -1), (-1, -1), colors.grey)]))
    st += [t, Spacer(1, 8 * mm)]
    st.append(Paragraph("This order is subject to Northpoint Fire Protection Ltd standard terms. Goods must be delivered complete "
                        "unless agreed in advance. Invoices without our order number will be returned unpaid.", S("Georgia", 8, color=colors.grey)))
    st.append(Spacer(1, 10 * mm))
    st.append(Paragraph("Ordered by: <b>Lisa Chen</b> – Purchasing &nbsp;&nbsp; lisa.chen@northpointfire.co.uk &nbsp;&nbsp; 0161 496 0877", S("Georgia", 9)))
    doc.build(st)


# --------------------------------------------------------------------------------------
# 3. Seán Kelly Alarms: handwritten on a carbon order pad, phone-scanned (image only)
# --------------------------------------------------------------------------------------
def kelly():
    path = os.path.join(OUT, "03-kelly-handwritten-scan.pdf")
    W, H = 1240, 1754  # A4 @150dpi
    paper = Image.new("RGB", (W, H), (250, 248, 240))
    d = ImageDraw.Draw(paper)
    serif = ImageFont.truetype(SUPP + "Georgia.ttf", 30)
    serif_b = ImageFont.truetype(SUPP + "Georgia Bold.ttf", 46)
    small = ImageFont.truetype(SUPP + "Arial.ttf", 22)
    hand = ImageFont.truetype(SUPP + "Bradley Hand Bold.ttf", 36)
    hand_s = ImageFont.truetype(SUPP + "Bradley Hand Bold.ttf", 34)
    ink = (28, 42, 110)
    pre = (170, 40, 40)

    d.text((90, 80), "SEÁN KELLY ALARMS", font=serif_b, fill=pre)
    d.text((90, 140), "Intruder • CCTV • Access   |   Ballincollig, Co. Cork   |   087 555 0193", font=small, fill=pre)
    d.text((W - 330, 80), "ORDER", font=serif_b, fill=pre)
    d.text((W - 330, 140), "Nº 0347", font=ImageFont.truetype(SUPP + "Georgia Bold.ttf", 34), fill=(200, 30, 30))
    d.line((90, 190, W - 90, 190), fill=pre, width=3)
    for i, label in enumerate(["To:", "Date:", "Job:"]):
        y = 230 + i * 70
        d.text((90, y), label, font=serif, fill=pre)
        d.line((200, y + 38, W - 90, y + 38), fill=(200, 160, 160), width=2)
    d.text((215, 215), "Fortus — Cork", font=hand, fill=ink)
    d.text((215, 285), "16/11/26", font=hand, fill=ink)
    d.text((215, 355), "O'Driscoll house - Ballincollig", font=hand, fill=ink)
    # grid
    top = 470
    d.rectangle((90, top, W - 90, top + 60), outline=pre, width=2)
    for x, label in [(110, "QTY"), (260, "DESCRIPTION"), (W - 260, "PRICE")]:
        d.text((x, top + 14), label, font=small, fill=pre)
    for x in (230, W - 280):
        d.line((x, top, x, top + 60 + 14 * 62), fill=pre, width=2)
    for r in range(15):
        y = top + 60 + r * 62
        d.line((90, y, W - 90, y), fill=(215, 170, 170), width=1)
    d.rectangle((90, top, W - 90, top + 60 + 14 * 62), outline=pre, width=2)
    items = [("2", "Enforcer 32 wireless panels (app ones)"),
             ("10", "wireless PIRs"),
             ("6", "door contacts - wireless mini"),
             ("2", "Deltabell sirens"),
             ("4", "keyfobs"),
             ("1", "4G comms module")]
    for i, (q, desc) in enumerate(items):
        y = top + 60 + i * 62 + 8
        d.text((130 + random.randint(-6, 6), y), q, font=hand, fill=ink)
        d.text((255 + random.randint(-4, 8), y + random.randint(-3, 3)), desc, font=hand, fill=ink)
    yb = top + 60 + 8 * 62 + 10
    d.text((255, yb), "Will collect from Cork branch", font=hand_s, fill=ink)
    d.text((255, yb + 52), "Friday morning - thanks!", font=hand_s, fill=ink)
    d.text((90, H - 240), "Signed:", font=serif, fill=pre)
    d.line((220, H - 200, 700, H - 200), fill=(200, 160, 160), width=2)
    d.text((240, H - 262), "Seán K.", font=ImageFont.truetype(SUPP + "Bradley Hand Bold.ttf", 56), fill=ink)
    d.text((90, H - 140), "White copy: supplier   Yellow copy: office   Pink copy: book", font=small, fill=(190, 120, 120))

    # make it look like a phone scan: rotate, shadow, noise, blur, uneven lighting
    rot = paper.rotate(-1.6, resample=Image.BICUBIC, expand=True, fillcolor=(120, 118, 112))
    bg = Image.new("RGB", (rot.width + 80, rot.height + 80), (95, 92, 88))
    bg.paste(rot, (46, 30))
    px = bg.load()
    rnd = random.Random(7)
    for y in range(0, bg.height):
        shade = 1.0 - 0.10 * (y / bg.height)
        for x in range(0, bg.width, 1):
            r, g, b = px[x, y]
            s = shade - 0.07 * (x / bg.width) + rnd.uniform(-0.035, 0.035)
            px[x, y] = (max(0, min(255, int(r * s))), max(0, min(255, int(g * s))), max(0, min(255, int(b * s))))
    bg = bg.filter(ImageFilter.GaussianBlur(0.7)).convert("L").convert("RGB")
    bg.save(path, "PDF", resolution=150.0, quality=70)


# --------------------------------------------------------------------------------------
# 4. Meridian Access Solutions: 2-page project PO, phased delivery, arithmetic error (GBP)
# --------------------------------------------------------------------------------------
def meridian():
    path = os.path.join(OUT, "04-meridian-access-project-po.pdf")
    purple = colors.HexColor("#3B2A6B")
    light = colors.HexColor("#EEEAF6")

    def on_page(c, doc):
        c.saveState()
        c.setFillColor(purple)
        c.rect(0, A4[1] - 12 * mm, A4[0], 12 * mm, stroke=0, fill=1)
        c.setFillColor(colors.white)
        c.setFont("Verdana-Bold", 9)
        c.drawString(15 * mm, A4[1] - 8 * mm, "MERIDIAN ACCESS SOLUTIONS LTD")
        c.setFont("Verdana", 8)
        c.drawRightString(A4[0] - 15 * mm, A4[1] - 8 * mm, f"Purchase Order MAS-10452  •  Page {doc.page} of 2")
        c.setFillColor(colors.grey)
        c.setFont("Verdana", 7)
        c.drawCentredString(A4[0] / 2, 9 * mm, "Meridian Access Solutions Ltd • Registered in England No. 09876543 • Unit 12, Heartlands Business Park, Birmingham B7 5QR")
        c.restoreState()

    doc = SimpleDocTemplate(path, pagesize=A4, leftMargin=15 * mm, rightMargin=15 * mm, topMargin=20 * mm, bottomMargin=16 * mm,
                            title="Purchase Order MAS-10452", author="Meridian Access Solutions Ltd")
    st = [Paragraph("Purchase Order", S("Verdana", 20, bold=True, color=purple)), Spacer(1, 3 * mm)]
    info = Table([
        [Paragraph("<b>PO number</b><br/>MAS-10452", S("Verdana", 8.5)), Paragraph("<b>Date</b><br/>09/11/2026", S("Verdana", 8.5)),
         Paragraph("<b>Supplier quote</b><br/>Q-BHM-30981", S("Verdana", 8.5)), Paragraph("<b>Currency</b><br/>GBP", S("Verdana", 8.5))],
        [Paragraph("<b>Supplier</b><br/>Fortus, Birmingham<br/>Account C30112", S("Verdana", 8.5)),
         Paragraph("<b>Project</b><br/>Aston Science Park – Block C access control", S("Verdana", 8.5)),
         Paragraph("<b>Buyer</b><br/>Raj Patel<br/>procurement@meridianaccess.co.uk<br/>0121 496 0187", S("Verdana", 8.5)),
         Paragraph("<b>Terms</b><br/>30 days EOM", S("Verdana", 8.5))],
    ], colWidths=[45 * mm] * 4)
    info.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), light), ("VALIGN", (0, 0), (-1, -1), "TOP"),
                              ("LINEBELOW", (0, 0), (-1, 0), 0.5, colors.white), ("TOPPADDING", (0, 0), (-1, -1), 5),
                              ("BOTTOMPADDING", (0, 0), (-1, -1), 5)]))
    st += [info, Spacer(1, 4 * mm)]
    st.append(Paragraph("<b>Delivery address:</b> Meridian Access Solutions Ltd, Unit 12, Heartlands Business Park, Birmingham B7 5QR", S("Verdana", 8.5)))
    st.append(Spacer(1, 1.5 * mm))
    st.append(Paragraph("<b>Delivery schedule:</b> PHASE 1 (lines 1–6) required by <b>24/11/2026</b>. PHASE 2 (lines 7–13) required by "
                        "<b>08/12/2026</b>. Part deliveries accepted — please mark phase on delivery note.", S("Verdana", 8.5)))
    st.append(Spacer(1, 4 * mm))
    lines = [
        ("1", "682-531", "Paxton Net2 Plus 1 door controller, boxed PSU", 8, 329.00),
        ("1", "P75", "Paxton P75 proximity reader", 12, 75.00),
        ("1", "KP75", "Paxton KP75 keypad/prox reader", 4, 99.00),
        ("1", "ML600-M", "Maglock 600lb monitored c/w bracket", 8, 49.00),
        ("1", "BG-GRN-DP", "Green break glass double pole", 8, 16.00),
        ("1", "NT-EXIT", "No-touch exit button s/s", 8, 24.00),
        ("2", "692-052", "Paxton Net2 keyfobs (packs of 10)", 15, 33.00),
        ("2", "692-448", "Paxton Net2 ISO cards (packs of 10)", 10, 25.00),
        ("2", "NET2PRO", "Net2 Pro software licence", 1, 169.00),
        ("2", "337-110", "Net2 Entry standard kit", 2, 509.00),
        ("2", "CAT6-LSZH", "CAT6 LSZH grey 305m", 4, 109.00),
        ("2", "6C-100", "6 core alarm cable 100m", 6, 25.00),
        ("2", "EL560", "Abloy EL560 electric lock (fire exit doors)", 2, 185.00),
    ]
    rows = [["Ln", "Ph", "Item", "Description", "Qty", "Unit £", "Line £"]]
    for i, (ph, item, desc, q, u) in enumerate(lines):
        rows.append([str(i + 1), ph, item, Paragraph(desc, S("Verdana", 7.5)), str(q), f"{u:,.2f}", f"{q * u:,.2f}"])
    t = Table(rows, colWidths=[8 * mm, 8 * mm, 22 * mm, 82 * mm, 12 * mm, 18 * mm, 20 * mm], repeatRows=1)
    t.setStyle(TableStyle([("FONTNAME", (0, 0), (-1, -1), "Verdana"), ("FONTSIZE", (0, 0), (-1, -1), 7.5),
                           ("FONTNAME", (0, 0), (-1, 0), "Verdana-Bold"), ("TEXTCOLOR", (0, 0), (-1, 0), purple),
                           ("LINEBELOW", (0, 0), (-1, 0), 1, purple), ("LINEBELOW", (0, 1), (-1, -1), 0.25, colors.HexColor("#CCCCCC")),
                           ("ALIGN", (4, 0), (-1, -1), "RIGHT"), ("VALIGN", (0, 0), (-1, -1), "MIDDLE")]))
    st += [t, Spacer(1, 3 * mm)]
    # NOTE: printed subtotal deliberately contains a transposition error (true sum is 7,528.00)
    printed_sub = 7582.00
    tot = Table([["Subtotal", f"£{printed_sub:,.2f}"], ["VAT 20%", f"£{printed_sub * 0.2:,.2f}"], ["Order total", f"£{printed_sub * 1.2:,.2f}"]],
                colWidths=[35 * mm, 28 * mm], hAlign="RIGHT")
    tot.setStyle(TableStyle([("FONTNAME", (0, 0), (-1, -1), "Verdana"), ("FONTSIZE", (0, 0), (-1, -1), 8.5),
                             ("ALIGN", (1, 0), (1, -1), "RIGHT"), ("FONTNAME", (0, 2), (-1, 2), "Verdana-Bold"),
                             ("LINEABOVE", (0, 2), (-1, 2), 1, purple)]))
    st += [tot, Spacer(1, 8 * mm)]
    st.append(KeepTogether([Paragraph("Authorised: <b>Raj Patel</b>, Operations Director", S("Verdana", 8.5)),
                            Paragraph("<font name='Georgia' size='16' color='#3B2A6B'><i>R. Patel</i></font>", S("Verdana", 8.5, 22))]))
    st.append(PageBreak())
    st.append(Paragraph("Terms &amp; Conditions of Purchase", S("Verdana", 13, bold=True, color=purple)))
    st.append(Spacer(1, 3 * mm))
    terms = [
        "This Purchase Order (PO) number must appear on all delivery notes, invoices and correspondence. Invoices without a valid PO number will be returned.",
        "Prices are as per the supplier quotation referenced overleaf and are fixed for the duration of this order.",
        "Goods must be delivered to the address stated on page 1 between 08:00 and 16:00, Monday to Friday, unless otherwise agreed in writing.",
        "Part deliveries are accepted for phased projects only. Each delivery note must state the project phase.",
        "No substitution of products, brands or part numbers is permitted without written approval from the buyer.",
        "Risk passes on delivery; title passes on payment. Damaged goods must be reported within 48 hours of receipt.",
        "Payment terms: 30 days from end of month of invoice, subject to receipt of a valid invoice.",
        "The supplier shall comply with all applicable laws including the Modern Slavery Act 2015 and relevant product standards (EN 60839 / EN 54 where applicable).",
        "Meridian Access Solutions Ltd may cancel any undelivered portion of this order with 14 days' written notice.",
        "This order is governed by the laws of England and Wales.",
    ]
    for i, term in enumerate(terms):
        st.append(Paragraph(f"<b>{i + 1}.</b> {term}", S("Verdana", 8.5, 13)))
        st.append(Spacer(1, 2 * mm))
    doc.build(st, onFirstPage=on_page, onLaterPages=on_page)


# --------------------------------------------------------------------------------------
# 5. Kingdom Gates: an email order, printed to PDF (EUR, no prices)
# --------------------------------------------------------------------------------------
def kingdom():
    path = os.path.join(OUT, "05-kingdom-gates-email-order.pdf")
    doc = SimpleDocTemplate(path, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=14 * mm, bottomMargin=14 * mm,
                            title="Order - Roger kit for Kenmare job", author="Mike Doyle")
    st = []
    st.append(Paragraph("Mail – salescork@fortus.ie", S("Arial", 7.5, color=colors.grey)))
    st.append(Spacer(1, 2 * mm))
    st.append(Paragraph("Order - Roger kit for Kenmare job / PO KGA-2291", S("Arial", 15, bold=True)))
    st.append(Spacer(1, 3 * mm))
    hdr = Table([
        ["From:", "Mike Doyle <mike@kingdomgates.ie>"],
        ["To:", "salescork@fortus.ie"],
        ["Date:", "Monday, 16 November 2026 at 08:47"],
    ], colWidths=[16 * mm, 150 * mm])
    hdr.setStyle(TableStyle([("FONTNAME", (0, 0), (0, -1), "Arial-Bold"), ("FONTNAME", (1, 0), (1, -1), "Arial"),
                             ("FONTSIZE", (0, 0), (-1, -1), 9), ("TEXTCOLOR", (0, 0), (0, -1), colors.grey),
                             ("LINEBELOW", (0, -1), (-1, -1), 0.5, colors.HexColor("#DDDDDD")), ("BOTTOMPADDING", (0, -1), (-1, -1), 8)]))
    st += [hdr, Spacer(1, 5 * mm)]
    body = S("Arial", 10.5, 15.5)
    for p in [
        "Hi lads,",
        "Can ye send out the following for Thursday please, it's for the job in Kenmare:",
        "&nbsp;&nbsp;– 1 x Roger brushless swing kit (2 leaves, about 2.5m each)<br/>"
        "&nbsp;&nbsp;– 2 pair of photocells<br/>"
        "&nbsp;&nbsp;– 6 remotes (the 2 button ones)<br/>"
        "&nbsp;&nbsp;– 1 flashing light<br/>"
        "&nbsp;&nbsp;– 1 key switch<br/>"
        "&nbsp;&nbsp;– 1 box of the outdoor cat6",
        "Our PO is KGA-2291, put it on the usual account.",
        "Deliver to the yard in Tralee please (Unit 3, Clash Industrial Estate, Tralee, Co. Kerry, V92 T6K2). If the driver is coming "
        "after 4 ring me on 087 555 0164 as the gate will be locked.",
        "Also can you price up 2 x 12V 7Ah batteries for the backup board — not ordering them yet, just want a price.",
        "Thanks,<br/>Mike",
    ]:
        st.append(Paragraph(p, body))
        st.append(Spacer(1, 3 * mm))
    st.append(Spacer(1, 3 * mm))
    st.append(Paragraph("<b>Mike Doyle</b> | Kingdom Gates &amp; Automation<br/>Tralee, Co. Kerry | 087 555 0164 | www.kingdomgates.ie",
                        S("Arial", 8.5, 12, color=colors.HexColor("#2E7D32"))))
    st.append(Spacer(1, 6 * mm))
    st.append(Paragraph("Sent from my iPhone", S("Arial", 8, color=colors.grey)))
    doc.build(st)


# --------------------------------------------------------------------------------------
# 6. VeiligWerk Beveiliging: Dutch-language PO with Dutch number formats (EUR)
# --------------------------------------------------------------------------------------
def veiligwerk():
    path = os.path.join(OUT, "06-veiligwerk-dutch-po.pdf")
    orange = colors.HexColor("#E2620F")
    doc = SimpleDocTemplate(path, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=16 * mm, bottomMargin=16 * mm,
                            title="Inkooporder IO-2026-0412", author="VeiligWerk Beveiliging B.V.")
    st = []
    head = Table([[Paragraph("<font color='#E2620F'>■</font> VeiligWerk<br/><font size='9' color='#555555'>Beveiliging B.V.</font>",
                             S("Arial", 20, 22, bold=True)),
                   Paragraph("<b>INKOOPORDER</b>", S("Arial", 18, color=orange, align=TA_RIGHT))]], colWidths=[100 * mm, 74 * mm])
    st += [head, Spacer(1, 5 * mm)]
    meta = Table([
        [Paragraph("<b>Leverancier</b><br/>Fortus<br/>t.a.v. Verkoop / Export", S(size=8.5)),
         Paragraph("<b>Factuuradres</b><br/>VeiligWerk Beveiliging B.V.<br/>Ravenswade 54<br/>3439 LD Nieuwegein<br/>Nederland", S(size=8.5)),
         Paragraph("<b>Ordernummer:</b> IO-2026-0412<br/><b>Orderdatum:</b> 13-11-2026<br/><b>Gewenste leverdatum:</b> 27-11-2026<br/>"
                   "<b>Contactpersoon:</b> Jeroen de Vries<br/><b>E-mail:</b> inkoop@veiligwerk.nl<br/><b>Tel:</b> +31 30 555 0412", S(size=8.5))],
    ], colWidths=[48 * mm, 52 * mm, 74 * mm])
    meta.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LINEABOVE", (0, 0), (-1, 0), 2, orange)]))
    st += [meta, Spacer(1, 4 * mm)]
    st.append(Paragraph("<b>Afleveradres (projectlocatie):</b> Kantoorpand De Wissel, Stationsplein 14, 3511 ED Utrecht, Nederland. "
                        "<i>Levering via achteringang, aanmelden bij de receptie.</i>", S(size=8.5)))
    st.append(Spacer(1, 2 * mm))
    st.append(Paragraph("KvK 30184562 &nbsp;•&nbsp; BTW-nr NL001234567B01 &nbsp;•&nbsp; Project: PRJ-2611 De Wissel", S(size=8, color=colors.grey)))
    st.append(Spacer(1, 5 * mm))
    lines = [
        ("DS-2CD2387G2-LU", "Hikvision 8MP ColorVu turretcamera 2,8mm", 6, 189.00),
        ("DS-2CD2143G2-I", "Hikvision 4MP AcuSense domecamera 2,8mm", 8, 119.00),
        ("DS-7616NXI-K2/16P", "Hikvision NVR 16 kanalen met PoE", 1, 489.00),
        ("ST4000VX016", "Harde schijf 4TB surveillance", 2, 119.00),
        ("ENF32WE-APP", "Pyronix Enforcer 32-WE draadloze centrale", 1, 399.00),
        ("KX10DP-WE", "Pyronix draadloze PIR, huisdiervriendelijk", 5, 49.00),
        ("MC1MINI-WE", "Draadloos magneetcontact (mini)", 4, 29.00),
    ]
    rows = [["Pos.", "Artikelnr.", "Omschrijving", "Aantal", "Prijs/st.", "Bedrag"]]
    for i, (a, o, q, p) in enumerate(lines):
        rows.append([str((i + 1) * 10), a, Paragraph(o, S(size=8)), str(q), nl_eur(p), nl_eur(q * p)])
    sub = sum(q * p for _, _, q, p in lines)
    btw = round(sub * 0.21, 2)
    t = Table(rows, colWidths=[11 * mm, 33 * mm, 64 * mm, 14 * mm, 24 * mm, 28 * mm])
    t.setStyle(TableStyle([("FONTNAME", (0, 0), (-1, -1), "Arial"), ("FONTSIZE", (0, 0), (-1, -1), 8),
                           ("FONTNAME", (0, 0), (-1, 0), "Arial-Bold"), ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#FBE9DC")),
                           ("LINEBELOW", (0, 0), (-1, -1), 0.3, colors.HexColor("#DDDDDD")), ("ALIGN", (3, 0), (-1, -1), "RIGHT"),
                           ("VALIGN", (0, 0), (-1, -1), "MIDDLE")]))
    st += [t, Spacer(1, 3 * mm)]
    tot = Table([["Subtotaal", nl_eur(sub)], ["BTW 21%", nl_eur(btw)], ["Totaal", nl_eur(sub + btw)]], colWidths=[35 * mm, 30 * mm], hAlign="RIGHT")
    tot.setStyle(TableStyle([("FONTNAME", (0, 0), (-1, -1), "Arial"), ("FONTSIZE", (0, 0), (-1, -1), 9), ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                             ("FONTNAME", (0, 2), (-1, 2), "Arial-Bold"), ("LINEABOVE", (0, 2), (-1, 2), 1.2, orange)]))
    st += [tot, Spacer(1, 8 * mm)]
    st.append(Paragraph("<b>Opmerkingen</b>", S(size=9)))
    st.append(Paragraph("Graag een orderbevestiging per e-mail sturen naar inkoop@veiligwerk.nl. Ordernummer vermelden op pakbon en factuur. "
                        "Deelleveringen alleen na overleg. Betaling binnen 30 dagen na factuurdatum.", S(size=8.5)))
    doc.build(st)


if __name__ == "__main__":
    random.seed(3)
    os.makedirs(OUT, exist_ok=True)
    for fn in (brightwater, northpoint, kelly, meridian, kingdom, veiligwerk):
        fn()
        print("built", fn.__name__)
