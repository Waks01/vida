import math, os
from PIL import Image, ImageDraw

OUT = r"C:\Users\kenik\OneDrive\Desktop\Vida\assets"
os.makedirs(OUT, exist_ok=True)

# neon stops
PINK   = (255, 45, 149)
VIOLET = (139, 45, 255)
CYAN   = (34, 211, 238)
BG     = (15, 15, 20)

def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

def grad_color(t):
    # t 0..1 across pink->violet->cyan
    if t < 0.5:
        return lerp(PINK, VIOLET, t / 0.5)
    return lerp(VIOLET, CYAN, (t - 0.5) / 0.5)

def add_glow(img, draw, paths, width, glow=True):
    # draw on a temp layer for blur-based glow
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    for p, w in paths:
        ld.line(p, fill=(255, 45, 149, 255), width=w, joint="curve")
    if glow:
        for i in range(6, 0, -2):
            blurred = layer.filter(ImageFilter.GaussianBlur(i * 2))
            img.alpha_composite(blurred)
    img.alpha_composite(layer)

def draw_mark(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx = size / 2
    s = size / 100.0  # scale factor (viewBox 100)
    # main V-loop path points (viewBox 100)
    # outer loop
    pts = []
    # approximate the curve with many sampled points for gradient
    def bez(p0, p1, p2, p3, n=40):
        out = []
        for i in range(n + 1):
            t = i / n
            mt = 1 - t
            x = mt**3*p0[0] + 3*mt*mt*t*p1[0] + 3*mt*t*t*p2[0] + t**3*p3[0]
            y = mt**3*p0[1] + 3*mt*mt*t*p1[1] + 3*mt*t*t*p2[1] + t**3*p3[1]
            out.append((x, y))
        return out
    # right side of loop (down)
    seg1 = bez((50, 16), (30, 40), (14, 58), (14, 70))
    seg2 = bez((14, 70), (14, 82), (26, 90), (50, 90))
    seg3 = bez((50, 90), (74, 90), (86, 82), (86, 70))
    seg4 = bez((86, 70), (86, 58), (70, 40), (50, 16))
    # bottom smile
    seg5 = bez((34, 64), (40, 74), (60, 74), (66, 64))
    all_pts = seg1 + seg2 + seg3 + seg4
    # draw gradient stroke by segment
    w = max(2, int(11 * s))
    for i in range(len(all_pts) - 1):
        t = i / (len(all_pts) - 1)
        col = grad_color(t)
        a = (all_pts[i][0]*s, all_pts[i][1]*s)
        b = (all_pts[i+1][0]*s, all_pts[i+1][1]*s)
        d.line([a, b], fill=col + (255,), width=w, joint="curve")
    # smile gradient
    w2 = max(2, int(9 * s))
    for i in range(len(seg5) - 1):
        t = i / (len(seg5) - 1)
        col = grad_color(t)
        a = (seg5[i][0]*s, seg5[i][1]*s)
        b = (seg5[i+1][0]*s, seg5[i+1][1]*s)
        d.line([a, b], fill=col + (255,), width=w2, joint="curve")
    return img

from PIL import ImageFilter

# 1. App Icon (1024, square rounded, black bg)
def make_app_icon(size=1024):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 255))
    mark = draw_mark(size)
    # glow underlay
    glow = mark.filter(ImageFilter.GaussianBlur(size * 0.02))
    img.alpha_composite(glow)
    img.alpha_composite(mark)
    # rounded corners mask
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size, size], radius=int(size*0.22), fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out

# 2. Splash (1280)
def make_splash(size=1280):
    img = Image.new("RGBA", (size, size), BG + (255,))
    mark = draw_mark(int(size * 0.30))
    img.alpha_composite(mark, (int(size*0.5 - mark.width/2), int(size*0.34)))
    # wordmark
    from PIL import ImageFont
    try:
        f = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", int(size*0.06))
    except Exception:
        f = ImageFont.load_default()
    d = ImageDraw.Draw(img)
    txt = "Vida"
    tw = d.textlength(txt, font=f)
    d.text((size*0.5 - tw/2, size*0.62), txt, font=f, fill=(255,255,255,255))
    return img

# 3. Adaptive foreground (transparent, 1024)
def make_adaptive(size=1024):
    mark = draw_mark(size)
    glow = mark.filter(ImageFilter.GaussianBlur(size*0.015))
    out = Image.new("RGBA", (size, size), (0,0,0,0))
    out.alpha_composite(glow)
    out.alpha_composite(mark)
    return out

# 4. Monochrome (black outline on transparent, 1024)
def make_mono(size=1024):
    img = Image.new("RGBA", (size, size), (0,0,0,0))
    d = ImageDraw.Draw(img)
    s = size/100.0
    def bez(p0,p1,p2,p3,n=40):
        out=[]
        for i in range(n+1):
            t=i/n; mt=1-t
            x=mt**3*p0[0]+3*mt*mt*t*p1[0]+3*mt*t*t*p2[0]+t**3*p3[0]
            y=mt**3*p0[1]+3*mt*mt*t*p1[1]+3*mt*t*t*p2[1]+t**3*p3[1]
            out.append((x,y))
        return out
    segs = bez((50,16),(30,40),(14,58),(14,70))+bez((14,70),(14,82),(26,90),(50,90))+bez((50,90),(74,90),(86,82),(86,70))+bez((86,70),(86,58),(70,40),(50,16))
    w=max(2,int(11*s))
    for i in range(len(segs)-1):
        d.line([(segs[i][0]*s,segs[i][1]*s),(segs[i+1][0]*s,segs[i+1][1]*s)],fill=(0,0,0,255),width=w,joint="curve")
    sm=bez((34,64),(40,74),(60,74),(66,64))
    w2=max(2,int(9*s))
    for i in range(len(sm)-1):
        d.line([(sm[i][0]*s,sm[i][1]*s),(sm[i+1][0]*s,sm[i+1][1]*s)],fill=(0,0,0,255),width=w2,joint="curve")
    return img

# 5. Favicon (64)
def make_fav(size=64):
    img = Image.new("RGBA", (size, size), (0,0,0,255))
    mark = draw_mark(size)
    glow = mark.filter(ImageFilter.GaussianBlur(size*0.03))
    img.alpha_composite(glow)
    img.alpha_composite(mark)
    return img

# Write PNGs
make_app_icon(1024).save(os.path.join(OUT, "app-icon.png"))
make_splash(1280).save(os.path.join(OUT, "splash.png"))
make_adaptive(1024).save(os.path.join(OUT, "adaptive-foreground.png"))
make_mono(1024).save(os.path.join(OUT, "monochrome.png"))
make_fav(64).save(os.path.join(OUT, "favicon.png"))

# SVG source (vector) for the mark
svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <defs>
    <linearGradient id="vida" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ff2d95"/>
      <stop offset="0.5" stop-color="#8b2dff"/>
      <stop offset="1" stop-color="#22d3ee"/>
    </linearGradient>
  </defs>
  <g fill="none" stroke="url(#vida)" stroke-linecap="round" stroke-linejoin="round">
    <path d="M50 16 C30 40 14 58 14 70 C14 82 26 90 50 90 C74 90 86 82 86 70 C86 58 70 40 50 16 Z" stroke-width="11"/>
    <path d="M34 64 C40 74 60 74 66 64" stroke-width="9"/>
  </g>
</svg>'''
with open(os.path.join(OUT, "logo.svg"), "w") as f:
    f.write(svg)

print("Generated:", os.listdir(OUT))
