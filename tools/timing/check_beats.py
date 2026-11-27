"""Fixed 2026-11-27: frame times now use frame_ms = 1000*hop/sr. The integer hop (e.g. sr//200 = 220 samples at 44.1 kHz = 4.98866 ms, not 5) was taken as nominal, stretching times by 0.227%.

Independent check of a sync map against the instruments.

Usage: check_beats.py <app.json> <syncPoints.json|meta.json> <no_vocals.wav> [bars_per_window]

Maps the notated quarter-note grid to recording time through ALL sync points
(piecewise linear, as the client does), then for each window finds the
beat-grid fit peak nearest 0 ms of shift on the instrumental stem's onset
envelope. A correct map puts a strong peak within ~80 ms of 0 everywhere."""
import json, sys, torch, torchaudio
app = json.load(open(sys.argv[1])); sp = json.load(open(sys.argv[2]))["syncPoints"]
B = int(sys.argv[4]) if len(sys.argv) > 4 else 4
bs = app["barStart"]
anc = sorted((bs[p["barIndex"]] + p["barPosition"] * (bs[p["barIndex"] + 1] - bs[p["barIndex"]]), p["millisecondOffset"]) for p in sp)
def ms_of(t):
    i = 0
    while i < len(anc) - 2 and t >= anc[i + 1][0]: i += 1
    (t0, m0), (t1, m1) = anc[i], anc[i + 1]
    return m0 + (t - t0) * (m1 - m0) / (t1 - t0)
w, sr = torchaudio.load(sys.argv[3]); w = w.mean(0); hop = sr // 200
spec = torchaudio.transforms.Spectrogram(n_fft=2048, hop_length=hop, power=1)(w)
logs = torch.log1p(spec * 10); flux = torch.clamp(logs[:, 1:] - logs[:, :-1], min=0).sum(0)
FMS = 1000 * hop / sr  # frame_ms
flux = torch.clamp(flux - torch.nn.functional.avg_pool1d(flux[None, None], 101, 1, 50)[0, 0][: len(flux)], min=0)
def score(b0, shift):
    s, n = 0.0, 0
    for b in range(b0, min(b0 + B, len(bs) - 1)):
        t = bs[b]
        while t < bs[b + 1]:
            i = int(round((ms_of(t) + shift) / FMS))
            if 1 <= i < len(flux) - 1: s += float(flux[i-1:i+2].max()); n += 1
            t += 960
    return s / max(n, 1)
import math, statistics
beat = 960 * (anc[-1][1] - anc[0][1]) / (anc[-1][0] - anc[0][0])
offs = []
for b0 in range(0, len(bs) - 1, B):
    h = int(beat / 2); xs = list(range(-h, h, 5)); sc = [score(b0, x) for x in xs]
    best = xs[max(range(len(xs)), key=lambda i: sc[i])]; offs.append(best)
ang = [2 * math.pi * o / beat for o in offs]
C, S = sum(map(math.cos, ang)) / len(ang), sum(map(math.sin, ang)) / len(ang)
mean = math.atan2(S, C) * beat / (2 * math.pi)
dev = [((o - mean + beat / 2) % beat) - beat / 2 for o in offs]
print(f"beat {beat:.0f} ms | best-fit offsets per {B} bars: {' '.join(f'{o:+d}' for o in offs)}")
print(f"constant offset {mean:+.0f} ms; windows within 80 ms of it: {sum(abs(d) <= 80 for d in dev)}/{len(dev)}; median |dev| {statistics.median(abs(d) for d in dev):.0f} ms")
