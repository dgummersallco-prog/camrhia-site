#!/usr/bin/env python3
"""Camrhia brag v2 — punchy, fast, beat-driven. 1080x1920 @30fps, ~16s."""
import os, math
from PIL import Image, ImageDraw, ImageFont

WORK = os.path.dirname(os.path.abspath(__file__))
OUT  = os.path.join(WORK, 'frames')
os.makedirs(OUT, exist_ok=True)

W, H   = 1080, 1920
FPS    = 30
DUR    = 16.0
BPM    = 116
BEAT   = 60.0 / BPM   # ~0.517s per beat

# ── Palette ──────────────────────────────────────────────────────────────────
CREAM  = (255, 253, 249)
NAVY   = (25,  30,  41)
NAVY2  = (42,  54,  85)
GOLD   = (169, 133, 63)
SAGE   = (110, 126, 96)
WHITE  = (255, 255, 255)
BLACK  = (0,   0,   0)

# ── Fonts ────────────────────────────────────────────────────────────────────
def fnt(path, size):
    return ImageFont.truetype(os.path.join(WORK, path), size)

F96  = fnt('Fraunces-Regular.ttf', 96)
F112 = fnt('Fraunces-Regular.ttf', 112)
F80  = fnt('Fraunces-Regular.ttf', 80)
F64  = fnt('Fraunces-Regular.ttf', 64)
G48  = fnt('Geist-Regular.ttf', 48)
G36  = fnt('Geist-Regular.ttf', 36)
G54  = fnt('Geist-Regular.ttf', 54)
G28  = fnt('Geist-Regular.ttf', 28)

# ── Motion helpers ────────────────────────────────────────────────────────────
def clamp(v, lo=0.0, hi=1.0):
    return max(lo, min(hi, v))

def prog(t, start, dur):
    return clamp((t - start) / dur) if dur > 0 else (1.0 if t >= start else 0.0)

def spring(t, speed=12, damping=0.6):
    """Springy ease: overshoots then settles. t in [0,1]."""
    if t <= 0: return 0.0
    if t >= 1: return 1.0
    # exponential spring approximation
    omega = speed
    zeta  = damping
    wd    = omega * math.sqrt(max(0, 1 - zeta*zeta))
    e     = math.exp(-zeta * omega * t)
    return 1 - e * (math.cos(wd * t) + (zeta * omega / max(wd, 0.001)) * math.sin(wd * t))

def ease_out(t, exp=3):
    return 1 - (1 - clamp(t)) ** exp

def ease_in(t, exp=2):
    return clamp(t) ** exp

# ── Drawing ───────────────────────────────────────────────────────────────────
def text_w(text, f):
    bb = f.getbbox(text)
    return bb[2] - bb[0]

def text_h(text, f):
    bb = f.getbbox(text)
    return bb[3] - bb[1]

