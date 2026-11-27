#!/usr/bin/env python3
"""Replace a track's raw lyric line (its first <Lyrics><Line><Text> CDATA) in a .gp file.

Usage: python3 -I gp-replace-raw-line.py <in.gp> <track-index> <expected-old.txt> <new.txt> <out.gp>

Generalization of sweetness-patch-gp.py for lines that already have text:
- <track-index> picks the Nth <Track ...> inside <Tracks> (0-based).
- The current CDATA must equal <expected-old.txt> exactly (byte for byte, after
  UTF-8 decoding), so the script refuses to run on an already-patched or
  different file. Pass /dev/null as <expected-old.txt> for an empty line.
- <new.txt> is written verbatim (no newline stripping: a raw line's trailing
  newline is part of the line).
Rewrites the zip entry by entry (same order, same compression), so no macOS
AppleDouble ._* entries can appear. Nothing else in score.gpif changes.
"""
import re, sys, zipfile

src, track, old_path, new_path, dst = sys.argv[1:6]
track = int(track)
old = open(old_path, encoding="utf-8").read()
new = open(new_path, encoding="utf-8").read()
assert "]]>" not in new

with zipfile.ZipFile(src) as zin:
    gpif = zin.read("Content/score.gpif").decode("utf-8")
    pos = gpif.index("<Tracks>")
    for _ in range(track + 1):
        t_start = gpif.index("<Track ", pos)
        pos = t_start + 1
    t_end = gpif.index("</Track>", t_start)
    lyr = gpif.index('<Lyrics dispatched="true">', t_start)
    assert lyr < t_end, f"Track {track} has no <Lyrics> element"
    m = re.compile(r"<Line>\s*<Text>\s*<!\[CDATA\[(.*?)\]\]>", re.S).search(gpif, lyr)
    assert m and m.start() < t_end
    assert m.group(1) == old, f"Track {track} line 0 does not match {old_path}; refusing"
    new_gpif = gpif[: m.start(1)] + new + gpif[m.end(1):]
    with zipfile.ZipFile(dst, "w") as zout:
        for info in zin.infolist():
            if info.filename.startswith("__MACOSX") or "/._" in "/" + info.filename:
                continue
            data = new_gpif.encode("utf-8") if info.filename == "Content/score.gpif" else zin.read(info)
            zout.writestr(info, data, compress_type=info.compress_type)
print(f"patched {dst}")
