#!/usr/bin/env python3
"""Write a raw lyric line into Track 0's first <Lyrics><Line><Text> CDATA of a .gp file.

Usage: python3 -I sweetness-patch-gp.py <in.gp> <raw-line.txt> <out.gp>
Rewrites the zip entry by entry (same order, same compression), so no macOS
AppleDouble ._* entries can appear. Only the first Line CDATA of Track 0 changes;
it refuses to run if that CDATA is not empty (already patched).
"""
import re, sys, zipfile

src, raw_path, dst = sys.argv[1:4]
raw = open(raw_path, encoding="utf-8").read().strip("\n")
assert "]]>" not in raw

with zipfile.ZipFile(src) as zin:
    gpif = zin.read("Content/score.gpif").decode("utf-8")
    # Track 0 = first <Track ...> inside <Tracks>
    tracks_at = gpif.index("<Tracks>")
    t0 = gpif.index("<Track ", tracks_at)
    t0_end = gpif.index("</Track>", t0)
    lyr = gpif.index('<Lyrics dispatched="true">', t0)
    assert lyr < t0_end, "Track 0 has no <Lyrics> element"
    m = re.compile(r"<Line>\s*<Text>\s*<!\[CDATA\[(.*?)\]\]>", re.S).search(gpif, lyr)
    assert m and m.start() < t0_end
    assert m.group(1) == "", "Track 0 line 0 already has lyric text"
    new_gpif = gpif[: m.start(1)] + raw + gpif[m.end(1):]
    with zipfile.ZipFile(dst, "w") as zout:
        for info in zin.infolist():
            if info.filename.startswith("__MACOSX") or "/._" in "/" + info.filename:
                continue
            data = new_gpif.encode("utf-8") if info.filename == "Content/score.gpif" else zin.read(info)
            zout.writestr(info, data, compress_type=info.compress_type)
print(f"patched {dst}")
