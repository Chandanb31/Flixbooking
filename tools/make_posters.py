"""Generate the original SVG movie posters for FlixBooking.

Usage: python tools/make_posters.py database/seed/movies.json frontend/public/posters
"""
import json
import math
import random
import sys
from pathlib import Path

W, H = 400, 600
SANS = "'Bebas Neue','Oswald','Impact','Arial Narrow Bold',sans-serif"
SERIF = "'Playfair Display','Georgia','DejaVu Serif',serif"
BODY = "'Inter','Segoe UI','Helvetica Neue','DejaVu Sans',sans-serif"


def grad(id_, stops, x2="0", y2="1"):
    s = "".join(f'<stop offset="{o}" stop-color="{c}"/>' for o, c in stops)
    return f'<linearGradient id="{id_}" x1="0" y1="0" x2="{x2}" y2="{y2}">{s}</linearGradient>'


def rgrad(id_, stops, cx=0.5, cy=0.5, r=0.5):
    s = "".join(f'<stop offset="{o}" stop-color="{c}" stop-opacity="{a}"/>' for o, c, a in stops)
    return f'<radialGradient id="{id_}" cx="{cx}" cy="{cy}" r="{r}">{s}</radialGradient>'


# ---------- per-movie artwork ----------

def art_monsoon(r):
    d = [grad("bg", [(0, "#0b1a2b"), (0.6, "#14324d"), (1, "#05090f")])]
    a = ['<rect width="400" height="600" fill="url(#bg)"/>']
    # skyline
    x = 0
    pts = []
    while x < 400:
        w = r.randint(18, 42)
        h = r.randint(90, 260)
        pts.append((x, w, h))
        x += w
    for x, w, h in pts:
        a.append(f'<rect x="{x}" y="{430-h}" width="{w-2}" height="{h+170}" fill="#081420"/>')
        for wy in range(430 - h + 10, 420, 16):
            for wx in range(x + 5, x + w - 6, 9):
                if r.random() < 0.22:
                    a.append(f'<rect x="{wx}" y="{wy}" width="4" height="6" fill="#ffb347" opacity="0.7"/>')
    # red warning glow
    d.append(rgrad("glow", [(0, "#ff2e3b", 0.55), (1, "#ff2e3b", 0)], 0.5, 0.75, 0.6))
    a.append('<rect width="400" height="600" fill="url(#glow)"/>')
    # rain
    for _ in range(260):
        x, y = r.uniform(-50, 420), r.uniform(-20, 600)
        ln = r.uniform(14, 34)
        a.append(f'<line x1="{x:.1f}" y1="{y:.1f}" x2="{x-ln*0.25:.1f}" y2="{y+ln:.1f}" stroke="#9ec9ff" stroke-width="1" opacity="{r.uniform(0.15,0.5):.2f}"/>')
    # lone figure
    a.append('<g fill="#03070c"><circle cx="200" cy="384" r="9"/><path d="M188 396 h24 l6 54 h-10 l-3 40 h-5 l-2-38 h-2 l-2 38 h-5 l-3-40 h-10z"/></g>')
    return d, a, {"title": "#ffffff", "accent": "#ff3b47", "font": SANS}


