#!/usr/bin/env python3
"""Render all frames for the Camrhia brag video. 1080x1920 @30fps, ~20s = 600 frames."""

import os, math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

WORK = os.path.dirname(os.path.abspath(__file__))
OUT  = os.path.join(WORK, 'frames')
os.makedirs(OUT, exist_ok=True)

W, H   = 1080, 1920
FPS    = 30
TOTAL  = 20.0   # seconds

# ── Brand colours ────────────────────────────────────────────────────────────
CREAM  = (255, 253, 249)
NAVY   = (25,  30,  41)
NAVY2  = (58,  74, 107)
GOLD   = (169, 133, 63)
SAGE   = (110, 126, 96)
WHITE  = (255, 255, 255)

# ── Fonts ────────────────────────────────────────────────────────────────────
def font(path, size):
    return ImageFont.truetype(os.path.join(WORK, path), size)

try:
    F_DISPLAY  = font('Fraunces-Regular.ttf', 88)
    F_DISPLAY2 = font('Fraunces-Regular.ttf', 72)
    F_DISPLAY3 = font('Fraunces-Regular.ttf', 60)
    F_LABEL    = font('Geist-Regular.ttf', 36)
    F_BODY     = font('Geist-Regular.ttf', 48)
    F_SMALL    = font('Geist-Regular.ttf', 32)
    F_CTA      = font('Geist-Regular.ttf', 54)
except Exception as e:
    print(f"Font error: {e}")
    raise

# ── Easing ───────────────────────────────────────────────────────────────────
def ease_out_cubic(t):
    return 1 - (1 - t) ** 3

def ease_in_out(t):
    return t * t * (3 - 2 * t)

def clamp(v, lo=0.0, hi=1.0):
    return max(lo, min(hi, v))

def progress(t, start, end):
    if end <= start: return 1.0
    return clamp((t - start) / (end - start))

# ── Screen images ─────────────────────────────────────────────────────────────
def load_screen(name):
    img = Image.open(os.path.join(WORK, name)).convert('RGBA')
    return img

screens = {
    'portfolio':   load_screen('screen-live-portfolio.png'),
    'sessions':    load_screen('screen-calendar.png'),
    'marketplace': load_screen('screen-marketplace.png'),
}

# Scale screens to fit nicely in the frame (phone mockup region)
PHONE_W = 560   # rendered phone width in frame
def scale_screen(img):
    ratio = PHONE_W / img.width
    new_h = int(img.height * ratio)
    return img.resize((PHONE_W, new_h), Image.LANCZOS)

for k in screens:
    screens[k] = scale_screen(screens[k])

PHONE_H = screens['portfolio'].height  # height of the tallest screen

# Load logo
logo_raw = Image.open(os.path.join(WORK, 'logo.png')).convert('RGBA')
logo = logo_raw.resize((160, 160), Image.LANCZOS)

# ── Drawing helpers ──────────────────────────────────────────────────────────
def draw_text_centered(draw, text, y, fnt, color, alpha=255, img=None, shadow=False):
    """Draw centered text, optionally with alpha composite."""
    bbox = fnt.getbbox(text)
    tw = bbox[2] - bbox[0]
    x = (W - tw) // 2
    if shadow and img is not None:
        # soft shadow via offset
        shadow_layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        sd = ImageDraw.Draw(shadow_layer)
        sd.text((x + 3, y + 4), text, font=fnt, fill=(0, 0, 0, 60))
        img.alpha_composite(shadow_layer)
    if alpha < 255 and img is not None:
        layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        ld = ImageDraw.Draw(layer)
        ld.text((x, y), text, font=fnt, fill=(*color, alpha))
        img.alpha_composite(layer)
    else:
        draw.text((x, y), text, font=fnt, fill=color)

def draw_text_centered_wrap(img, draw, lines, y, fnt, color, alpha=255, line_gap=16):
    for line in lines:
        bbox = fnt.getbbox(line)
        th = bbox[3] - bbox[1]
        draw_text_centered(draw, line, y, fnt, color, alpha, img)
        y += th + line_gap
    return y

def wrap_text(text, fnt, max_width):
    """Wrap text to max_width pixels."""
    words = text.split()
    lines = []
    current = ''
    for w in words:
        test = (current + ' ' + w).strip()
        bbox = fnt.getbbox(test)
        if bbox[2] - bbox[0] <= max_width:
            current = test
        else:
            if current:
                lines.append(current)
            current = w
    if current:
        lines.append(current)
    return lines

