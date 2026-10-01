#!/usr/bin/env python3
"""
Link-preview cards (Open Graph / X): one 1200x630 JPEG per built page, written to public/og/, plus a site default.

Each card is Brian's own job photo (the page's hero or first photo, else the home hero), darkened toward the
bottom-left, with the logo, the page's own H1 and the phone line. Nothing is invented: the words are the page's H1,
the photo is one the page already shows. Base.astro uses /og/{route}.jpg when it exists, else /og/default.jpg.

Run after a build, then build again so the pages pick the cards up:
    npm run build && python3 scripts/og-cards.py && npm run build
Needs Pillow. Fonts: scripts/og-fonts (Archivo and Public Sans, SIL OFL, converted from the @fontsource files).
"""
import html, os, re, sys, glob
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, 'dist')
OUT = os.path.join(ROOT, 'public', 'og')
FONTS = os.path.join(ROOT, 'scripts', 'og-fonts')
W, H = 1200, 630
INK, BONE, PAINT = (19, 18, 15), (243, 240, 232), (71, 150, 13)
PHONE = '970-528-1076'


def font(name, size, weight, width=None):
    f = ImageFont.truetype(os.path.join(FONTS, name), size)
    axes = [weight] + ([width] if width is not None else [])
    f.set_variation_by_axes(axes)
    return f


def cover(img, w, h, focus=(0.5, 0.55)):
    iw, ih = img.size
    s = max(w / iw, h / ih)
    img = img.resize((round(iw * s), round(ih * s)), Image.LANCZOS)
    iw, ih = img.size
    x = int((iw - w) * focus[0]); y = int((ih - h) * focus[1])
    return img.crop((x, y, x + w, y + h))


def wrap(draw, text, f, max_w, max_lines):
    words, lines, cur = text.split(), [], ''
    for word in words:
        t = f'{cur} {word}'.strip()
        if draw.textlength(t, font=f) <= max_w: cur = t
        else:
            lines.append(cur); cur = word
    lines.append(cur)
    if len(lines) > max_lines:
        lines = lines[:max_lines]
        while draw.textlength(lines[-1] + '…', font=f) > max_w and ' ' in lines[-1]: lines[-1] = lines[-1].rsplit(' ', 1)[0]
        lines[-1] += '…'
    return lines


def card(photo_path, title, label, out):
    base = Image.open(photo_path).convert('RGB') if photo_path and os.path.exists(photo_path) else Image.new('RGB', (W, H), INK)
    img = cover(base, W, H)
    # darken: a left-to-right and bottom-up gradient so the words always read
    shade = Image.new('L', (W, H))
    px = shade.load()
    for y in range(H):
        for x in range(0, W, 4):
            v = int(235 * max(0, 1 - x / (W * 0.95)) ** 1.1 * 0.85 + 150 * (y / H) ** 2)
            v = min(235, v)
            for dx in range(4):
                if x + dx < W: px[x + dx, y] = v
    img = Image.composite(Image.new('RGB', (W, H), INK), img, shade)
    d = ImageDraw.Draw(img)
    # logo
    logo = Image.open(os.path.join(ROOT, 'src', 'assets', 'brand', 'logo-light.png')).convert('RGBA')
    lh = 92; logo = logo.resize((round(logo.width * lh / logo.height), lh), Image.LANCZOS)
    img.paste(logo, (64, 52), logo)
    # label
    lf = font('PublicSans.ttf', 26, 650)
    d.text((66, 200), label.upper(), font=lf, fill=(143, 206, 92))
    # title
    # the whole H1, never cut: 3 lines at up to 70px, stepping down; 4 lines from 54px for the long guide titles
    for size in range(70, 40, -4):
        tf = font('Archivo.ttf', size, 820, 108)
        max_lines = 3 if size > 54 else 4
        lines = wrap(d, title, tf, 1000 if max_lines == 4 else 820, 99)
        if len(lines) <= max_lines: break
    lines = wrap(d, title, tf, 1000 if max_lines == 4 else 820, max_lines)
    y = 246 if len(lines) <= 3 else 238
    for l in lines:
        d.text((64, y), l, font=tf, fill=BONE); y += int(size * 1.08)
    # paint underline under the last line, like the site's painted mark
    d.rounded_rectangle((66, y + 10, 66 + min(260, int(d.textlength(lines[-1], font=tf))), y + 18), radius=4, fill=PAINT)
    # foot
    ff = font('PublicSans.ttf', 28, 600)
    d.text((66, H - 78), f'NoCo Turf Co.  ·  {PHONE}  ·  nocoturf.com', font=ff, fill=(214, 209, 196))
    img.save(out, 'JPEG', quality=74, optimize=True, progressive=True)


def section(route):
    if route == '/': return 'Northern Colorado'
    parts = route.strip('/').split('/')
    return {'services': 'Services', 'areas': 'Service areas', 'guides': 'Guides', 'about': 'About', 'contact': 'Book a yard walk',
            'work': 'Our work', 'privacy': 'Privacy', 'terms': 'Terms'}.get(parts[0], 'NoCo Turf Co.')


def main():
    if not os.path.isdir(DIST): sys.exit('no dist/: run npm run build first')
    os.makedirs(OUT, exist_ok=True)
    home_hero = None
    made = 0
    pages = sorted(glob.glob(os.path.join(DIST, '**', 'index.html'), recursive=True))
    for f in pages:
        route = '/' + os.path.relpath(os.path.dirname(f), DIST).replace(os.sep, '/') + '/'
        route = '/' if route == '/./' else route
        h = open(f, encoding='utf-8').read()
        if re.search(r'<meta name="robots" content="noindex', h): continue
        m = re.search(r'<h1[^>]*>([\s\S]*?)</h1>', h)
        if not m: continue
        inner = re.sub(r'<br\s*/?>', ' ', m.group(1))
        title = re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', inner))).strip().rstrip('.')
        title = re.sub(r'\s+([,.;:!?])', r'\1', title)
        # the page's own photo: the first real content image in <main> (a _astro jpg/webp fallback)
        main = h[h.find('<main'):]
        im = re.search(r'<img[^>]*\ssrc="(/_astro/[^"]+\.(?:jpg|jpeg|png|webp))"', main)
        photo = os.path.join(DIST, im.group(1).lstrip('/')) if im else None
        if route == '/': home_hero = photo
        slug = 'home' if route == '/' else route.strip('/').replace('/', '--')
        card(photo or home_hero, title, section(route), os.path.join(OUT, f'{slug}.jpg'))
        made += 1
    card(home_hero, 'Artificial turf and putting greens for Northern Colorado', 'NoCo Turf Co.', os.path.join(OUT, 'default.jpg'))
    print(f'og-cards: {made} page cards + default in public/og/')


if __name__ == '__main__':
    main()