def art_lighthouse(r):
    d = [grad("bg", [(0, "#04122a"), (0.7, "#0c2a4f"), (1, "#0a1d33")])]
    a = ['<rect width="400" height="600" fill="url(#bg)"/>']
    for _ in range(90):
        a.append(f'<circle cx="{r.uniform(0,400):.0f}" cy="{r.uniform(0,300):.0f}" r="{r.uniform(0.4,1.4):.1f}" fill="#fff" opacity="{r.uniform(0.3,0.9):.2f}"/>')
    d.append(grad("beam", [(0, "#fff6c9"), (1, "#fff6c9")], x2="1", y2="0"))
    d.append('<linearGradient id="beamfade" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#fff3b0" stop-opacity="0.75"/><stop offset="1" stop-color="#fff3b0" stop-opacity="0"/></linearGradient>')
    a.append('<polygon points="262,170 0,90 0,250" fill="url(#beamfade)"/>')
    # cliff
    a.append('<path d="M190 600 L220 300 Q260 280 300 300 L400 330 L400 600Z" fill="#06101d"/>')
    # tower
    a.append('<path d="M245 300 L254 180 L270 180 L279 300Z" fill="#e8e3d6"/>')
    for y in (205, 240, 275):
        a.append(f'<rect x="{247 + (300-y)*0.08:.0f}" y="{y}" width="{30 - (300-y)*0.16 + 2:.0f}" height="12" fill="#b0262d"/>')
    a.append('<rect x="250" y="160" width="24" height="20" fill="#fff3b0"/><path d="M246 160 L262 144 L278 160Z" fill="#1d2633"/>')
    a.append(f'<circle cx="262" cy="170" r="16" fill="#fff6c9" opacity="0.35"/>')
    # sea
    a.append('<rect x="0" y="420" width="400" height="180" fill="#05101f" opacity="0.85"/>')
    for i in range(14):
        y = 430 + i * 12
        a.append(f'<path d="M0 {y} Q50 {y-5} 100 {y} T200 {y} T300 {y} T400 {y}" stroke="#2a5a8a" stroke-width="1" fill="none" opacity="{0.6 - i*0.035:.2f}"/>')
    # ghost ship
    a.append('<g opacity="0.35" fill="#9ec3e6"><path d="M50 425 L130 425 L120 440 L60 440Z"/><rect x="88" y="365" width="3" height="60"/><path d="M92 370 L120 410 L92 410Z"/><path d="M87 375 L62 410 L87 410Z"/></g>')
    return d, a, {"title": "#f5efe0", "accent": "#fff3b0", "font": SERIF}


def art_kaagaz(r):
    d = [grad("bg", [(0, "#ffb26b"), (0.45, "#ff7a59"), (1, "#5b2a4a")])]
    a = ['<rect width="400" height="600" fill="url(#bg)"/>']
    a.append('<circle cx="200" cy="230" r="85" fill="#ffe3a3" opacity="0.9"/>')
    # ghat steps / temples silhouette
    a.append('<path d="M0 330 L40 330 L40 300 L60 280 L80 300 L80 330 L130 330 L130 290 L150 250 L170 290 L170 330 L260 330 L260 305 L280 270 L300 305 L300 330 L340 330 L340 295 L360 275 L380 295 L380 330 L400 330 L400 360 L0 360Z" fill="#3a1a33"/>')
    for i in range(4):
        a.append(f'<rect x="0" y="{360+i*8}" width="400" height="4" fill="#2c1428" opacity="0.8"/>')
    # river
    a.append('<rect x="0" y="392" width="400" height="208" fill="#2e1a3d"/>')
    for i in range(10):
        y = 405 + i * 18
        a.append(f'<path d="M{r.randint(0,60)} {y} h{r.randint(80,180)}" stroke="#ffb26b" stroke-width="2" opacity="{0.45-i*0.035:.2f}" stroke-linecap="round"/>')
    # paper boats
    def boat(x, y, s, o):
        return (f'<g transform="translate({x},{y}) scale({s})" opacity="{o}">'
                '<path d="M-30 0 L30 0 L20 12 L-20 12Z" fill="#fffaf0"/>'
                '<path d="M-14 0 L0 -26 L14 0Z" fill="#f1e6d0"/><path d="M0 -26 L14 0 L4 0Z" fill="#e0d2b8"/></g>')
    a.append(boat(200, 404, 1.4, 1))
    for _ in range(9):
        a.append(boat(r.choice([r.randint(20, 140), r.randint(260, 380)]), r.randint(405, 445), r.uniform(0.35, 0.7), round(r.uniform(0.5, 0.85), 2)))
    # diyas glow
    for _ in range(12):
        x, y = r.randint(10, 390), r.randint(400, 540)
        a.append(f'<circle cx="{x}" cy="{y}" r="2.5" fill="#ffd36b"/><circle cx="{x}" cy="{y}" r="8" fill="#ffd36b" opacity="0.25"/>')
    return d, a, {"title": "#fff6e5", "accent": "#ffd36b", "font": SERIF}


