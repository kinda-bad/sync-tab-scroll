"""Fit recording sync points from a whole-song lyric alignment, on alphaTab's
playback timeline (repeat-aware, tempo-change-aware).

Usage: fit.py <pb.json> <g.json> <out.json> [--every 8] [--bar1ms MS]
              [--mode auto|line|piece] [--minscore 0.3] [--anchors a.json]

  pb.json  from pb-times.ts (playback ticks, occurrences, tempo map)
  g.json   from global_align.py run on pb.json (tick = playback tick,
           bar = 1-based occurrence index)

Fit uses confident (score >= minscore) consonant-initial words only (the
aligner puts vowel-initial words ~140-170 ms late). x = notated synth ms of
the word's playback tick (so a take that holds the notated tempo, including
notated tempo changes, is a straight line); y = measured ms.

 * Line: robust iterative fit (refit after dropping |res| > max(3*1.4826*MAD,
   80 ms), until stable). Reports per-8-occurrence-window median residual.
 * Piece: continuous piecewise-linear least squares with knots at every
   --every-th occurrence start, at each notated tempo change, and at both
   ends (same robust reweighting). Knots with no words between them and the
   next knot are merged away.
 * auto: line if every window's median residual is within +-60 ms, else piece.

Sync points sit at bar 1 (or, if the fit puts bar 1 before 0 ms, at the
bar-1 barPosition where the fit gives 0 ms), at every notated tempo change
(and, for piece, every knot), and at the end of the last played bar. Each is
a FlatSyncPoint with barIndex/barOccurence/barPosition of the occurrence it
falls in (a point at an occurrence boundary uses the following occurrence,
barPosition 0; the final point uses the last occurrence, barPosition 1).
--bar1ms pins bar 1 to a measured onset instead of the fit.

Writes out.json: {mode, syncPoints, checkPoints (barIndex = occurrence index,
for check_beats.py with pb.json), report}.
"""
import argparse, bisect, json, statistics
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument("pb"); ap.add_argument("g"); ap.add_argument("out")
ap.add_argument("--every", type=int, default=8)
ap.add_argument("--bar1ms", type=float)
ap.add_argument("--mode", default="auto")
ap.add_argument("--minscore", type=float, default=0.3)
ap.add_argument("--maxdev", type=float, default=0.05, help="max |local bpm / notated - 1| per segment")
ap.add_argument("--anchors", help="json {anchors: [[playbackTick, ms], ...]}: use these points as-is (mode fixed); only report")
a = ap.parse_args()
pb = json.load(open(a.pb)); g = json.load(open(a.g))
occ = pb["occurrences"]; ppq = pb["ppq"]; end_tick = occ[-1]["end"]
tempo = sorted(pb["tempo"])
# notated synth ms of a playback tick
tticks = [t for t, _ in tempo]; tms = [0.0]
for (t0, b0), (t1, _) in zip(tempo, tempo[1:]):
    tms.append(tms[-1] + (t1 - t0) * 60000 / (b0 * ppq))
def synth(t):
    i = max(0, bisect.bisect_right(tticks, t) - 1)
    return tms[i] + (t - tticks[i]) * 60000 / (tempo[i][1] * ppq)
def bpm_at(t):
    i = max(0, bisect.bisect_right(tticks, t) - 1); return tempo[i][1]
starts = [o["start"] for o in occ]
def occ_at(t):
    return max(0, bisect.bisect_right(starts, t) - 1)

VOW = set("AEIOU")
for w in g:
    w["x"] = synth(w["tick"]); w["vowel"] = w["word"].lstrip("(\"'").upper()[:1] in VOW
    w["conf"] = (w["score"] or 0) >= a.minscore
fitw = [w for w in g if w["conf"] and not w["vowel"]]
X = np.array([w["x"] for w in fitw]); Y = np.array([w["measuredMs"] for w in fitw])

def robust(design, y):
    keep = np.ones(len(y), bool)
    for _ in range(20):
        coef, *_ = np.linalg.lstsq(design[keep], y[keep], rcond=None)
        r = y - design @ coef
        mad = np.median(np.abs(r[keep] - np.median(r[keep])))
        thr = max(3 * 1.4826 * mad, 80.0)
        nk = np.abs(r) <= thr
        if (nk == keep).all(): break
        keep = nk
    return coef, r, keep

