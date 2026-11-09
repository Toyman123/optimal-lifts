from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
BACKGROUND = "#eaf0f4"
FOREST = "#173f2c"
SHAPES = [
    (58, 204, 112, 308, 27),
    (126, 148, 198, 364, 36),
    (190, 226, 322, 286, 26),
    (314, 148, 386, 364, 36),
    (400, 204, 454, 308, 27),
]


def create_icon(size: int, filename: str) -> None:
    scale = size / 512
    image = Image.new("RGB", (size, size), BACKGROUND)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=round(112 * scale), fill=BACKGROUND)
    for left, top, right, bottom, radius in SHAPES:
        draw.rounded_rectangle(
            tuple(round(value * scale) for value in (left, top, right, bottom)),
            radius=round(radius * scale),
            fill=FOREST,
        )
    image.save(ROOT / "public" / filename, optimize=True)


create_icon(180, "apple-touch-icon.png")
create_icon(192, "icon-192.png")
create_icon(512, "icon-512.png")