def art_orbit(r):
    d = [rgrad("bg", [(0, "#2a1b5c", 1), (1, "#05030f", 1)], 0.5, 0.4, 0.8)]
    a = ['<rect width="400" height="600" fill="url(#bg)"/>']
    for _ in range(150):
        a.append(f'<circle cx="{r.uniform(0,400):.0f}" cy="{r.uniform(0,600):.0f}" r="{r.uniform(0.3,1.3):.1f}" fill="#fff" opacity="{r.uniform(0.2,0.9):.2f}"/>')
    d.append(grad("planet", [(0, "#f7c873"), (0.5, "#d98b4a"), (1, "#7a3b2a")], x2="1", y2="1"))
    a.append('<ellipse cx="200" cy="250" rx="175" ry="38" fill="none" stroke="#e8c58f" stroke-width="10" opacity="0.5" transform="rotate(-18 200 250)"/>')
    a.append('<circle cx="200" cy="250" r="105" fill="url(#planet)"/>')
    for i, y in enumerate((205, 230, 262, 290)):
        a.append(f'<path d="M105 {y} Q200 {y+10} 295 {y}" stroke="#8a4a2e" stroke-width="{4+i%2*3}" fill="none" opacity="0.35"/>')
    a.append('<path d="M25 250 A175 38 0 0 0 375 250" fill="none" stroke="#f3d9a8" stroke-width="10" opacity="0.8" transform="rotate(-18 200 250)"/>')
    # station
    a.append('<g transform="translate(305 430) rotate(-20)"><rect x="-38" y="-4" width="76" height="8" fill="#cfd8e6"/>'
             '<rect x="-60" y="-14" width="20" height="28" fill="#3d6fd1"/><rect x="40" y="-14" width="20" height="28" fill="#3d6fd1"/>'
             '<circle r="11" fill="#e9eef7"/><circle r="4" fill="#ff5c5c"/></g>')
    # big 9 in orbit
    a.append(f'<text x="200" y="285" text-anchor="middle" font-family="{SANS}" font-weight="700" font-size="120" fill="#ffffff" opacity="0.12">9</text>')
    return d, a, {"title": "#ffffff", "accent": "#b9a6ff", "font": SANS}


def art_neon(r):
    d = [grad("bg", [(0, "#12001f"), (1, "#2b0040")])]
    a = ['<rect width="400" height="600" fill="url(#bg)"/>']
    cols = ["#ff2ea6", "#00f0ff", "#ffe600", "#7bff4a", "#ff7b00"]
    # stalls
    for i in range(6):
        x = i * 70 - 10
        c = cols[i % 5]
        a.append(f'<rect x="{x}" y="300" width="64" height="300" fill="#1b0030"/>')
        a.append(f'<path d="M{x} 300 L{x+64} 300 L{x+56} 280 L{x+8} 280Z" fill="{c}" opacity="0.85"/>')
        for k in range(4):
            a.append(f'<rect x="{x+8+k*14}" y="282" width="7" height="18" fill="#1b0030" opacity="0.35"/>')
    # hanging bulbs
    a.append('<path d="M0 120 Q100 160 200 120 T400 120" stroke="#553366" stroke-width="1.5" fill="none"/>')
    for i in range(22):
        t = i / 21
        x = t * 400
        y = 120 + 20 * math.sin(t * math.pi * 2 + math.pi) * -1 * 0 + (40 * (1 - (2 * ((t * 2) % 1) - 1) ** 2) if True else 0)
        c = cols[i % 5]
        a.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="4" fill="{c}"/><circle cx="{x:.0f}" cy="{y:.0f}" r="11" fill="{c}" opacity="0.25"/>')
    # neon diamond
    a.append('<g filter="url(#nglow)" fill="none" stroke-linejoin="round">'
             '<path d="M140 190 L260 190 L300 230 L200 340 L100 230Z" stroke="#00f0ff" stroke-width="5"/>'
             '<path d="M100 230 L300 230 M140 190 L170 230 L200 340 L230 230 L260 190" stroke="#ff2ea6" stroke-width="3"/></g>')
    d.append('<filter id="nglow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>')
    # shadow figures
    for x in (70, 320, 205):
        a.append(f'<g fill="#07000d"><circle cx="{x}" cy="438" r="13"/><rect x="{x-18}" y="452" width="36" height="80" rx="12"/></g>')
    return d, a, {"title": "#ffe600", "accent": "#ff2ea6", "font": SANS}


