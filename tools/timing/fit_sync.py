"""Fit sync points to stem_align.py window measurements.

Usage:
  fit_sync.py <onsets.json> <windows.json[:LO-HI][,more...]> <outPrefix> [--agree 50] [--minr 0.1]
              [--every 8] [--bar1ms MS] [--exclude BAR-BAR ...]

Several windows files can be merged (comma-separated), each optionally
restricted to windows lying inside bars LO-HI (e.g. a later pass that was
centered on a better prior for that stretch).

Keeps a window only if its combined peak r >= --minr and at least two
channels' own best lags are within --agree ms of the combined lag (so a lone
channel locking onto a beat-shifted peak can't steer the fit). Then:

 * Line fit: ms = a + b * tick over all kept windows (tick = window center).
   Prints slope as bpm, residual per window, RMS and max residual.
 * Piecewise: an anchor at the start of every --every-th bar (bar 1, 1+every,
   ...) and at the end of the last bar, each placed by a local linear fit of
   the kept windows whose centers lie within +-every bars of it (falls back
   to the line). Prints residuals of the windows against the piecewise map.
 * --pin BAR=MS (repeatable) overrides the anchor at the start of 1-based
   BAR with a direct measurement (e.g. a final hit found in the stems).
 * --end-prev-rate places the end-of-last-bar anchor by continuing the
   previous segment's rate (use when the tab ends on a held chord, so the
   last bars have no onsets to measure).
 * --bar1ms overrides the bar-1 anchor (measured first onset), both fits.

Writes <outPrefix>-prior.json ({"anchors": [[tick, ms]...]}, piecewise, for
stem_align.py --prior), <outPrefix>-line.json and <outPrefix>-piecewise.json
({"syncPoints": [FlatSyncPoint...]}). Sync points refer to written bars
(barIndex, barOccurence from the playback occurrence list).

Recipe that worked (Cracker - Low, 2026-11-27; tempo drifts 86.3-88.2 bpm):
  P=packages/pipeline; tsx tab-onsets.ts <songDir> > on.json
  python -m demucs -n htdemucs <copy.mp3>                      # 4 stems
  stem_align.py on.json <stems> p1                             # global line, 8-bar windows
  fit_sync.py on.json p1/windows.json p1/fit --exclude <bars where lags hit the search edge>
  stem_align.py on.json <stems> p2 --prior p1/fit-prior.json   # re-measure
  (if the tail drifted, re-measure that stretch on a prior that follows it and
   merge: fit_sync.py on.json p2/windows.json:1-84,p4/windows.json:77-99 ...)
  stem_align.py ... p8 --prior <fit>-prior.json --hop 2         # 8-bar windows, hop 2
  fit_sync.py on.json p8/windows.json final/fit --direct --every 4 --bar1ms <first onset> [--end-prev-rate]
  stem_align.py ... verify --prior final/fit-prior.json --hop 2 # lags should be ~0 (fit residual, not evidence)
Pitfalls: always MEASURE with 8-bar windows. 4-bar windows lock onto the
half-bar kick/snare period (+-2 beats) and, used to re-center a prior,
dragged whole stretches 300-400 ms off. Only re-center on windows that pass
the agree filter. The hat channel and the guitar ("other") channel are
periodic (eighths/strums) and rarely agree; kick, snare and bass carry it.
"""
import argparse, json, os
import numpy as np


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("onsets"); ap.add_argument("windows"); ap.add_argument("out")
    ap.add_argument("--agree", type=float, default=50); ap.add_argument("--minr", type=float, default=0.1)
    ap.add_argument("--every", type=int, default=8); ap.add_argument("--bar1ms", type=float)
    ap.add_argument("--exclude", nargs="*", default=[])
    ap.add_argument("--direct", action="store_true")
    ap.add_argument("--pin", nargs="*", default=[])
    ap.add_argument("--end-prev-rate", action="store_true")
    a = ap.parse_args()
    os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)
    on = json.load(open(a.onsets)); W = []
    for spec in a.windows.split(","):
        path, _, rng = spec.partition(":")
        lo, hi = map(int, rng.split("-")) if rng else (1, 10**9)
        W += [w for w in json.load(open(path))["windows"] if w["bar0"] >= lo and w["bar1"] <= hi]
    W.sort(key=lambda w: w["tickCenter"])
    occ = on["occurrences"]; ppq = on["ppq"]
    excl = [tuple(map(int, e.split("-"))) for e in a.exclude]
    kept = []
    for w in W:
        agree = sum(abs(v[0] - w["lagMs"]) <= a.agree for v in w["channels"].values())
        bad = any(lo <= w["bar0"] <= hi or lo <= w["bar1"] <= hi for lo, hi in excl)
        w["keep"] = w["r"] >= a.minr and agree >= 2 and not bad
        w["agree"] = agree
        if w["keep"]:
            kept.append(w)
    T = np.array([w["tickCenter"] for w in kept]); M = np.array([w["msCenter"] for w in kept])
    b, a0 = np.polyfit(T, M, 1)
    bpm = 60000 / (b * ppq)
    print(f"kept {len(kept)}/{len(W)} windows. line: bar-1 tick 0 at {a0:.1f} ms, {bpm:.3f} bpm")
    res = M - (a0 + b * T)
    for w, r in zip(kept, res):
        w["resLine"] = float(r)
    print(f"line residuals: rms {np.sqrt((res**2).mean()):.1f} ms, max |{np.abs(res).max():.1f}| ms")

    ends = [o["start"] for o in occ] + [occ[-1]["end"]]
    idx = list(range(0, len(occ), a.every)) + [len(occ)]
    anchors = []
    for i in idx:
        t = ends[i]
        near = [(w["tickCenter"], w["msCenter"]) for w in kept if abs(w["tickCenter"] - t) <= a.every * (ends[min(i + 1, len(occ))] - ends[max(i - 1, 0)]) / 2 + 1]
        if a.direct and T[0] <= t <= T[-1]:
            ms = float(np.interp(t, T, M))
        elif len(near) >= 2:
            tt, mm = np.array(near).T
            bb, aa = np.polyfit(tt, mm, 1) if np.ptp(tt) > 0 else (b, mm.mean() - b * tt.mean())
            ms = aa + bb * t
        else:
            ms = a0 + b * t
        anchors.append([float(t), float(ms)])
    if a.bar1ms is not None:
        anchors[0][1] = a.bar1ms
    for pin in a.pin:
        bar, ms = pin.split("=")
        anchors[idx.index(int(bar) - 1)][1] = float(ms)
    if a.end_prev_rate and len(anchors) >= 3:
        (t0, m0), (t1, m1) = anchors[-3], anchors[-2]
        anchors[-1][1] = m1 + (anchors[-1][0] - t1) * (m1 - m0) / (t1 - t0)
    anc = np.array(anchors)
    pm = np.interp(T, anc[:, 0], anc[:, 1])
    res2 = M - pm
    print(f"piecewise residuals: rms {np.sqrt((res2**2).mean()):.1f} ms, max |{np.abs(res2).max():.1f}| ms")
    print("window       r    agree  lag     resLine  resPiece")
    k = 0
    for w in W:
        if w["keep"]:
            print(f"{w['bar0']:3d}-{w['bar1']:3d}  {w['r']:.3f}  {w['agree']}  {w['lagMs']:+7.1f}  {w['resLine']:+7.1f}  {res2[k]:+7.1f}"); k += 1
        else:
            print(f"{w['bar0']:3d}-{w['bar1']:3d}  {w['r']:.3f}  {w['agree']}  {w['lagMs']:+7.1f}  (dropped)")
    print("piecewise anchors (bar, ms, local bpm to next):")
    for j, (i, (t, ms)) in enumerate(zip(idx, anchors)):
        nb = "" if j == len(idx) - 1 else f"{60000 * (anchors[j+1][0] - t) / ppq / (anchors[j+1][1] - ms):.2f}"
        print(f"  bar {i + 1 if i < len(occ) else str(len(occ)) + ' end'}: {ms:.1f}  {nb}")

    def sp(i, ms):
        if i >= len(occ):
            o = occ[-1]; return {"barIndex": o["barIndex"], "barOccurence": o["occurrence"], "barPosition": 1, "millisecondOffset": round(ms, 1)}
        o = occ[i]; return {"barIndex": o["barIndex"], "barOccurence": o["occurrence"], "barPosition": 0, "millisecondOffset": round(ms, 1)}
    bar1 = a.bar1ms if a.bar1ms is not None else a0
    line_sp = [sp(0, bar1), sp(len(occ), bar1 + b * (ends[-1] - ends[0]) if a.bar1ms is not None else a0 + b * ends[-1])]
    json.dump({"syncPoints": line_sp}, open(a.out + "-line.json", "w"), indent=1)
    json.dump({"syncPoints": [sp(i, ms) for i, (_, ms) in zip(idx, anchors)]}, open(a.out + "-piecewise.json", "w"), indent=1)
    json.dump({"anchors": anchors}, open(a.out + "-prior.json", "w"))


if __name__ == "__main__":
    main()
