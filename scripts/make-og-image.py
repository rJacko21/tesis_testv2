"""
Genera `public/og.png` (1200 × 630), la imagen para compartir en redes.

La web original usaba un `og:image` relativo, y en `/en/privacy` apuntaba
a la imagen «image-not-found» del CMS (F-12). Aquí es una imagen fija con
el arte de la portada; Next.js la publica con URL absoluta gracias a
`metadataBase` (layout).

Uso: `python3 scripts/make-og-image.py` (requiere Pillow).
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
W, H = 1200, 630
TOP, BOTTOM = (22, 74, 122), (7, 29, 51)  # navy-700 → navy-950 (globals.css)
GOLD = (242, 205, 122)  # gold-300
SKY = (228, 241, 251)  # sky-100

img = Image.new("RGB", (W, H))
draw = ImageDraw.Draw(img)
for y in range(H):
    t = y / (H - 1)
    draw.line([(0, y), (W, y)], fill=tuple(round(a + (b - a) * t) for a, b in zip(TOP, BOTTOM)))

art = Image.open(ROOT / "src/assets/characters/hero-noble.webp").convert("RGBA")
art.thumbnail((520, 600))
img.paste(art, (W - art.width - 60, H - art.height), art)

font = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
draw.text((80, 210), "Florensia", font=ImageFont.truetype(font, 112), fill=GOLD)
draw.text((84, 360), "Free anime MMORPG", font=ImageFont.truetype(font, 44), fill=SKY)
draw.text((84, 420), "Land · Sea · Guilds", font=ImageFont.truetype(font, 36), fill=SKY)

out = ROOT / "public/og.png"
img.save(out, optimize=True)
print(f"{out.relative_to(ROOT)}: {out.stat().st_size // 1024} KB")