def art_vettai(r):
    d = [grad("bg", [(0, "#06140c"), (0.5, "#0f2e1c"), (1, "#020805")])]
    a = ['<rect width="400" height="600" fill="url(#bg)"/>']
    a.append('<circle cx="290" cy="120" r="48" fill="#e9f2d0"/><circle cx="290" cy="120" r="80" fill="#e9f2d0" opacity="0.08"/>')
    # layered trees
    for layer, (col, base) in enumerate((("#0c2617", 330), ("#081c10", 380), ("#040f08", 430))):
        x = -20
        while x < 420:
            h = r.randint(140, 260) - layer * 20
            w = r.randint(30, 55)
            a.append(f'<path d="M{x} {base+200} L{x+w/2:.0f} {base-h} L{x+w} {base+200}Z" fill="{col}"/>')
            x += w * 0.7
    # eyes
    for cx in (165, 235):
        a.append(f'<ellipse cx="{cx}" cy="420" rx="16" ry="9" fill="#ffb000"/><ellipse cx="{cx}" cy="420" rx="3" ry="8" fill="#140a00"/>')
        a.append(f'<ellipse cx="{cx}" cy="420" rx="30" ry="18" fill="#ffb000" opacity="0.15"/>')
    # claw marks
    for i in range(3):
        x = 70 + i * 18
        a.append(f'<path d="M{x} 40 Q{x+25} 150 {x+10} 260" stroke="#c4161c" stroke-width="7" fill="none" stroke-linecap="round" opacity="0.85"/>')
    return d, a, {"title": "#ffb000", "accent": "#c4161c", "font": SANS}


def art_silent(r):
    d = [grad("bg", [(0, "#0a0a0a"), (1, "#1a0f14")])]
    a = ['<rect width="400" height="600" fill="url(#bg)"/>']
    # waveform
    pts = []
    for i in range(0, 401, 4):
        amp = 6 + 90 * math.exp(-((i - 200) / 70) ** 2)
        pts.append(f"{i},{250 + amp * math.sin(i * 0.35) * r.uniform(0.6, 1)}")
    a.append(f'<polyline points="{" ".join(pts)}" fill="none" stroke="#3cff9e" stroke-width="2" opacity="0.9"/>')
    a.append(f'<polyline points="{" ".join(pts)}" fill="none" stroke="#3cff9e" stroke-width="8" opacity="0.15"/>')
    # radio
    a.append('<g transform="translate(200 395) scale(0.85)"><rect x="-110" y="-55" width="220" height="110" rx="14" fill="#2b1d1d" stroke="#4a3434" stroke-width="2"/>'
             '<rect x="-95" y="-40" width="110" height="30" rx="4" fill="#15240f"/>'
             '<text x="-40" y="-18" text-anchor="middle" font-family="monospace" font-size="16" fill="#3cff9e">00.0 FM</text>'
             '<circle cx="60" cy="-5" r="26" fill="#1a1212" stroke="#4a3434" stroke-width="3"/><line x1="60" y1="-5" x2="75" y2="-22" stroke="#aa8888" stroke-width="3"/>'
             + "".join(f'<circle cx="{-90+c*12}" cy="{18+rr*10}" r="3" fill="#120c0c"/>' for c in range(9) for rr in range(3)) +
             '<line x1="80" y1="-55" x2="120" y2="-130" stroke="#777" stroke-width="3"/></g>')
    # handprint smear
    a.append('<g fill="#7a0010" opacity="0.55" transform="translate(300 120) rotate(15)"><ellipse rx="22" ry="26"/>'
             + "".join(f'<rect x="{-22+k*11}" y="-70" width="8" height="44" rx="4"/>' for k in range(4)) + '<rect x="18" y="-30" width="8" height="34" rx="4" transform="rotate(40 22 -13)"/></g>')
    # scanlines
    for y in range(0, 600, 4):
        a.append(f'<rect y="{y}" width="400" height="1" fill="#000" opacity="0.35"/>')
    return d, a, {"title": "#e8e8e8", "accent": "#3cff9e", "font": SANS}


