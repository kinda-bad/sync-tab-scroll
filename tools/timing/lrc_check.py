"""Fixed 2026-11-27: frame times now use frame_ms = 1000*hop/sr instead of a nominal 10 ms (sr//100 is exact at 44.1/48 kHz, so earlier results there are unaffected).

Check LRC line starts against the vocal stem, and place them in the tab.

Usage:
  lrc_check.py <lyrics.lrc> <vocals.wav> [--sync syncPoints.json --onsets onsets.json]
               [--gap 120] [--db 30]

1. Vocal phrase starts: RMS envelope of the Demucs vocal stem (10 ms frames,
   50 ms smoothing). A frame is "voiced" if it is within --db dB of the
   95th-percentile level. A phrase start is the first voiced frame after at
   least --gap ms unvoiced. For each LRC line (blank lines skipped), prints
   the nearest phrase start and the difference (LRC - phrase). This checks
   recording <-> LRC agreement only; it says nothing about the tab.
2. With --sync and --onsets (tab-onsets.ts output), maps each LRC time to a
   tab position (bar, beat) through the sync points (piecewise linear, as the
   client does) and lists which tracks have an onset within an eighth note
   before/after, and whether the guitars rest in the preceding beat (only
   informative for songs whose guitar parts actually stop).
   gap 120 / 30 dB found every line in Low; 250 / 35 merged lines that are
   sung back to back.
"""
import argparse, json, re
import numpy as np
import soundfile as sf


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("lrc"); ap.add_argument("vocals")
    ap.add_argument("--sync"); ap.add_argument("--onsets")
    ap.add_argument("--gap", type=float, default=120); ap.add_argument("--db", type=float, default=30)
    a = ap.parse_args()
    lines = []
    for ln in open(a.lrc, encoding="utf-8"):
        m = re.match(r"\[(\d+):(\d+(?:\.\d+)?)\](.*)", ln.strip())
        if m and m.group(3).strip():
            lines.append((int(m.group(1)) * 60000 + float(m.group(2)) * 1000, m.group(0)[:10]))
    x, sr = sf.read(a.vocals, dtype="float32", always_2d=True); x = x.mean(1)
    hop = sr // 100
    e = np.sqrt((x[: len(x) // hop * hop].reshape(-1, hop) ** 2).mean(1))
    e = np.convolve(e, np.ones(5) / 5, mode="same")
    db = 20 * np.log10(e + 1e-9)
    ref = np.percentile(db, 95)
    voiced = db > ref - a.db
    fms = 1000 * hop / sr  # frame_ms
    g = int(a.gap / fms)
    starts = [i * fms for i in range(g, len(voiced)) if voiced[i] and not voiced[i - g:i].any()]
    starts = np.array(starts, dtype=float)
    print(f"{len(starts)} vocal phrase starts (gap >= {a.gap:.0f} ms, within {a.db:.0f} dB of p95)")

    if a.sync:
        sp = json.load(open(a.sync))["syncPoints"]; on = json.load(open(a.onsets))
        bs = on["writtenBarStart"]
        anc = sorted((bs[p["barIndex"]] + p["barPosition"] * (bs[p["barIndex"] + 1] - bs[p["barIndex"]]), p["millisecondOffset"]) for p in sp)
        T = np.array([t for t, _ in anc]); M = np.array([m for _, m in anc])
        def ms_to_tick(ms):
            i = int(np.clip(np.searchsorted(M, ms) - 1, 0, len(M) - 2))
            return T[i] + (ms - M[i]) * (T[i + 1] - T[i]) / (M[i + 1] - M[i])
        tracks = on["tracks"]
    print("LRC line   nearest-phrase  LRC-phrase(ms)" + ("   tab pos (bar.beat)  onsets +-8th   guitars rest in beat before?" if a.sync else ""))
    for ms, tag in lines:
        j = int(np.argmin(np.abs(starts - ms))) if len(starts) else -1
        d = ms - starts[j] if j >= 0 else float("nan")
        s = f"{tag}  {starts[j] / 1000:8.2f}s  {d:+7.0f}"
        if a.sync:
            t = ms_to_tick(ms)
            b = int(np.searchsorted(bs, t, side="right") - 1)
            beat = (t - bs[b]) / 960 + 1
            near = [tr["name"].split("-")[-1].strip()[:10] for tr in tracks if any(abs(o[0] - t) <= 240 for o in tr["onsets"])]
            gtr = [tr for tr in tracks if not tr["percussion"] and "bass" not in tr["name"].lower()]
            rest = not any(t - 960 <= o[0] < t - 120 for tr in gtr for o in tr["onsets"])
            s += f"   bar {b + 1:3d} beat {beat:4.2f}   {','.join(near) or '-':40s} {'yes' if rest else 'no'}"
        print(s)


if __name__ == "__main__":
    main()
