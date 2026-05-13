"""
Generate ASS subtitle files with word-by-word reveal and yellow highlight on active word.
One Dialogue event per word — avoids libass karaoke tag quirks and allows per-word color.
"""
import json
import math
from pathlib import Path

from backend.services.transcribe import Word


def _hex_to_ass(hex_color: str, alpha: float = 1.0) -> str:
    """Convert #RRGGBB to ASS &HAABBGGRR format."""
    h = hex_color.lstrip("#")
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    a = int((1.0 - alpha) * 255)
    return f"&H{a:02X}{b:02X}{g:02X}{r:02X}"


def _seconds_to_ass_time(sec: float) -> str:
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = sec % 60
    return f"{h}:{m:02d}:{s:05.2f}"


def generate_ass(
    words: list[Word],
    clip_start: float,
    clip_end: float,
    output_path: Path,
    config: dict,
    play_res_x: int = 1080,
    play_res_y: int = 1920,
) -> None:
    """
    Generate an ASS file for the given clip.
    Words are rebased to clip-local time (clip_start → 0).
    """
    font_family = config.get("font_family", "Arial Black")
    font_size = config.get("font_size", 90)
    primary_hex = config.get("primary_color", "#FFFFFF")
    highlight_hex = config.get("highlight_color", "#FFFF00")
    outline_hex = config.get("outline_color", "#000000")
    outline_width = config.get("outline_width", 3)
    shadow_alpha = config.get("shadow_alpha", 0.5)
    shadow_offset = config.get("shadow_offset", 1.5)
    pos_y_ratio = config.get("position_y_ratio", 0.65)
    max_words_line = config.get("max_words_per_line", 2)
    margin_bottom = config.get("safe_margin_bottom_px", 450)
    margin_left = config.get("safe_margin_left_px", 60)
    margin_right = config.get("safe_margin_right_px", 120)

    primary_ass = _hex_to_ass(primary_hex)
    highlight_ass = _hex_to_ass(highlight_hex)
    outline_ass = _hex_to_ass(outline_hex)
    shadow_ass = _hex_to_ass("#000000", shadow_alpha)

    # Position: center-screen, above YouTube UI overlay zone
    center_x = play_res_x // 2
    center_y = int(play_res_y * pos_y_ratio)
    # Ensure we're above the bottom safe zone
    max_y = play_res_y - margin_bottom - font_size
    center_y = min(center_y, max_y)

    # Filter words in clip range
    clip_words = [w for w in words if w.start >= clip_start - 0.05 and w.end <= clip_end + 0.05]

    # Group into lines of max_words_line
    lines: list[list[Word]] = []
    current: list[Word] = []
    for w in clip_words:
        current.append(w)
        if len(current) >= max_words_line:
            lines.append(current)
            current = []
    if current:
        lines.append(current)

    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {play_res_x}
PlayResY: {play_res_y}
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.709

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Word,{font_family},{font_size},{primary_ass},{highlight_ass},{outline_ass},{shadow_ass},-1,0,0,0,100,100,0,0,1,{outline_width},{shadow_offset},5,{margin_left},{margin_right},0,1
Style: WordHL,{font_family},{font_size},{highlight_ass},{highlight_ass},{outline_ass},{shadow_ass},-1,0,0,0,100,100,0,0,1,{outline_width},{shadow_offset},5,{margin_left},{margin_right},0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

    events: list[str] = []

    for line_words in lines:
        if not line_words:
            continue

        line_start = line_words[0].start - clip_start
        line_end = line_words[-1].end - clip_start
        line_text = " ".join(w.word.strip() for w in line_words)

        for active_idx, active_word in enumerate(line_words):
            word_start = active_word.start - clip_start
            word_end = active_word.end - clip_start

            # Skip words outside clip bounds (after rebasing)
            if word_end < 0 or word_start > (clip_end - clip_start):
                continue

            word_start = max(0.0, word_start)
            word_end = max(word_start + 0.05, word_end)

            # Build the line with current word highlighted
            parts = []
            for i, w in enumerate(line_words):
                text = w.word.strip()
                if i == active_idx:
                    parts.append(f"{{\\1c{highlight_ass}}}{text}{{\\1c{primary_ass}}}")
                else:
                    parts.append(text)

            line_display = " ".join(parts)

            t_start = _seconds_to_ass_time(word_start)
            t_end = _seconds_to_ass_time(word_end)

            events.append(
                f"Dialogue: 0,{t_start},{t_end},Word,,0,0,0,,{{\\pos({center_x},{center_y})}}{line_display}"
            )

    output_path.write_text(header + "\n".join(events) + "\n", encoding="utf-8")
