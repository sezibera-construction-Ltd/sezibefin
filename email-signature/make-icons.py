"""Generate monochrome social icons + a correctly-sized logo for the
email signature. Icons are drawn at 4x the display size so they stay
crisp on high-DPI screens.

Output: assets/images/email/
"""

from PIL import Image, ImageDraw, ImageFont
import os

OUT = os.path.join("..", "assets", "images", "email")
os.makedirs(OUT, exist_ok=True)

SIZE = 96          # rendered size (displayed at 24px)
INK = (21, 21, 21, 255)
WHITE = (255, 255, 255, 255)
BOLD = r"C:\Windows\Fonts\arialbd.ttf"


def base(radius_ratio=0.24):
    """Dark rounded-square tile."""
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = int(SIZE * radius_ratio)
    d.rounded_rectangle([0, 0, SIZE - 1, SIZE - 1], radius=r, fill=INK)
    return img, d


def centre_text(d, text, font, dy=0, fill=WHITE):
    l, t, r, b = d.textbbox((0, 0), text, font=font)
    x = (SIZE - (r - l)) / 2 - l
    y = (SIZE - (b - t)) / 2 - t + dy
    d.text((x, y), text, font=font, fill=fill)


def facebook():
    img, d = base()
    centre_text(d, "f", ImageFont.truetype(BOLD, 62), dy=-2)
    return img


def linkedin():
    img, d = base()
    centre_text(d, "in", ImageFont.truetype(BOLD, 40), dy=0)
    return img


def x_icon():
    img, d = base()
    centre_text(d, "X", ImageFont.truetype(BOLD, 48), dy=0)
    return img


def instagram():
    img, d = base()
    m, w = 24, 5                      # inset and stroke weight
    d.rounded_rectangle([m, m, SIZE - m, SIZE - m],
                        radius=14, outline=WHITE, width=w)
    c, rr = SIZE / 2, 13              # lens
    d.ellipse([c - rr, c - rr, c + rr, c + rr], outline=WHITE, width=w)
    dot = 3.2                         # top-right dot
    dx, dy = SIZE - m - 11, m + 11
    d.ellipse([dx - dot, dy - dot, dx + dot, dy + dot], fill=WHITE)
    return img


icons = {
    "social-linkedin.png": linkedin(),
    "social-instagram.png": instagram(),
    "social-facebook.png": facebook(),
    "social-x.png": x_icon(),
}

for name, im in icons.items():
    p = os.path.join(OUT, name)
    im.save(p, "PNG", optimize=True)
    print(f"{name:26} {im.size[0]}x{im.size[1]}  {os.path.getsize(p):>6} B")

# Email logo: black wordmark, sized for 2x retina at 168px display
src = Image.open(os.path.join("..", "assets", "images", "logo-black.png")).convert("RGBA")
target_w = 336
h = round(src.height * target_w / src.width)
logo = src.resize((target_w, h), Image.LANCZOS)
p = os.path.join(OUT, "logo-email.png")
logo.save(p, "PNG", optimize=True)
print(f"{'logo-email.png':26} {logo.size[0]}x{logo.size[1]}  {os.path.getsize(p):>6} B")

# Contact sheet so the icons can be eyeballed before shipping
sheet = Image.new("RGB", (4 * 120, 120), (255, 255, 255))
for i, im in enumerate(icons.values()):
    s = im.resize((72, 72), Image.LANCZOS)
    sheet.paste(s, (i * 120 + 24, 24), s)
sheet.save("_icons-preview.png")
print("preview -> _icons-preview.png")