def draw_cx(draw, text, y, f, color, img=None, alpha=255, scale=1.0, oy=0):
    """Draw centered text with optional alpha and scale."""
    tw = text_w(text, f)
    th = text_h(text, f)
    x  = (W - tw * scale) // 2
    actual_y = y + oy
    if scale != 1.0 or alpha < 255:
        tmp = Image.new('RGBA', (int(tw * scale + 4), int(th * scale + 4)), (0, 0, 0, 0))
        td  = ImageDraw.Draw(tmp)
        td.text((0, 0), text, font=f, fill=(*color, 255))
        if scale != 1.0:
            nw = max(1, int(tw * scale))
            nh = max(1, int(th * scale))
            tmp = tmp.resize((nw, nh), Image.LANCZOS)
        if alpha < 255:
            r, g, b, a = tmp.split()
            a = a.point(lambda p: int(p * alpha / 255))
            tmp = Image.merge('RGBA', (r, g, b, a))
        xpos = (W - tmp.width) // 2
        if img:
            img.alpha_composite(tmp, (xpos, actual_y))
    else:
        draw.text(((W - tw) // 2, actual_y), text, font=f, fill=color)

def wrap(text, f, maxw):
    words = text.split()
    lines, cur = [], ''
    for w in words:
        test = (cur + ' ' + w).strip()
        if text_w(test, f) <= maxw:
            cur = test
        else:
            if cur: lines.append(cur)
            cur = w
    if cur: lines.append(cur)
    return lines

def draw_lines_cx(img, draw, lines, y, f, color, alpha=255, gap=12, scale=1.0, oy=0):
    th = text_h('A', f) + gap
    for ln in lines:
        draw_cx(draw, ln, y + oy, f, color, img, alpha, scale)
        y += int(th * scale)
    return y

def paste_screen(base, screen, cx, cy, alpha=255, oy=0):
    x = cx - screen.width  // 2
    y = cy - screen.height // 2 + oy
    if alpha < 255:
        layer = Image.new('RGBA', (W, H), (0,0,0,0))
        layer.paste(screen, (x, y), screen)
        r,g,b,a = layer.split()
        a = a.point(lambda p: int(p * alpha / 255))
        base.alpha_composite(Image.merge('RGBA',(r,g,b,a)))
    else:
        base.paste(screen, (x, y), screen)

def pill(draw, cx, cy, label, f, bg, fg, pw=420, ph=100):
    x0, y0 = cx - pw//2, cy - ph//2
    draw.rounded_rectangle([x0,y0,x0+pw,y0+ph], radius=ph//2, fill=bg)
    tw, th = text_w(label,f), text_h(label,f)
    draw.text((cx - tw//2, cy - th//2 - 2), label, font=f, fill=fg)

# ── Load screens ─────────────────────────────────────────────────────────────
def load_fit(name, target_w):
    img = Image.open(os.path.join(WORK, name)).convert('RGBA')
    r   = target_w / img.width
    return img.resize((target_w, int(img.height * r)), Image.LANCZOS)

SCR_W   = 600
port    = load_fit('screen-live-portfolio.png', SCR_W)
cal     = load_fit('screen-calendar.png', SCR_W)
market  = load_fit('screen-marketplace.png', SCR_W)

logo_raw = Image.open(os.path.join(WORK, 'logo.png')).convert('RGBA')
logo     = logo_raw.resize((140, 140), Image.LANCZOS)

# ── Beat times (scene starts, each 2 beats = ~1.03s at 116 BPM) ──────────────
# Layout at 116 BPM: beat = 0.517s
# S1 hook       0.0
# S2 reveal     1.55   (3 beats)
# S3 feat1      3.10   (3 beats)
# S4 feat2      5.17   (4 beats)
# S5 feat3      7.24   (4 beats)
# S6 punchline  9.31   (4 beats)
# S7 outro     11.90   (5 beats)
# end          14.48   → round to 15s

B = BEAT
SCENES = [
    (0*B,    3*B,   'hook'),
    (3*B,    6*B,   'reveal'),
    (6*B,    10*B,  'feat1'),
    (10*B,   14*B,  'feat2'),
    (14*B,   18*B,  'feat3'),
    (18*B,   22*B,  'punch'),
    (22*B,   28*B,  'outro'),
]
TOTAL = 28 * B  # ~12.5s — let's recalc

# simpler: fix at exact times
SCENES = [
    (0.00,  1.55, 'hook'),
    (1.55,  3.10, 'reveal'),
    (3.10,  5.17, 'feat1'),
    (5.17,  7.24, 'feat2'),
    (7.24,  9.31, 'feat3'),
    (9.31, 11.90, 'punch'),
    (11.90, 16.0, 'outro'),
]
TOTAL = 16.0

# ── Scene builders ────────────────────────────────────────────────────────────

def mk(bg=CREAM):
    img = Image.new('RGBA', (W, H), (*bg, 255))
    return img, ImageDraw.Draw(img)

def scene_hook(t):
    """0–1.55s: 'Your camera.' slams in big on cream. Logo flashes in."""
    img, d = mk(CREAM)
    p = spring(prog(t, 0, 0.25), speed=14, damping=0.55)
    alpha = int(255 * ease_out(prog(t, 0, 0.18)))
    scale = 1.0 + (1 - p) * 0.18   # starts 18% bigger, settles to 1.0
    oy    = int((1 - p) * -40)

    draw_cx(d, 'Your camera.', H//2 - 80, F112, NAVY, img, alpha, scale, oy)

    # logo fades in after the text settles
    la = int(255 * ease_out(prog(t, 0.5, 0.6)))
    if la > 0:
        lx = W//2 - logo.width//2
        ly = H//2 + 80
        layer = Image.new('RGBA',(W,H),(0,0,0,0))
        r2,g2,b2,a2 = logo.split()
        a2 = a2.point(lambda pp: int(pp * la / 255))
        layer.paste(Image.merge('RGBA',(r2,g2,b2,a2)),(lx,ly))
        img.alpha_composite(layer)
    return img

def scene_reveal(t):
    """1.55–3.10s: 'Could be your whole career.' + portfolio screen crashes up."""
    img, d = mk(CREAM)
    p_text = spring(prog(t, 0, 0.30), speed=13, damping=0.58)
    alpha  = int(255 * ease_out(prog(t, 0, 0.22)))
    scale  = 1.0 + (1 - p_text) * 0.14
    oy     = int((1 - p_text) * -30)

    lines = ['Could be', 'your whole career.']
    y = 200
    for ln in lines:
        draw_cx(d, ln, y, F96, NAVY, img, alpha, scale, oy)
        y += 110

    # screen crashes in from bottom with spring
    p_scr = spring(prog(t, 0.15, 0.45), speed=11, damping=0.62)
    a_scr = int(255 * ease_out(prog(t, 0.15, 0.3)))
    scr_cy = H - port.height//2 - 40
    start_y = H + port.height//2 + 200
    actual_cy = int(start_y + (scr_cy - start_y) * p_scr)
    if a_scr > 0:
        paste_screen(img, port, W//2, actual_cy, a_scr)
    return img

def scene_feat(t, screen, label, lines, dot_i):
    """Generic feature scene: label + headline punch in, screen snaps from right."""
    img, d = mk(CREAM)

    # Label
    la = int(255 * ease_out(prog(t, 0, 0.18)))
    draw_cx(d, label, 130, G36, SAGE, img, la)

    # Headline lines, each staggered
    y = 200
    for i, ln in enumerate(lines):
        delay = i * 0.09
        p  = spring(prog(t, delay, 0.30), speed=13, damping=0.58)
        a  = int(255 * ease_out(prog(t, delay, 0.22)))
        sc = 1.0 + (1 - p) * 0.12
        oy = int((1 - p) * -25)
        draw_cx(d, ln, y, F80, NAVY, img, a, sc, oy)
        y += 96

    # Screen snaps in from right
    p_s = spring(prog(t, 0.12, 0.38), speed=12, damping=0.60)
    a_s = int(255 * ease_out(prog(t, 0.12, 0.28)))
    target_x = W // 2
    start_x  = W + screen.width // 2 + 100
    cx = int(start_x + (target_x - start_x) * p_s)
    cy = H - screen.height//2 - 30
    if a_s > 0:
        paste_screen(img, screen, cx, cy, a_s)

    # Dots
    dot_layer = Image.new('RGBA',(W,H),(0,0,0,0))
    dd = ImageDraw.Draw(dot_layer)
    total_dots, r, gap = 3, 7, 18
    total_w = total_dots*(2*r)+(total_dots-1)*gap
    sx = W//2 - total_w//2
    for i in range(total_dots):
        x = sx + i*(2*r+gap)+r
        a_dot = 230 if i == dot_i else 70
        dd.ellipse([x-r, H-55-r, x-r+2*r, H-55+r], fill=(*NAVY,a_dot))
    img.alpha_composite(dot_layer)
    return img

def scene_punch(t):
    """9.31–11.90s: 'One app.' big slam on navy background. Then logo."""
    # Flash: starts dark navy, text slams white
    img, d = mk(NAVY)

    p = spring(prog(t, 0, 0.28), speed=15, damping=0.52)
    a = int(255 * ease_out(prog(t, 0, 0.20)))
    sc = 1.0 + (1 - p) * 0.22
    oy = int((1 - p) * -50)
    draw_cx(d, 'One app.', H//2 - 120, F112, WHITE, img, a, sc, oy)

    p2 = spring(prog(t, 0.30, 0.35), speed=12, damping=0.60)
    a2 = int(255 * ease_out(prog(t, 0.30, 0.25)))
    sc2 = 1.0 + (1 - p2) * 0.10
    oy2 = int((1 - p2) * -20)
    draw_cx(d, 'Your whole business.', H//2 + 10, F64, (*GOLD,), img, a2, sc2, oy2)

    # Logo
    la = int(255 * ease_out(prog(t, 0.7, 0.5)))
    if la > 0:
        lx = W//2 - logo.width//2
        ly = H//2 + 130
        layer = Image.new('RGBA',(W,H),(0,0,0,0))
        r2,g2,b2,a_ch = logo.split()
        a_ch = a_ch.point(lambda pp: int(pp * la / 255))
        layer.paste(Image.merge('RGBA',(r2,g2,b2,a_ch)),(lx,ly))
        img.alpha_composite(layer)
    return img

def scene_outro(t):
    """11.90–16s: cream, logo, 'Start free.' pill, sub-text."""
    img, d = mk(CREAM)

    p = spring(prog(t, 0, 0.35), speed=12, damping=0.62)
    a = int(255 * ease_out(prog(t, 0, 0.28)))
    sc = 1.0 + (1 - p) * 0.10

    # Logo
    lx = W//2 - logo.width//2
    ly = H//2 - 300
    if a > 0:
        layer = Image.new('RGBA',(W,H),(0,0,0,0))
        r2,g2,b2,a_ch = logo.split()
        a_ch = a_ch.point(lambda pp: int(pp * a / 255))
        layer.paste(Image.merge('RGBA',(r2,g2,b2,a_ch)),(lx,ly))
        img.alpha_composite(layer)

    draw_cx(d, 'camrhia', ly + 160, F80, NAVY, img, a, sc)

    p2 = spring(prog(t, 0.25, 0.35), speed=12, damping=0.62)
    a2 = int(255 * ease_out(prog(t, 0.25, 0.28)))
    if a2 > 0:
        btn = Image.new('RGBA',(W,H),(0,0,0,0))
        bd  = ImageDraw.Draw(btn)
        pill(bd, W//2, H//2+60, 'Start free', G54, NAVY, CREAM, 440, 108)
        r2,g2,b2,a_ch = btn.split()
        a_ch = a_ch.point(lambda pp: int(pp * a2 / 255))
        img.alpha_composite(Image.merge('RGBA',(r2,g2,b2,a_ch)))

    a3 = int(255 * ease_out(prog(t, 0.55, 0.4)))
    draw_cx(d, '14-day free trial', H//2 + 210, G36, NAVY2, img, a3)
    draw_cx(d, 'camrhia.com', H//2 + 265, G36, GOLD,  img, a3)
    return img

# ── Hard-cut flash (2 frames of black between scenes) ────────────────────────
FLASH_FRAMES = 1  # 1 frame black flash on each cut

def render_frame(i):
    t = i / FPS

    # Find scene
    scene_name = 'hook'
    t_local    = t
    scene_idx  = 0
    for idx, (s, e, name) in enumerate(SCENES):
        if s <= t < e:
            scene_name = name
            t_local    = t - s
            scene_idx  = idx
            break

    # Flash: first FLASH_FRAMES frames of each scene (except first) = black
    if scene_idx > 0:
        scene_start_frame = int(SCENES[scene_idx][0] * FPS)
        frames_in = i - scene_start_frame
        if frames_in < FLASH_FRAMES:
            img = Image.new('RGBA', (W, H), (0, 0, 0, 255))
            return img.convert('RGB')

    if scene_name == 'hook':
        img = scene_hook(t_local)
    elif scene_name == 'reveal':
        img = scene_reveal(t_local)
    elif scene_name == 'feat1':
        img = scene_feat(t_local, port,   'PORTFOLIO', ['Your portfolio', 'is your website.'], 0)
    elif scene_name == 'feat2':
        img = scene_feat(t_local, cal,    'BOOKING',   ['Book. Contract.', 'Get paid.'], 1)
    elif scene_name == 'feat3':
        img = scene_feat(t_local, market, 'DISCOVERY', ['Get found.', 'Get booked.'], 2)
    elif scene_name == 'punch':
        img = scene_punch(t_local)
    elif scene_name == 'outro':
        img = scene_outro(t_local)
    else:
        img = Image.new('RGBA', (W, H), (*CREAM, 255))

    return img.convert('RGB')


total_frames = int(TOTAL * FPS)
print(f"Rendering {total_frames} frames at {FPS}fps ({TOTAL}s)...")
for i in range(total_frames):
    render_frame(i).save(os.path.join(OUT, f'frame_{i:04d}.png'))
    if i % 60 == 0:
        print(f"  {i}/{total_frames} ({i*100//total_frames}%)")
print("Done.")
