#!/usr/bin/env python3
"""
Generate the map pin icons used by the Customer Map screen.

Writes src/assets/map/{customer-pin,customer-pin-selected}{,@2x,@3x}.png.
React Native picks the right density; MapLibre draws them as a symbol layer
(fast for thousands of customers, no React views per pin).

Requires Pillow (`pip install pillow`). Re-run after changing colours/sizes:
    python3 scripts/make_map_icons.py
"""
import os
from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), "..", "src", "assets", "map")
SUPERSAMPLE = 8  # draw large, then downscale for smooth anti-aliased edges


def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def pin(w_dp, h_dp, scale, top, bottom, dot="#FFFFFF", rim="#FFFFFF"):
    """Teardrop marker; the tip is at the bottom-centre (icon-anchor: bottom)."""
    k = scale * SUPERSAMPLE
    W, H = int(w_dp * k), int(h_dp * k)
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))

    cx = W / 2
    r = w_dp * 0.38 * k               # head radius
    cy = r + 2.0 * k                  # head centre (room for the rim)
    tip_y = H - 5.0 * k               # leave room below for the ground shadow

    # Ground shadow: soft ellipse centred on the tip, fully inside the canvas.
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sw, sh = r * 0.75, r * 0.22
    sd.ellipse((cx - sw, tip_y - sh, cx + sw, tip_y + sh), fill=(0, 0, 0, 80))
    shadow = shadow.filter(ImageFilter.GaussianBlur(1.2 * k))
    img.alpha_composite(shadow)

    def teardrop(draw, grow, fill):
        # Circle + the two exact tangent lines from the tip: a smooth teardrop.
        rr = r + grow
        ty = tip_y + grow * 1.4
        d = ty - cy
        tx = rr * (1 - (rr / d) ** 2) ** 0.5
        tyy = cy + rr * rr / d
        draw.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), fill=fill)
        draw.polygon([(cx - tx, tyy), (cx + tx, tyy), (cx, ty)], fill=fill)

    # White rim (slightly larger shape behind the body).
    rim_img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    teardrop(ImageDraw.Draw(rim_img), 2.0 * k, hex_rgb(rim) + (255,))
    img.alpha_composite(rim_img)

    # Body with a vertical gradient (lighter top -> brand colour).
    mask = Image.new("L", (W, H), 0)
    teardrop(ImageDraw.Draw(mask), 0, 255)
    grad = Image.new("RGBA", (W, H))
    t, b = hex_rgb(top), hex_rgb(bottom)
    gd = ImageDraw.Draw(grad)
    for y in range(H):
        f = min(1.0, max(0.0, (y - (cy - r)) / (tip_y - (cy - r))))
        gd.line([(0, y), (W, y)], fill=tuple(int(t[i] + (b[i] - t[i]) * f) for i in range(3)) + (255,))
    body = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    body.paste(grad, (0, 0), mask)
    img.alpha_composite(body)

    # Centre dot.
    d = ImageDraw.Draw(img)
    dr = r * 0.36
    d.ellipse((cx - dr, cy - dr, cx + dr, cy + dr), fill=hex_rgb(dot) + (255,))

    return img.resize((int(w_dp * scale), int(h_dp * scale)), Image.LANCZOS)


def main():
    os.makedirs(OUT, exist_ok=True)
    variants = {
        "customer-pin": dict(w_dp=26, h_dp=38, top="#2F80D1", bottom="#0F4C81"),
        "customer-pin-selected": dict(w_dp=36, h_dp=52, top="#FBBF24", bottom="#D97706"),
    }
    for name, spec in variants.items():
        for scale, suffix in ((1, ""), (2, "@2x"), (3, "@3x")):
            path = os.path.join(OUT, f"{name}{suffix}.png")
            pin(scale=scale, **spec).save(path, optimize=True)
            print("wrote", os.path.relpath(path), Image.open(path).size)


if __name__ == "__main__":
    main()