def hat_for(xk):
    def hat(x):
        x = np.atleast_1d(np.asarray(x, float))
        B = np.zeros((len(x), len(xk)))
        for j in range(len(xk)):
            if j > 0:
                m = (x >= xk[j - 1]) & (x <= xk[j]); B[m, j] = (x[m] - xk[j - 1]) / (xk[j] - xk[j - 1])
            if j < len(xk) - 1:
                m = (x >= xk[j]) & (x < xk[j + 1]); B[m, j] = (xk[j + 1] - x[m]) / (xk[j + 1] - xk[j])
        # extrapolate linearly past the ends
        lo = x < xk[0]; hi = x > xk[-1]
        if lo.any(): B[lo, 0] = 1 + (xk[0] - x[lo]) / (xk[1] - xk[0]); B[lo, 1] = -(xk[0] - x[lo]) / (xk[1] - xk[0])
        if hi.any(): B[hi, -1] = 1 + (x[hi] - xk[-1]) / (xk[-1] - xk[-2]); B[hi, -2] = -(x[hi] - xk[-1]) / (xk[-1] - xk[-2])
        return B
    return hat

must = sorted(set([0, end_tick] + [t for t, _ in tempo if 0 < t < end_tick]))
def spline_fit(knots):
    """Robust continuous piecewise-linear fit; merges knots (not in `must`)
    whose neighboring spans hold < 3 kept words, then refits."""
    knots = list(knots)
    while True:
        xk = np.array([synth(t) for t in knots]); hat = hat_for(xk)
        coef, res, keep = robust(hat(X), Y)
        Xk = X[keep]
        drop = None
        for i in range(1, len(knots) - 1):
            if knots[i] in must: continue
            nl = ((Xk >= xk[i - 1]) & (Xk < xk[i])).sum(); nr = ((Xk >= xk[i]) & (Xk < xk[i + 1])).sum()
            if nl < 3 or nr < 3: drop = i; break
        if drop is None:
            return knots, xk, hat, coef, res, keep
        knots.pop(drop)

# ---- line (straight between bar 1, each notated tempo change, and the end)
lknots, lxk, lhat, lcoef, lres, lkeep = spline_fit(must)
def line_ms(x): return lhat([x]) @ lcoef
lc = [float(line_ms(0)[0]), float((line_ms(lxk[1])[0] - line_ms(0)[0]) / lxk[1])]

# ---- piecewise knots (in playback ticks)
knots0 = sorted(set(must + [starts[i] for i in range(0, len(occ), a.every)]))
knots, xk, phat, pc, pres, pkeep = spline_fit(knots0)
def piece_ms(x): return phat(x) @ pc

