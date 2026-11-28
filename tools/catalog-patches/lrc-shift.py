#!/usr/bin/env python3
"""Shift every [mm:ss.xx] timestamp in an .lrc file by a fixed offset.

Usage: lrc-shift.py <lyrics.lrc> <offset_ms>

Rewrites the file in place. Lines without a leading timestamp are left
alone, and times that would go negative are clamped to 0. Output keeps
the two-decimal [mm:ss.xx] form.
"""
import re
import sys

path, offset_ms = sys.argv[1], int(sys.argv[2])
stamp = re.compile(r"\[(\d+):(\d+(?:\.\d+)?)\]")


def shift(m: re.Match) -> str:
    cs = round((int(m.group(1)) * 60 + float(m.group(2))) * 100) + round(offset_ms / 10)
    cs = max(cs, 0)
    return f"[{cs // 6000:02d}:{cs % 6000 / 100:05.2f}]"


with open(path, encoding="utf-8") as f:
    lines = f.read().split("\n")
out = [stamp.sub(shift, line, count=1) if stamp.match(line) else line for line in lines]
with open(path, "w", encoding="utf-8") as f:
    f.write("\n".join(out))
