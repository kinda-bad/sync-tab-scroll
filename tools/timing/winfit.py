"""Fit a continuous piecewise-linear tick->ms map to stem_align windows.

Usage: winfit.py <windows.json> <out.json> --knots T0 T1 ... [--minr 0.3]
                 [--agree 50] [--from BAR] [--to BAR] [--bar1ms MS]

Knots are playback ticks (e.g. 0, each notated tempo change, the end). Keeps
windows with r >= --minr and >= 2 channels within --agree ms of the window's
lag (as fit_sync.py), optionally only occurrence bars --from..--to (1-based).
Linear least squares on (tickCenter, msCenter), linear in ticks per segment.
--bar1ms pins the first knot. Prints residuals per window and local bpm per
segment; writes {"anchors": [[tick, ms], ...]}.
"""
import argparse, json
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument("windows"); ap.add_argument("out")
ap.add_argument("--knots", type=float, nargs="+", required=True)
ap.add_argument("--minr", type=float, default=0.3); ap.add_argument("--agree", type=float, default=50)
ap.add_argument("--from", dest="lo", type=int, default=1); ap.add_argument("--to", dest="hi", type=int, default=10**9)
ap.add_argument("--bar1ms", type=float)
a = ap.parse_args()
W = json.load(open(a.windows))["windows"]
K = np.array(sorted(a.knots))
keep = []
for w in W:
    agree = sum(abs(v[0] - w["lagMs"]) <= a.agree for v in w["channels"].values())
    w["ok"] = w["r"] >= a.minr and agree >= 2 and w["bar0"] >= a.lo and w["bar1"] <= a.hi
    if w["ok"]: keep.append(w)
T = np.array([w["tickCenter"] for w in keep]); M = np.array([w["msCenter"] for w in keep])
def hat(x):
    B = np.zeros((len(x), len(K)))
    for j in range(len(K)):
        if j > 0:
            m = (x >= K[j - 1]) & (x <= K[j]); B[m, j] = (x[m] - K[j - 1]) / (K[j] - K[j - 1])
        if j < len(K) - 1:
            m = (x >= K[j]) & (x < K[j + 1]); B[m, j] = (K[j + 1] - x[m]) / (K[j + 1] - K[j])
    return B
B = hat(T); y = M.copy()
if a.bar1ms is not None:
    y = y - B[:, 0] * a.bar1ms; B = B[:, 1:]
c, *_ = np.linalg.lstsq(B, y, rcond=None)
if a.bar1ms is not None: c = np.concatenate([[a.bar1ms], c])
res = M - hat(T) @ c
print(f"kept {len(keep)}/{len(W)} windows; rms {np.sqrt((res**2).mean()):.1f} ms, max |{np.abs(res).max():.1f}|")
k = 0
for w in W:
    if w["ok"]:
        print(f"  {w['bar0']:3d}-{w['bar1']:3d} r={w['r']:.2f} res {res[k]:+6.1f}"); k += 1
    else:
        print(f"  {w['bar0']:3d}-{w['bar1']:3d} r={w['r']:.2f} (dropped)")
for (t1, m1), (t2, m2) in zip(zip(K, c), list(zip(K, c))[1:]):
    print(f"segment {t1:.0f}-{t2:.0f}: {m1:.1f} -> {m2:.1f} ms, {60000 * (t2 - t1) / 960 / (m2 - m1):.3f} bpm")
json.dump({"anchors": [[float(t), round(float(m), 1)] for t, m in zip(K, c)]}, open(a.out, "w"))