def art_chai(r):
    d = [grad("bg", [(0, "#ffe9dc"), (1, "#ffc9c9")])]
    a = ['<rect width="400" height="600" fill="url(#bg)"/>']
    # confetti
    for _ in range(40):
        c = r.choice(["#ff6b8b", "#ffb03b", "#4ec9b0", "#7a5cff"])
        x, y = r.uniform(0, 400), r.uniform(0, 380)
        a.append(f'<rect x="{x:.0f}" y="{y:.0f}" width="8" height="4" fill="{c}" transform="rotate({r.randint(0,180)} {x:.0f} {y:.0f})" opacity="0.8"/>')
    # two cups facing each other
    def cup(x, c, flip):
        s = -1 if flip else 1
        return (f'<g transform="translate({x} 300) scale({s} 1)">'
                f'<path d="M-50 -40 L50 -40 L40 50 Q0 65 -40 50Z" fill="{c}"/>'
                f'<ellipse cx="0" cy="-40" rx="50" ry="10" fill="#8b4a2b"/>'
                f'<path d="M50 -20 Q80 -15 75 10 Q70 30 44 28" stroke="{c}" stroke-width="9" fill="none"/>'
                f'<circle cx="-15" cy="5" r="4" fill="#3a2a2a"/><circle cx="15" cy="5" r="4" fill="#3a2a2a"/>'
                f'<path d="M-12 22 Q0 14 12 22" stroke="#3a2a2a" stroke-width="3" fill="none"/>'
                f'<path d="M-25 -8 L-8 -2 M25 -8 L8 -2" stroke="#3a2a2a" stroke-width="3"/></g>')
    a.append(cup(110, "#ff6b8b", True))
    a.append(cup(290, "#4ec9b0", False))
    # steam forming a heart
    a.append('<path d="M200 230 C150 180 160 130 200 160 C240 130 250 180 200 230Z" fill="none" stroke="#ffffff" stroke-width="5" opacity="0.9"/>')
    for x in (100, 300):
        a.append(f'<path d="M{x} 250 q-10 -20 0 -40 q10 -20 0 -40" stroke="#fff" stroke-width="4" fill="none" opacity="0.7"/>')
    # lightning between
    a.append('<path d="M190 320 L215 285 L200 285 L215 255" stroke="#ffb03b" stroke-width="5" fill="none" stroke-linejoin="round"/>')
    a.append('<rect x="0" y="380" width="400" height="220" fill="#ff8fa3" opacity="0.25"/>')
    return d, a, {"title": "#3a1f2b", "accent": "#ff6b8b", "font": SERIF, "light": True}


def art_kingdom(r):
    d = [grad("bg", [(0, "#ffcf6b"), (0.5, "#f08a2f"), (1, "#5a2410")])]
    a = ['<rect width="400" height="600" fill="url(#bg)"/>']
    a.append('<circle cx="200" cy="190" r="110" fill="#fff0b8" opacity="0.85"/>')
    # fort silhouette
    fort = ("M40 360 L40 250 L60 250 L60 235 L75 235 L75 250 L100 250 L100 200 L115 185 L130 200 L130 250 "
            "L160 250 L160 150 Q200 90 240 150 L240 250 L270 250 L270 200 L285 185 L300 200 L300 250 "
            "L325 250 L325 235 L340 235 L340 250 L360 250 L360 360Z")
    a.append(f'<path d="{fort}" fill="#5c2a12"/>')
    a.append('<rect x="198" y="70" width="3" height="40" fill="#5c2a12"/><path d="M201 72 L230 80 L201 90Z" fill="#b0141e"/>')
    a.append('<path d="M185 360 L185 300 Q200 280 215 300 L215 360Z" fill="#2e1208"/>')
    # dunes
    a.append('<path d="M0 380 Q100 330 200 370 T400 350 L400 600 L0 600Z" fill="#c4641f"/>')
    a.append('<path d="M0 440 Q120 400 240 440 T400 420 L400 600 L0 600Z" fill="#8f3f14"/>')
    # army spears
    for i in range(70):
        x = r.uniform(0, 400)
        y = r.uniform(455, 520)
        a.append(f'<line x1="{x:.0f}" y1="{y:.0f}" x2="{x+2:.0f}" y2="{y-28:.0f}" stroke="#3b1406" stroke-width="1.5"/>')
    # queen silhouette on horse
    a.append('<g transform="translate(200 410)" fill="#2a0d04"><path d="M-40 0 Q-30 -30 0 -28 Q25 -40 40 -55 L45 -48 L38 -30 Q40 0 30 5 L28 40 L22 40 L20 10 L-20 10 L-22 40 L-28 40 L-30 8 Q-45 10 -40 0Z"/>'
             '<path d="M-5 -28 L-2 -62 L6 -62 L8 -28Z"/><circle cx="2" cy="-70" r="8"/><path d="M8 -70 Q40 -60 50 -30 Q30 -50 6 -60Z"/>'
             '<line x1="-12" y1="-90" x2="-12" y2="0" stroke="#2a0d04" stroke-width="3"/></g>')
    return d, a, {"title": "#fff3d1", "accent": "#b0141e", "font": SERIF}


