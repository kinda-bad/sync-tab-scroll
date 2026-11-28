"""Propose multi-point syncPoints from a whole-song alignment.

Usage: propose_sync.py <meta.json> <app.json> <g.json> <bpm> [window_bars]

For each window of `window_bars` bars with >= 4 confident words (score >= 0.3),
the median delta (sung - shown) is the drift there; an anchor goes at the start
of the window's middle bar, at (current app time of that bar) + drift.
The bar-0 and final-bar anchors are shifted by the nearest window's drift.

Prints the proposed syncPoints and a before/after check: deltas recomputed
from the same measured word times under the new mapping (no re-alignment
needed, since where the words are sung doesn't change). Writes
<g.json stem>-sync.json with {"syncPoints": [...]}.
"""
import json, statistics, sys

meta_p, app_p, g_p, bpm = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4])
W = int(sys.argv[5]) if len(sys.argv) > 5 else 8
# Optional: recording ms of bar 1 beat 1, measured from the instrumental onset
START = float(sys.argv[6]) if len(sys.argv) > 6 and sys.argv[6] != "-" else None
meta, app, words = json.load(open(meta_p)), json.load(open(app_p)), json.load(open(g_p))
bs = app["barStart"]  # tick at start of each bar (0-based), plus total
nbars = len(bs) - 1

def anchors_of(points):
    a = sorted((bs[p["barIndex"]] + p["barPosition"] * (bs[p["barIndex"] + 1] - bs[p["barIndex"]]), p["millisecondOffset"]) for p in points)
    return a

def tick_to_ms(anchors, t):
    i = 0
    while i < len(anchors) - 2 and t >= anchors[i + 1][0]:
        i += 1
    (t0, m0), (t1, m1) = anchors[i], anchors[i + 1]
    return m0 + (t - t0) * (m1 - m0) / (t1 - t0)

old = anchors_of(meta["syncPoints"])
conf = [w for w in words if (w["score"] or 0) >= 0.3]
for w in conf:  # recompute appMs from the tick so old/new use identical math
    w["oldMs"] = tick_to_ms(old, w["tick"])

groups = {}
for w in conf:
    groups.setdefault((w["bar"] - 1) // W, []).append(w["measuredMs"] - w["oldMs"])
knots = []
for g, d in sorted(groups.items()):
    if len(d) < 4:
        continue
    bi = min(g * W + W // 2, nbars - 1)
    knots.append((bi, statistics.median(d), len(d)))

points = []
first, last = knots[0][1], knots[-1][1]
for bi, pos, drift in [(0, 0, first)] + [(k[0], 0, k[1]) for k in knots] + [(nbars - 1, 1, last)]:
    t = bs[bi] + pos * (bs[bi + 1] - bs[bi])
    points.append({"barIndex": bi, "barOccurence": 0, "barPosition": pos, "millisecondOffset": round(tick_to_ms(old, t) + drift, 1)})
# Drop duplicates (a knot landing on bar 0 or the last bar).
seen, uniq = set(), []
for p in points:
    k = (p["barIndex"], p["barPosition"])
    if k not in seen:
        seen.add(k); uniq.append(p)
points = uniq
if START is not None:
    points[0]["millisecondOffset"] = START
elif points[0]["millisecondOffset"] < 0:
    # Recording begins partway into bar 1 (a pickup bar): anchor ms 0 at the
    # bar position where the next segment's rate puts it.
    p0, p1 = points[0], points[1]
    t1 = bs[p1["barIndex"]]
    rate = (p1["millisecondOffset"] - p0["millisecondOffset"]) / (t1 - bs[0])
    t0 = -p0["millisecondOffset"] / rate
    p0["barPosition"] = round(t0 / (bs[1] - bs[0]), 4)
    p0["millisecondOffset"] = 0.0
new = anchors_of(points)

quarter = 960  # alphaTab ticks per quarter note
print(f"{'bar':>4} {'ms':>9}  {'drift':>6}  {'bpm to next':>11}")
for (t, m), (t2, m2), p in zip(new, new[1:] + [(None, None)], points):
    rate = f"{(t2 - t) * 60000 / (quarter * (m2 - m)):.2f}" if t2 is not None else ""
    d = m - tick_to_ms(old, t)
    print(f"{p['barIndex'] + 1 + p['barPosition']:>4} {m:>9.0f}  {d:>+6.0f}  {rate:>11}")
if points[0]["millisecondOffset"] < 0:
    print("WARNING: bar-0 anchor is negative")

def summary(key):
    ds = [w["measuredMs"] - w[key] for w in conf]
    per = {}
    for w, d in zip(conf, ds):
        per.setdefault((w["bar"] - 1) // W, []).append(d)
    meds = [statistics.median(v) for v in per.values() if len(v) >= 4]
    return statistics.median(abs(d) for d in ds), max(abs(m) for m in meds), sum(abs(d) > 30000 / bpm for d in ds)

for w in conf:
    w["newMs"] = tick_to_ms(new, w["tick"])
for label, key in [("before", "oldMs"), ("after", "newMs")]:
    med, worst, over = summary(key)
    print(f"{label:>6}: |delta| median {med:.0f} ms, worst {W}-bar window {worst:.0f} ms, words > half-beat {over}/{len(conf)}")
json.dump({"syncPoints": points}, open(g_p.replace("-g.json", "-sync.json"), "w"), indent=1)
