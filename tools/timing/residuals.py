"""Split timing error into smooth drift (fixable by sync points) and local
lyric-placement errors (residuals after removing the drift).

Drift curve: median delta per 8-bar window (confident words only), linearly
interpolated by bar. Flags words whose residual exceeds half a beat."""
import json, statistics, sys
path, bpm = sys.argv[1], float(sys.argv[2])
check = [int(b) for b in sys.argv[3].split(",")] if len(sys.argv) > 3 else []
r = [x for x in json.load(open(path)) if (x["score"] or 0) >= 0.3]
W = 8
knots = {}
for x in r: knots.setdefault((x["bar"] - 1) // W, []).append(x["deltaMs"])
pts = sorted(((g * W + W / 2 + 0.5), statistics.median(d)) for g, d in knots.items() if len(d) >= 3)
def drift(bar):
    if bar <= pts[0][0]: return pts[0][1]
    for (b0, d0), (b1, d1) in zip(pts, pts[1:]):
        if bar <= b1: return d0 + (d1 - d0) * (bar - b0) / (b1 - b0)
    return pts[-1][1]
half = 30000 / bpm
res = [(x, x["deltaMs"] - drift(x["bar"])) for x in r]
flag = [(x, e) for x, e in res if abs(e) > half]
print(f"confident words={len(r)}  half-beat={half:.0f}ms  flagged after drift removed={len(flag)} ({100*len(flag)/len(r):.0f}%)")
print("  residual |median| =", round(statistics.median(abs(e) for _, e in res)), "ms")
bars = {}
for x, e in flag: bars.setdefault(x["bar"], []).append(f"{x['word']}({e:+.0f})")
print("  flagged bars:", "; ".join(f"{b}: {' '.join(v)}" for b, v in sorted(bars.items())) or "none")
for b in check:
    ws = [f"{x['word']}({e:+.0f})" for x, e in res if x["bar"] == b]
    print(f"  check bar {b}: {' '.join(ws) or '(no confident words)'}")