def art_pixel(r):
    d = [grad("bg", [(0, "#2b2d7c"), (1, "#7a2f9b")])]
    a = ['<rect width="400" height="600" fill="url(#bg)"/>']
    # grid
    for x in range(0, 401, 25):
        a.append(f'<line x1="{x}" y1="0" x2="{x}" y2="600" stroke="#ffffff" opacity="0.06"/>')
    for y in range(0, 601, 25):
        a.append(f'<line x1="0" y1="{y}" x2="400" y2="{y}" stroke="#ffffff" opacity="0.06"/>')
    heart = ["01100110", "11111111", "11111111", "11111111", "01111110", "00111100", "00011000"]
    s = 26
    ox, oy = 200 - 4 * s, 130
    for j, row in enumerate(heart):
        for i, c in enumerate(row):
            if c == "1":
                col = "#ff4f7b" if (i + j) % 5 else "#ff8fab"
                a.append(f'<rect x="{ox+i*s}" y="{oy+j*s}" width="{s-2}" height="{s-2}" fill="{col}"/>')
    a.append(f'<rect x="{ox+s*1}" y="{oy+s*1}" width="{s-2}" height="{s-2}" fill="#ffffff" opacity="0.8"/>')
    # little pixel characters
    def sprite(x, y, col):
        px = ["0110", "1111", "1011", "1111", "1001"]
        out = []
        for j, row in enumerate(px):
            for i, c in enumerate(row):
                if c == "1":
                    out.append(f'<rect x="{x+i*8}" y="{y+j*8}" width="8" height="8" fill="{col}"/>')
        return "".join(out)
    a.append(sprite(80, 400, "#4ef0c4"))
    a.append(sprite(180, 410, "#ffd93b"))
    a.append(sprite(280, 400, "#6bb6ff"))
    # coins
    for _ in range(14):
        x, y = r.randint(20, 380), r.randint(20, 380)
        if 90 < x < 310 and 120 < y < 320:
            continue
        a.append(f'<rect x="{x}" y="{y}" width="10" height="10" fill="#ffd93b"/>')
    a.append('<rect x="0" y="460" width="400" height="20" fill="#3cbf5a"/><rect x="0" y="480" width="400" height="120" fill="#7a4a1f" opacity="0.6"/>')
    return d, a, {"title": "#ffffff", "accent": "#ffd93b", "font": "'Press Start 2P','Courier New',monospace", "pixel": True}