def windows(res, keep):
    per = {}
    for w, r, k in zip(fitw, res, keep):
        per.setdefault((w["bar"] - 1) // a.every, []).append(r)
    return {k: (statistics.median(v), len(v)) for k, v in sorted(per.items())}
lw = windows(lres, lkeep)
mode = a.mode
if mode == "auto":
    mode = "line" if all(abs(m) <= 60 for m, n in lw.values() if n >= 3) else "piece"

# ---- sync points
if mode == "line":
    pts_t = list(lknots)
    f = lambda t: float(line_ms(synth(t))[0])
else:
    pts_t = list(knots)
    f = lambda t: float(piece_ms([synth(t)])[0])
pts = [[t, f(t)] for t in pts_t]
bar1_note = None
if a.anchors:
    pts = [list(map(float, x)) for x in json.load(open(a.anchors))["anchors"]]; mode = "fixed"
    bar1_note = f"fixed anchors; first at tick {pts[0][0]:.1f} = {pts[0][1]:.1f} ms"
elif a.bar1ms is not None:
    pts[0][1] = a.bar1ms; bar1_note = f"bar 1 pinned to measured onset {a.bar1ms} ms (fit said {f(0):.1f})"
elif pts[0][1] < 0:
    # find tick in first segment where ms == 0
    (t0, m0), (t1, m1) = pts[0], pts[1]
    tz = t0 + (0 - m0) * (t1 - t0) / (m1 - m0)
    bar1_note = f"fit puts bar 1 at {m0:.1f} ms; ms 0 at playback tick {tz:.1f}"
    pts[0] = [tz, 0.0]
else:
    bar1_note = f"bar 1 from fit extrapolation: {pts[0][1]:.1f} ms"

for (t1, m1), (t2, m2) in zip(pts, pts[1:]):
    assert m2 > m1, f"sync times not increasing at tick {t2}"
    bpm_local = 60000 * (t2 - t1) / ppq / (m2 - m1); nb = bpm_at(t1)
    assert abs(bpm_local / nb - 1) < a.maxdev, f"segment at tick {t1}: {bpm_local:.2f} bpm vs notated {nb}"
def flat(t, last=False):
    if last or t >= end_tick:
        o = occ[-1]; return {"barIndex": o["barIndex"], "barOccurence": o["occurrence"], "barPosition": 1, "millisecondOffset": None}
    i = occ_at(t); o = occ[i]
    pos = (t - o["start"]) / (o["end"] - o["start"])
    return {"barIndex": o["barIndex"], "barOccurence": o["occurrence"], "barPosition": round(pos, 4), "millisecondOffset": None}
sp, cp = [], []
for k, (t, ms) in enumerate(pts):
    p = flat(t, k == len(pts) - 1); p["millisecondOffset"] = round(ms, 1); sp.append(p)
    i = len(occ) - 1 if k == len(pts) - 1 else occ_at(t)
    cp.append({"barIndex": i, "barOccurence": 0, "barPosition": p["barPosition"], "millisecondOffset": p["millisecondOffset"]})

# ---- final map exactly as the points define it (linear in synth ms between points)
ptx = [synth(occ[occ_at(t)]["start"] + 0) for t, _ in pts]  # placeholder, recomputed below
ptx = [synth(t) for t, _ in pts]; ptm = [m for _, m in pts]
def mapped(x):
    i = min(max(0, bisect.bisect_right(ptx, x) - 1), len(ptx) - 2)
    return ptm[i] + (x - ptx[i]) * (ptm[i + 1] - ptm[i]) / (ptx[i + 1] - ptx[i])
for w in g:
    w["fitMs"] = mapped(w["x"]); w["res"] = w["measuredMs"] - w["fitMs"]
fr = [w["res"] for w in fitw]
per = {}
for w in fitw:
    per.setdefault((w["bar"] - 1) // a.every, []).append(w["res"])
win = [(k * a.every + 1, min((k + 1) * a.every, len(occ)), statistics.median(v), len(v)) for k, v in sorted(per.items())]
off = []
for w in g:
    if not w["conf"]: continue
    half = 30000 / bpm_at(w["tick"])
    r = w["res"] - (155 if w["vowel"] else 0)
    if abs(r) > half:
        beat = (w["tick"] - occ[w["bar"] - 1]["start"]) / ppq + 1
        off.append({"occ": w["bar"], "wbar": occ[w["bar"] - 1]["barIndex"] + 1, "pass": occ[w["bar"] - 1]["occurrence"] + 1, "beat": round(beat, 2), "resMs": round(r), "vowel": w["vowel"], "score": w["score"]})
rep = {
    "mode": mode, "nFitWords": len(fitw), "nConf": sum(w["conf"] for w in g), "nWords": len(g),
    "line": {"bar1Ms": round(lc[0], 1), "scale": lc[1], "bpmIfConst": round(tempo[0][1] / lc[1], 3), "segBpm": [round(60000 * (lk2 - lk1) / ppq / (f2 - f1), 3) for lk1, lk2, f1, f2 in zip(lknots, lknots[1:], [float(line_ms(synth(t))[0]) for t in lknots], [float(line_ms(synth(t))[0]) for t in lknots[1:]])], "kept": int(lkeep.sum()),
             "medAbsRes": round(float(np.median(np.abs(lres[lkeep]))), 1), "windows": {f"{k*a.every+1}": [round(m), n] for k, (m, n) in lw.items()}},
    "piece": {"knots": len(knots), "kept": int(pkeep.sum()), "medAbsRes": round(float(np.median(np.abs(pres[pkeep]))), 1)},
    "final": {"medAbsRes": round(statistics.median(abs(r) for r in fr), 1), "rms": round(float(np.sqrt(np.mean(np.square(fr)))), 1),
              "within60": sum(abs(r) <= 60 for r in fr), "windows": [[s, e, round(m), n] for s, e, m, n in win]},
    "bar1": bar1_note, "offWords": off,
}
json.dump({"mode": mode, "syncPoints": sp, "checkPoints": cp, "report": rep}, open(a.out, "w"), indent=1)
print(json.dumps({k: v for k, v in rep.items() if k != "offWords"}, indent=None))
print("syncPoints:", json.dumps(sp))
print(f"off words (> half beat; vowel-initial corrected by -155 ms): {len(off)}")
for o in off: print("  ", o)
