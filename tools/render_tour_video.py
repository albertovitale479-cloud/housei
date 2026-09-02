"""Render a scroll-scrubbable cinematic tour from Housei's art-directed scenes.

Requires project-local dependencies from .venv; does not install system packages.
"""

from pathlib import Path
import math

import imageio.v2 as imageio
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
OUTPUT = ASSETS / "casa-aurea-tour-optimized.mp4"
WIDTH, HEIGHT, FPS = 960, 540, 24


def load(name: str) -> Image.Image:
    return Image.open(ASSETS / name).convert("RGB")


def ease(value: float) -> float:
    return value * value * (3 - 2 * value)


def camera(source: Image.Image, scale: float, anchor_x: float, anchor_y: float, drift_x: float = 0, drift_y: float = 0) -> Image.Image:
    """A virtual camera that pushes through a wide architectural image."""
    ratio = max(WIDTH / source.width, HEIGHT / source.height) * scale
    resized = source.resize((round(source.width * ratio), round(source.height * ratio)), Image.Resampling.LANCZOS)
    max_x = max(resized.width - WIDTH, 0)
    max_y = max(resized.height - HEIGHT, 0)
    left = round(max_x * anchor_x + drift_x)
    top = round(max_y * anchor_y + drift_y)
    left = min(max(left, 0), max_x)
    top = min(max(top, 0), max_y)
    return resized.crop((left, top, left + WIDTH, top + HEIGHT))


def grade(frame: Image.Image, amount: float) -> Image.Image:
    # A restrained moving-film texture, not a static slideshow treatment.
    frame = ImageEnhance.Contrast(frame).enhance(1.04)
    if amount:
        frame = frame.filter(ImageFilter.GaussianBlur(amount))
    return frame


def threshold(outgoing: Image.Image, incoming: Image.Image, t: float, tint: tuple[int, int, int]) -> Image.Image:
    """Create a travelling-through-the-threshold transition, rather than a dissolve."""
    p = ease(t)
    # Exit shot accelerates toward the opening; the next room already moves outward.
    pushed = camera(outgoing, 1 + 1.2 * p, .61, .45)
    revealed = camera(incoming, 2.15 - 1.05 * p, .50, .45)
    outgoing_blur = pushed.filter(ImageFilter.GaussianBlur(2.4 * p))
    incoming_blur = revealed.filter(ImageFilter.GaussianBlur(2.0 * (1 - p)))
    blend = Image.blend(outgoing_blur, incoming_blur, p)
    # Short exposure bloom hides the edit at the instant the lens crosses the frame.
    bloom = max(0, 1 - abs(p - .5) * 3.1) * .3
    if bloom:
        blend = Image.blend(blend, Image.new("RGB", (WIDTH, HEIGHT), tint), bloom)
    return blend


def make_video() -> None:
    exterior = load("villa-hero.png")
    salon = load("villa-salon.png")
    suite = load("villa-suite.png")
    duration = 19
    frames = duration * FPS
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    with imageio.get_writer(
        OUTPUT, fps=FPS, codec="libx264", quality=8, macro_block_size=1,
        ffmpeg_params=[
            "-movflags", "+faststart", "-pix_fmt", "yuv420p",
            "-crf", "27", "-preset", "slow", "-g", "12",
            "-keyint_min", "12", "-sc_threshold", "0",
        ],
    ) as writer:
        for frame_index in range(frames):
            second = frame_index / FPS
            grain_drift = math.sin(frame_index * .11)

            if second < 5.8:
                p = ease(second / 5.8)
                frame = camera(exterior, 1.01 + .68 * p, .34 + .42 * p, .51 - .10 * p, grain_drift * 1.4)
            elif second < 8.0:
                p = (second - 5.8) / 2.2
                outgoing = camera(exterior, 1.68 + .42 * p, .75, .39)
                incoming = camera(salon, 1.02 + .13 * p, .49, .42)
                frame = threshold(outgoing, incoming, p, (247, 233, 207))
            elif second < 13.6:
                p = ease((second - 8.0) / 5.6)
                frame = camera(salon, 1.13 + .37 * p, .46 + .10 * p, .43, grain_drift * .8)
            elif second < 15.8:
                p = (second - 13.6) / 2.2
                outgoing = camera(salon, 1.48 + .46 * p, .55, .42)
                incoming = camera(suite, 1.03 + .14 * p, .47, .46)
                frame = threshold(outgoing, incoming, p, (213, 222, 229))
            else:
                p = ease((second - 15.8) / 3.2)
                frame = camera(suite, 1.12 + .27 * p, .45 + .13 * p, .46, grain_drift * .6)

            writer.append_data(np.asarray(grade(frame, .12)))

    print(f"Rendered {OUTPUT.relative_to(ROOT)} ({duration}s, {frames} frames)")


if __name__ == "__main__":
    make_video()