def art_ninth(r):
    d = [grad("bg", [(0, "#061430"), (1, "#0d3b2a")])]
    a = ['<rect width="400" height="600" fill="url(#bg)"/>']
    # floodlights
    for x in (40, 360):
        a.append(f'<polygon points="{x},60 {200 if x<200 else 200},420 {x+ (60 if x<200 else -60)},420" fill="#fffbe0" opacity="0.08"/>')
        a.append(f'<rect x="{x-18}" y="40" width="36" height="24" fill="#fffde8"/><rect x="{x-2}" y="64" width="4" height="120" fill="#1b2b40"/>')
        a.append(f'<circle cx="{x}" cy="52" r="40" fill="#fffde8" opacity="0.15"/>')
    # crowd stand
    a.append('<path d="M0 260 Q200 200 400 260 L400 330 L0 330Z" fill="#0a1a33"/>')
    for _ in range(220):
        x = r.uniform(0, 400)
        y = r.uniform(250, 325)
        a.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="1.6" fill="{r.choice(["#ff9933","#ffffff","#138808","#4fa3ff"])}" opacity="0.6"/>')
    # pitch
    a.append('<ellipse cx="200" cy="470" rx="260" ry="150" fill="#1f6b3a"/>')
    a.append('<path d="M180 330 L220 330 L250 600 L150 600Z" fill="#c9b27a"/>')
    a.append('<g fill="#f2f2f2"><rect x="192" y="340" width="3" height="26"/><rect x="198.5" y="340" width="3" height="26"/><rect x="205" y="340" width="3" height="26"/></g>')
    # ball with motion trail
    a.append('<path d="M215 405 Q270 360 330 320" stroke="#ffffff" stroke-width="3" stroke-dasharray="4 7" fill="none" opacity="0.7"/>')
    a.append('<circle cx="215" cy="405" r="14" fill="#c41e1e"/><path d="M203 399 Q215 405 227 399 M203 411 Q215 405 227 411" stroke="#fff" stroke-width="1.5" fill="none"/>')
    return d, a, {"title": "#ffffff", "accent": "#ff9933", "font": SANS}


def art_ladakh(r):
    d = [grad("bg", [(0, "#7fb8e6"), (0.6, "#cfe6f5"), (1, "#f2e4c9")])]
    a = ['<rect width="400" height="600" fill="url(#bg)"/>']
    a.append('<path d="M0 300 L60 190 L110 250 L170 140 L230 230 L290 160 L350 240 L400 200 L400 360 L0 360Z" fill="#8a9bb3"/>')
    a.append('<path d="M150 170 L170 140 L190 172 L178 165 L168 178 L160 166Z M275 182 L290 160 L305 184 L292 178 L284 190Z" fill="#ffffff"/>')
    a.append('<path d="M0 340 L80 260 L150 320 L230 250 L320 330 L400 280 L400 400 L0 400Z" fill="#a0715a"/>')
    # lake
    a.append('<path d="M0 395 Q200 375 400 395 L400 450 Q200 470 0 450Z" fill="#2fa7c9"/>')
    a.append('<path d="M40 410 h90 M220 420 h120 M120 440 h60" stroke="#bdeefc" stroke-width="2" opacity="0.7"/>')
    # prayer flags
    flags = ["#1e5bd8", "#ffffff", "#d82020", "#1aa34a", "#f2c200"]
    a.append('<path d="M0 70 Q200 130 400 60" stroke="#5a4a3a" stroke-width="1.5" fill="none"/>')
    for i in range(18):
        t = (i + 0.5) / 18
        x = t * 400
        y = (1 - t) ** 2 * 70 + 2 * (1 - t) * t * 130 + t * t * 60
        a.append(f'<rect x="{x-8:.0f}" y="{y:.0f}" width="16" height="20" fill="{flags[i % 5]}" transform="rotate({r.randint(-8,8)} {x:.0f} {y:.0f})"/>')
    # road + two bikes
    a.append('<path d="M120 600 Q180 520 210 470 L230 470 Q240 520 300 600Z" fill="#4a4038"/>')
    for x, y, s in ((205, 520, 1), (240, 545, 1.15)):
        a.append(f'<g transform="translate({x} {y}) scale({s})" fill="#1c1c1c"><circle cx="-14" cy="10" r="8" fill="none" stroke="#1c1c1c" stroke-width="3"/>'
                 '<circle cx="14" cy="10" r="8" fill="none" stroke="#1c1c1c" stroke-width="3"/><path d="M-14 10 L-2 -4 L12 -4 L14 10"/>'
                 '<circle cx="0" cy="-20" r="5"/><path d="M-4 -15 L4 -15 L6 -2 L-6 -2Z"/></g>')
    return d, a, {"title": "#2b2118", "accent": "#d82020", "font": SERIF, "light": True}


