"""Hit check: how well a candidate tick->ms map puts the tab's drum (or any
track's) onsets on recording onsets.

Usage: hitcheck.py <onsets.json> <stem.wav> <map.json> [--track N] [--bars 8] [--tol 35]
  onsets.json  from tab-onsets.ts (playback ticks)
  map.json     {"anchors": [[playbackTick, ms], ...]} (piecewise linear in
               ticks) or {"syncPoints": [...]} with barIndex = OCCURRENCE
               index (fit.py checkPoints)
Per window of --bars occurrences: fraction of tab onsets with a flux peak
within --tol ms, and the median signed offset (recording peak - mapped tick)
of the matched ones, plus the best constant shift in +-250 ms (5 ms steps)
and its hit rate. A correct map has its best shift near 0.
"""
import argparse, json, statistics
import numpy as np, torch, torchaudio

ap = argparse.ArgumentParser()
ap.add_argument("onsets"); ap.add_argument("wav"); ap.add_argument("map")
ap.add_argument("--track", type=int); ap.add_argument("--bars", type=int, default=8); ap.add_argument("--tol", type=float, default=35)
ap.add_argument("--kinds", default="ks")
a = ap.parse_args()
on = json.load(open(a.onsets)); occ = on["occurrences"]
m = json.load(open(a.map))
if "anchors" in m:
    anc = sorted(m["anchors"])
else:
    anc = sorted((occ[p["barIndex"]]["start"] + p["barPosition"] * (occ[p["barIndex"]]["end"] - occ[p["barIndex"]]["start"]), p["millisecondOffset"]) for p in m.get("checkPoints", m["syncPoints"]))
at = np.array([x for x, _ in anc]); am = np.array([y for _, y in anc])
def ms_of(t):
    i = np.clip(np.searchsorted(at, t, side="right") - 1, 0, len(at) - 2)
    return am[i] + (t - at[i]) * (am[i + 1] - am[i]) / (at[i + 1] - at[i])
tr = [t for t in on["tracks"] if (t["index"] == a.track if a.track is not None else t["percussion"])][0]
ons = sorted(set(o[0] for o in tr["onsets"] if (not tr["percussion"]) or o[2] in a.kinds))
w, sr = torchaudio.load(a.wav); w = w.mean(0); hop = sr // 200
spec = torchaudio.transforms.Spectrogram(n_fft=2048, hop_length=hop, power=1)(w)
l = torch.log1p(spec * 10); f = torch.clamp(l[:, 1:] - l[:, :-1], min=0).sum(0).numpy()
loc = np.convolve(f, np.ones(101) / 101, mode="same"); f = np.clip(f - 1.5 * loc, 0, None)
FMS = 1000 * hop / sr  # 220 samples at 44.1 kHz = 4.98866 ms, not 5
pk = np.array([(i + 1) * FMS for i in range(1, len(f) - 1) if f[i] > 0 and f[i] >= f[i - 1] and f[i] > f[i + 1]], float)
starts = [o["start"] for o in occ]
win = {}
for t in ons:
    b = int(np.searchsorted(starts, t, side="right") - 1)
    win.setdefault(b // a.bars, []).append(ms_of(t))
def hits(ms, sh):
    d = [pk[np.abs(pk - (x + sh)).argmin()] - (x + sh) for x in ms]
    h = [x for x in d if abs(x) <= a.tol]
    return len(h) / len(d), (statistics.median(h) if h else float("nan"))
print(f"{'occ bars':>9} {'n':>3} {'hit@0':>6} {'med':>6} {'best':>6} {'hit@best':>8}")
for k, ms in sorted(win.items()):
    h0, md = hits(ms, 0)
    best = max(range(-250, 255, 5), key=lambda s: (hits(ms, s)[0], -abs(s)))
    hb, _ = hits(ms, best)
    print(f"{k*a.bars+1:4d}-{min((k+1)*a.bars, len(occ)):<4d} {len(ms):3d} {h0:6.2f} {md:+6.0f} {best:+6d} {hb:8.2f}")