def composite_screen(base, screen_img, cx, cy, alpha=255):
    """Paste screen_img centered at (cx, cy) with given alpha."""
    x = cx - screen_img.width // 2
    y = cy - screen_img.height // 2
    if alpha < 255:
        layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        layer.paste(screen_img, (x, y), screen_img)
        # adjust alpha
        r, g, b, a = layer.split()
        import PIL.ImageChops as IC
        a_scaled = a.point(lambda p: int(p * alpha / 255))
        layer = Image.merge('RGBA', (r, g, b, a_scaled))
        base.alpha_composite(layer)
    else:
        base.paste(screen_img, (x, y), screen_img)

def draw_pill_button(draw, cx, cy, text, fnt, bg, fg, pw=380, ph=90):
    x0 = cx - pw // 2
    y0 = cy - ph // 2
    draw.rounded_rectangle([x0, y0, x0+pw, y0+ph], radius=ph//2, fill=bg)
    bbox = fnt.getbbox(text)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    draw.text((cx - tw//2, cy - th//2 - 2), text, font=fnt, fill=fg)

def draw_dot_indicator(draw, cx, cy, total, active, r=8, gap=24):
    total_w = total * (2*r) + (total-1) * gap
    sx = cx - total_w // 2
    for i in range(total):
        x = sx + i * (2*r + gap) + r
        color = NAVY if i == active else (*NAVY2, 80)
        if isinstance(color, tuple) and len(color) == 4:
            # skip alpha in draw.ellipse
            color = (*NAVY2[:3],)
        alpha = 200 if i == active else 80
        layer = Image.new('RGBA', (W, H), (0,0,0,0))
        ld = ImageDraw.Draw(layer)
        col = (*NAVY[:3], alpha)
        ld.ellipse([x-r, cy-r, x+r, cy+r], fill=col)
        # will be composited by caller
        return layer  # just return, caller handles

def make_dot_layer(total, active, cx, cy, r=7, gap=20):
    layer = Image.new('RGBA', (W, H), (0,0,0,0))
    ld = ImageDraw.Draw(layer)
    total_w = total * (2*r) + (total-1) * gap
    sx = cx - total_w // 2
    for i in range(total):
        x = sx + i * (2*r + gap) + r
        alpha = 230 if i == active else 80
        col = (*NAVY[:3], alpha)
        ld.ellipse([x-r, cy-r, x+r, cy+r], fill=col)
    return layer

# ── Scene renderers ──────────────────────────────────────────────────────────

def scene_hook(img, t):
    """0–2.5s: 'Your camera could be your whole career.' on cream."""
    draw = ImageDraw.Draw(img)
    img.paste(CREAM, [0, 0, W, H])

    p = ease_out_cubic(clamp(t / 0.8))
    alpha = int(255 * p)

    lines = wrap_text('Your camera could be', F_DISPLAY, W - 120)
    lines += wrap_text('your whole career.', F_DISPLAY, W - 120)

    # Calculate total text block height
    line_h = F_DISPLAY.getbbox('A')[3] + 14
    total_h = len(lines) * line_h
    y = H // 2 - total_h // 2 - 80

    for line in lines:
        draw_text_centered(draw, line, y, F_DISPLAY, NAVY, alpha, img, shadow=True)
        y += line_h

    # Logo below text
    lx = W // 2 - logo.width // 2
    ly = y + 60
    logo_alpha = int(255 * ease_out_cubic(clamp((t - 0.4) / 0.8)))
    if logo_alpha > 0:
        layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        r2, g2, b2, a2 = logo.split()
        a2 = a2.point(lambda p: int(p * logo_alpha / 255))
        faded = Image.merge('RGBA', (r2, g2, b2, a2))
        layer.paste(faded, (lx, ly))
        img.alpha_composite(layer)


def scene_reveal(img, t_local):
    """2.5–6s: 'One app. Your whole photography business.' + portfolio screen slides up."""
    draw = ImageDraw.Draw(img)
    img.paste(CREAM, [0, 0, W, H])

    # Text fades in
    tp = ease_out_cubic(clamp(t_local / 0.6))
    alpha_text = int(255 * tp)

    y = 200
    draw_text_centered(draw, 'One app.', y, F_DISPLAY2, NAVY, alpha_text, img, shadow=True)
    lines = wrap_text('Your whole photography business.', F_DISPLAY3, W - 120)
    y2 = y + 88
    for ln in lines:
        draw_text_centered(draw, ln, y2, F_DISPLAY3, NAVY2, alpha_text, img)
        y2 += 74

    # Screen slides up
    sp = ease_out_cubic(clamp((t_local - 0.3) / 0.8))
    alpha_screen = int(255 * sp)
    screen = screens['portfolio']
    SCREEN_CX = W // 2
    target_cy = H - screen.height // 2 - 60
    start_cy  = H + screen.height // 2 + 100
    cy = int(start_cy + (target_cy - start_cy) * sp)
    if alpha_screen > 0:
        composite_screen(img, screen, SCREEN_CX, cy, alpha_screen)

    dots = make_dot_layer(3, 0, W // 2, H - 60)
    img.alpha_composite(dots)


def scene_feature(img, t_local, screen_key, label, headline, dot_idx, slide_dir=1):
    """Generic feature scene: label + headline + phone screen sliding in."""
    draw = ImageDraw.Draw(img)
    img.paste(CREAM, [0, 0, W, H])

    # Label (sage, small caps feel)
    lp = ease_out_cubic(clamp(t_local / 0.5))
    alpha_label = int(255 * lp)
    draw_text_centered(draw, label.upper(), 160, F_LABEL, SAGE, alpha_label, img)

    # Headline
    hp = ease_out_cubic(clamp((t_local - 0.15) / 0.6))
    alpha_head = int(255 * hp)
    lines = wrap_text(headline, F_DISPLAY2, W - 100)
    y = 220
    for ln in lines:
        draw_text_centered(draw, ln, y, F_DISPLAY2, NAVY, alpha_head, img, shadow=True)
        y += 92

    # Screen slides in from right (slide_dir=1) or left (-1)
    sp = ease_out_cubic(clamp((t_local - 0.2) / 0.7))
    alpha_screen = int(255 * sp)
    screen = screens[screen_key]
    SCREEN_CX = W // 2
    target_cy = H - screen.height // 2 - 50
    offset_start = slide_dir * (W + 200)
    sx = int(W // 2 + offset_start * (1 - sp))
    if alpha_screen > 0:
        x = sx - screen.width // 2
        cyy = target_cy
        if alpha_screen < 255:
            layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
            layer.paste(screen, (x, cyy - screen.height // 2), screen)
            r2, g2, b2, a2 = layer.split()
            a2 = a2.point(lambda p: int(p * alpha_screen / 255))
            layer = Image.merge('RGBA', (r2, g2, b2, a2))
            img.alpha_composite(layer)
        else:
            img.paste(screen, (x, cyy - screen.height // 2), screen)

    dots = make_dot_layer(3, dot_idx, W // 2, H - 60)
    img.alpha_composite(dots)


def scene_outro(img, t_local):
    """16.5–20s: logo + 'Start free.' pill button + tagline."""
    draw = ImageDraw.Draw(img)
    img.paste(CREAM, [0, 0, W, H])

    p = ease_out_cubic(clamp(t_local / 0.8))
    alpha = int(255 * p)

    # Logo centered, upper region
    lx = W // 2 - logo.width // 2
    ly = H // 2 - 260
    if alpha > 0:
        layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        r2, g2, b2, a2 = logo.split()
        a2 = a2.point(lambda p2: int(p2 * alpha / 255))
        faded = Image.merge('RGBA', (r2, g2, b2, a2))
        layer.paste(faded, (lx, ly))
        img.alpha_composite(layer)

    # "camrhia" wordmark text
    p2 = ease_out_cubic(clamp((t_local - 0.2) / 0.7))
    alpha2 = int(255 * p2)
    draw_text_centered(draw, 'camrhia', ly + 180, F_DISPLAY2, NAVY, alpha2, img)

    # Pill CTA
    p3 = ease_out_cubic(clamp((t_local - 0.4) / 0.7))
    alpha3 = int(255 * p3)
    if alpha3 > 0:
        btn_layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        bd = ImageDraw.Draw(btn_layer)
        cx, cy = W // 2, H // 2 + 60
        draw_pill_button(bd, cx, cy, 'Start free', F_CTA, NAVY, CREAM, pw=400, ph=96)
        r2, g2, b2, a2 = btn_layer.split()
        a2 = a2.point(lambda p2: int(p2 * alpha3 / 255))
        btn_layer = Image.merge('RGBA', (r2, g2, b2, a2))
        img.alpha_composite(btn_layer)

    # Sub-text
    p4 = ease_out_cubic(clamp((t_local - 0.6) / 0.6))
    alpha4 = int(255 * p4)
    draw_text_centered(draw, '14 days free  ·  No commitment', H // 2 + 190, F_SMALL, NAVY2, alpha4, img)
    draw_text_centered(draw, 'camrhia.com', H // 2 + 250, F_SMALL, GOLD, alpha4, img)


# ── Timeline ─────────────────────────────────────────────────────────────────
SCENE_TIMES = [
    (0.0,  2.5,  'hook'),
    (2.5,  6.0,  'reveal'),
    (6.0,  9.5,  'feat1'),
    (9.5,  13.0, 'feat2'),
    (13.0, 16.5, 'feat3'),
    (16.5, 20.0, 'outro'),
]

def render_frame(frame_idx):
    t = frame_idx / FPS
    img = Image.new('RGBA', (W, H), (*CREAM, 255))

    # Find current scene(s) and handle cross-fade transitions
    scene = None
    t_local = 0
    for (s, e, name) in SCENE_TIMES:
        if s <= t < e:
            scene = name
            t_local = t - s
            break

    FADE_DUR = 0.35  # cross-fade duration

    if scene == 'hook':
        scene_hook(img, t_local)
    elif scene == 'reveal':
        scene_reveal(img, t_local)
    elif scene == 'feat1':
        scene_feature(img, t_local, 'portfolio', 'Portfolio', 'Your portfolio is your website.', 0, slide_dir=1)
    elif scene == 'feat2':
        scene_feature(img, t_local, 'sessions', 'Booking', 'Book, contract, get paid.', 1, slide_dir=1)
    elif scene == 'feat3':
        scene_feature(img, t_local, 'marketplace', 'Discovery', 'Get found by clients ready to book.', 2, slide_dir=1)
    elif scene == 'outro':
        scene_outro(img, t_local)

    # Cross-fade: if we're in the last FADE_DUR of a scene, blend into next
    for i, (s, e, name) in enumerate(SCENE_TIMES[:-1]):
        fade_start = e - FADE_DUR
        if fade_start <= t < e:
            next_name = SCENE_TIMES[i+1][2]
            next_t_local = t - e  # will be negative but that's fine — shows frame at t=0
            alpha_overlay = clamp((t - fade_start) / FADE_DUR)

            next_img = Image.new('RGBA', (W, H), (*CREAM, 255))
            nt = 0.0  # show the very start of the next scene
            if next_name == 'reveal':   scene_reveal(next_img, nt)
            elif next_name == 'feat1':  scene_feature(next_img, nt, 'portfolio', 'Portfolio', 'Your portfolio is your website.', 0, slide_dir=1)
            elif next_name == 'feat2':  scene_feature(next_img, nt, 'sessions', 'Booking', 'Book, contract, get paid.', 1, slide_dir=1)
            elif next_name == 'feat3':  scene_feature(next_img, nt, 'marketplace', 'Discovery', 'Get found by clients ready to book.', 2, slide_dir=1)
            elif next_name == 'outro':  scene_outro(next_img, nt)

            # Blend through cream (staggered: old out, then new in)
            if alpha_overlay < 0.5:
                fade_alpha = int(255 * (1 - alpha_overlay * 2))
                r2, g2, b2, _ = img.split()
                a_new = Image.new('L', (W, H), fade_alpha)
                img = Image.merge('RGBA', (r2, g2, b2, a_new))
                base = Image.new('RGBA', (W, H), (*CREAM, 255))
                base.alpha_composite(img)
                img = base
            else:
                fade_alpha = int(255 * ((alpha_overlay - 0.5) * 2))
                r2, g2, b2, _ = next_img.split()
                a_new = Image.new('L', (W, H), fade_alpha)
                next_img = Image.merge('RGBA', (r2, g2, b2, a_new))
                base = Image.new('RGBA', (W, H), (*CREAM, 255))
                base.alpha_composite(next_img)
                img = base
            break

    return img.convert('RGB')


total_frames = int(TOTAL * FPS)
print(f"Rendering {total_frames} frames...")
for i in range(total_frames):
    frame = render_frame(i)
    frame.save(os.path.join(OUT, f'frame_{i:04d}.png'))
    if i % 60 == 0:
        print(f"  {i}/{total_frames} ({i/total_frames*100:.0f}%)")

print("Done.")