ART = {
    "monsoon-protocol": (art_monsoon, ["MONSOON", "PROTOCOL"]),
    "the-last-lighthouse": (art_lighthouse, ["THE LAST", "LIGHTHOUSE"]),
    "kaagaz-ke-sapne": (art_kaagaz, ["Kaagaz", "Ke Sapne"]),
    "orbit-9": (art_orbit, ["ORBIT 9"]),
    "neon-bazaar": (art_neon, ["NEON", "BAZAAR"]),
    "vettai": (art_vettai, ["VETTAI"]),
    "silent-frequency": (art_silent, ["SILENT", "FREQUENCY"]),
    "chai-and-chaos": (art_chai, ["Chai &", "Chaos"]),
    "kingdom-of-sand": (art_kingdom, ["KINGDOM", "OF SAND"]),
    "pixel-hearts": (art_pixel, ["PIXEL", "HEARTS"]),
    "the-ninth-over": (art_ninth, ["THE NINTH", "OVER"]),
    "echoes-of-ladakh": (art_ladakh, ["Echoes of", "Ladakh"]),
}


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def poster(movie):
    fn, lines = ART[movie["slug"]]
    r = random.Random(movie["slug"])
    defs, art, style = fn(r)
    light = style.get("light", False)
    pixel = style.get("pixel", False)
    defs.append('<linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">'
                f'<stop offset="0" stop-color="{"#ffffff" if light else "#000000"}" stop-opacity="0"/>'
                f'<stop offset="1" stop-color="{"#ffffff" if light else "#000000"}" stop-opacity="{0.75 if light else 0.9}"/></linearGradient>')
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">',
           f'<title>{esc(movie["title"])}</title><defs>{"".join(defs)}</defs>', *art,
           '<rect x="0" y="380" width="400" height="220" fill="url(#fade)"/>']
    # title block
    size = 30 if pixel else (64 if len(max(lines, key=len)) <= 8 else 50)
    if style["font"] == SERIF:
        size = 52 if len(max(lines, key=len)) <= 9 else 46
    y0 = 560 - 40 - (len(lines) - 1) * (size * 0.95)
    tc, ac = style["title"], style["accent"]
    weight = "700" if style["font"] != SANS else "800"
    spacing = "2" if style["font"] == SANS else "0"
    for i, ln in enumerate(lines):
        out.append(f'<text x="200" y="{y0 + i*size*0.95:.0f}" text-anchor="middle" font-family="{style["font"]}" '
                   f'font-weight="{weight}" font-size="{size}" letter-spacing="{spacing}" fill="{tc}">{esc(ln)}</text>')
    out.append(f'<rect x="170" y="{y0 + (len(lines)-1)*size*0.95 + 14:.0f}" width="60" height="3" fill="{ac}"/>')
    sub = "#3a2a2a" if light else "#d9d9d9"
    out.append(f'<text x="200" y="{y0 + (len(lines)-1)*size*0.95 + 38:.0f}" text-anchor="middle" font-family="{BODY}" font-size="12" '
               f'font-style="italic" fill="{sub}">{esc(movie["tagline"])}</text>')
    when = "IN CINEMAS NOW" if movie["status"] == "now_showing" else "COMING SOON"
    out.append(f'<text x="200" y="586" text-anchor="middle" font-family="{BODY}" font-size="10" letter-spacing="3" fill="{sub}" opacity="0.85">'
               f'{when} · {esc(movie["language"].upper())}</text>')
    # certificate badge
    out.append(f'<g transform="translate(360 18)"><rect width="28" height="20" rx="4" fill="#000" opacity="0.55" stroke="#fff" stroke-opacity="0.6"/>'
               f'<text x="14" y="14.5" text-anchor="middle" font-family="{BODY}" font-weight="700" font-size="11" fill="#fff">{movie["certificate"]}</text></g>')
    out.append("</svg>")
    return "\n".join(out)


def main():
    movies = json.loads(Path(sys.argv[1]).read_text())
    outdir = Path(sys.argv[2])
    outdir.mkdir(parents=True, exist_ok=True)
    for m in movies:
        (outdir / f'{m["slug"]}.svg').write_text(poster(m))
        print("wrote", m["slug"])


if __name__ == "__main__":
    main()
