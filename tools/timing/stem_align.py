"""Fixed 2026-11-27: frame times now use frame_ms = 1000*hop/sr. The integer hop (e.g. sr//200 = 220 samples at 44.1 kHz = 4.98866 ms, not 5) was taken as nominal, stretching times by 0.227%. Also skips channels whose window runs past the recording's end (was an All-NaN crash).

Align a tab to a recording from its instrument stems (no lyrics needed).

Usage:
  stem_align.py <onsets.json> <stemsDir> <outDir> [--bars 8] [--hop 4]
                [--search 1200] [--map TRACK=STEM ...] [--prior prior.json]

  onsets.json  from tab-onsets.ts (playback-order note onsets per track)
  stemsDir     Demucs 4-stem output dir (drums.wav bass.wav other.wav vocals.wav)
  --map        track index -> stem ('drums'|'bass'|'other'|'vocals'|'skip').
               Default: percussion -> drums, name contains 'bass' -> bass,
               name contains 'vocal'/'voice' -> vocals, everything else -> other.
  --prior      optional {"anchors": [[tick, ms], ...]} to center the local
               search on (e.g. a first-pass fit), instead of the global line.

Why: a plain beat grid matches at every whole-beat shift, so it can't fix
absolute position. The tab's own onset *pattern* (fills, stops, rests,
section starts, kick/snare placement, bass rhythm) is non-periodic, so its
cross-correlation with the matching stem's onset envelope has one clear peak.

Method:
 1. Onset envelopes (5 ms hop, log spectral flux, local-mean removed) per stem
    and band: drums split into low (<150 Hz, kick), mid (150-3k, snare) and
    high (>6k, hats/cymbals); bass and other use full-band flux.
 2. Channels pair a rendered tab pattern (Gaussian pulses, sigma 15 ms, at
    each onset) with an envelope: drum kick/snare/hat pulses -> drum
    low/mid/high bands; bass track -> bass; guitar tracks -> other
    (all mapped-to-'other' tracks are summed into one pattern).
 3. Global pass: grid-search tempo scale (0.95..1.05 of notated) and offset
    by full-song FFT cross-correlation of every channel; the best (scale,
    offset) is the prior line ms = offset + scale * notated_ms(tick).
 4. Local pass: windows of --bars bars, every --hop bars. In each window the
    pattern is placed by the prior and slid +-search ms; per-channel Pearson
    curves are averaged. Reports best lag, peak r, the runner-up peak at
    least 150 ms away (ambiguity), and each channel's own best lag (agreement).
 Writes <outDir>/windows.json and prints a table.

Then fit with fit_sync.py (line or 8-bar anchors, residuals, sync points).
"""
import argparse, json, math, os, sys
import numpy as np
import soundfile as sf
from scipy.signal import stft, fftconvolve

HOP_MS = 5


def load_mono(p):
    x, sr = sf.read(p, dtype="float32", always_2d=True)
    return x.mean(1), sr


def band_flux(x, sr, bands):
    hop = int(sr * HOP_MS / 1000)
    f, _, Z = stft(x, fs=sr, nperseg=2048, noverlap=2048 - hop, boundary=None, padded=False)
    S = np.log1p(np.abs(Z) * 10)
    out = {}
    for name, (lo, hi) in bands.items():
        m = (f >= lo) & (f < hi)
        d = np.clip(np.diff(S[m], axis=1), 0, None).sum(0)
        # STFT frame k starts at sample k*hop; its center is ~1024 samples later.
        shift = int(round(1024 / hop))
        d = np.concatenate([np.zeros(shift + 1), d])
        k = 101
        loc = np.convolve(d, np.ones(k) / k, mode="same")
        e = np.clip(d - loc, 0, None)
        # The integer hop is not exactly HOP_MS (220 samples at 44.1 kHz is
        # 4.98866 ms): resample the envelope onto an exact HOP_MS grid.
        tf = np.arange(len(e)) * 1000.0 * hop / sr
        out[name] = np.interp(np.arange(0, tf[-1], HOP_MS), tf, e)
    return out


def envelopes(stems_dir, cache):
    if os.path.exists(cache):
        z = np.load(cache)
        return {k: z[k] for k in z.files}
    env = {}
    x, sr = load_mono(os.path.join(stems_dir, "drums.wav"))
    for k, v in band_flux(x, sr, {"low": (0, 150), "mid": (150, 3000), "high": (6000, 22050), "full": (0, 22050)}).items():
        env["drums_" + k] = v
    for s in ("bass", "other", "vocals"):
        p = os.path.join(stems_dir, s + ".wav")
        if os.path.exists(p):
            x, sr = load_mono(p)
            env[s] = band_flux(x, sr, {"full": (0, 22050)})["full"]
    np.savez(cache, **env)
    return env


def notated_ms_fn(tempo, ppq):
    """tick -> ms under the notated tempo map (piecewise constant bpm)."""
    pts = sorted(tempo)
    starts, ms0, cur = [], [], 0.0
    for i, (t, bpm) in enumerate(pts):
        if i:
            cur += (t - pts[i - 1][0]) * 60000 / (pts[i - 1][1] * ppq)
        starts.append(t); ms0.append(cur)
    def f(t):
        t = np.asarray(t, dtype=float)
        i = np.clip(np.searchsorted(starts, t, side="right") - 1, 0, len(starts) - 1)
        return np.array(ms0)[i] + (t - np.array(starts)[i]) * 60000 / (np.array([p[1] for p in pts])[i] * ppq)
    return f


def build_channels(on, mapping):
    """Returns list of (channel name, env key, [(tick, weight)])."""
    ch = {}
    for tr in on["tracks"]:
        stem = mapping.get(tr["index"])
        if stem is None:
            n = tr["name"].lower()
            stem = "drums" if tr["percussion"] else "bass" if "bass" in n else "vocals" if ("vocal" in n or "voice" in n) else "other"
        if stem == "skip":
            continue
        for tick, nn, kind in tr["onsets"]:
            if stem == "drums":
                key = {"k": "drums_low", "s": "drums_mid", "h": "drums_high", "t": "drums_mid"}.get(kind, "drums_full")
                name = "drums:" + key.split("_")[1]
            else:
                key, name = stem, stem
            ch.setdefault(name, (key, []))[1].append((tick, 1.0))
    return [(n, k, sorted(v)) for n, (k, v) in sorted(ch.items())]


def render(times_ms, n, sigma_frames=3):
    y = np.zeros(n)
    idx = np.round(np.asarray(times_ms) / HOP_MS).astype(int)
    idx = idx[(idx >= 0) & (idx < n)]
    np.add.at(y, idx, 1.0)
    g = np.exp(-0.5 * (np.arange(-4 * sigma_frames, 4 * sigma_frames + 1) / sigma_frames) ** 2)
    return np.convolve(y, g, mode="same")


def zs(v):
    s = v.std()
    return (v - v.mean()) / s if s > 1e-12 else v * 0


def global_pass(channels, env, nms, n_env):
    best = None
    for scale in np.arange(0.95, 1.0501, 0.001):
        tot = None
        for name, key, ons in channels:
            e = env[key]
            p = render(scale * nms([t for t, _ in ons]), n_env)
            # corr[lag] = sum p[i] * e[i + lag], lag in frames (recording later = +)
            c = fftconvolve(zs(e), zs(p)[::-1], mode="full")[n_env - 1:] / n_env
            tot = c if tot is None else tot + c
        lag_lo, lag_hi = 0, int(20000 / HOP_MS)  # offset 0..20 s
        seg = tot[lag_lo:lag_hi]
        i = int(seg.argmax())
        if best is None or seg[i] > best[0]:
            best = (float(seg[i]), float(scale), (lag_lo + i) * HOP_MS)
    return best


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("onsets"); ap.add_argument("stems"); ap.add_argument("out")
    ap.add_argument("--bars", type=int, default=8); ap.add_argument("--hop", type=int, default=4)
    ap.add_argument("--search", type=float, default=1200)
    ap.add_argument("--map", nargs="*", default=[])
    ap.add_argument("--prior")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    on = json.load(open(a.onsets))
    mapping = {int(k): v for k, v in (m.split("=") for m in a.map)}
    env = envelopes(a.stems, os.path.join(a.out, "env-framefix.npz"))  # renamed: env.npz caches from before 2026-11-27 hold stretched envelopes
    n_env = min(len(v) for v in env.values())
    env = {k: v[:n_env] for k, v in env.items()}
    nms = notated_ms_fn(on["tempo"], on["ppq"])
    channels = build_channels(on, mapping)
    print("channels:", ", ".join(f"{n}({len(o)})" for n, _, o in channels))

    if a.prior:
        anc = np.array(json.load(open(a.prior))["anchors"], dtype=float)
        def prior(t, anc=anc):
            t = np.asarray(t, dtype=float)
            i = np.clip(np.searchsorted(anc[:, 0], t, side="right") - 1, 0, len(anc) - 2)
            t0, t1, m0, m1 = anc[i, 0], anc[i + 1, 0], anc[i, 1], anc[i + 1, 1]
            return m0 + (t - t0) * (m1 - m0) / (t1 - t0)
        g = None
    else:
        g = global_pass(channels, env, nms, n_env)
        print(f"global: r={g[0]:.3f} scale={g[1]:.4f} (bpm {on['tempo'][0][1] / g[1]:.2f}) offset={g[2]:.0f} ms")
        prior = lambda t, g=g: g[2] + g[1] * nms(t)

    occ = on["occurrences"]
    S = int(a.search / HOP_MS)
    lags = np.arange(-S, S + 1)
    wins = []
    for w0 in range(0, len(occ), a.hop):
        w1 = min(w0 + a.bars, len(occ))
        if w1 - w0 < max(2, a.bars // 2):
            break
        t0, t1 = occ[w0]["start"], occ[w1 - 1]["end"]
        f0, f1 = int(prior(t0) / HOP_MS), int(prior(t1) / HOP_MS)
        curves, per = [], {}
        for name, key, ons in channels:
            ts = [t for t, _ in ons if t0 <= t < t1]
            if len(ts) < 4:
                continue
            p = render(prior(ts) - f0 * HOP_MS, f1 - f0)
            pz = zs(p)
            c = np.full(len(lags), np.nan)
            for j, L in enumerate(lags):
                lo, hi = f0 + L, f1 + L
                if lo < 0 or hi > n_env:
                    continue
                c[j] = float((pz * zs(env[key][lo:hi])).mean())
            if np.all(np.isnan(c)):
                continue  # window runs past the end of the recording
            curves.append(c)
            per[name] = (int(lags[np.nanargmax(c)] * HOP_MS), float(np.nanmax(c)))
        if not curves:
            continue
        C = np.nanmean(np.array(curves), 0)
        j = int(np.nanargmax(C))
        far = np.abs(lags - lags[j]) * HOP_MS >= 150
        # runner-up must be a local max
        loc = np.r_[False, (C[1:-1] >= C[:-2]) & (C[1:-1] >= C[2:]), False] & far
        j2 = int(np.nanargmax(np.where(loc, C, -np.inf))) if loc.any() else j
        # sub-frame refinement (parabolic)
        dj = 0.0
        if 0 < j < len(C) - 1:
            y0, y1, y2 = C[j - 1], C[j], C[j + 1]
            den = y0 - 2 * y1 + y2
            dj = 0.5 * (y0 - y2) / den if den != 0 else 0.0
        lag_ms = float((lags[j] + dj) * HOP_MS)
        tc = (t0 + t1) / 2
        wins.append({
            "bar0": occ[w0]["barIndex"] + 1, "bar1": occ[w1 - 1]["barIndex"] + 1,
            "tick0": t0, "tick1": t1, "tickCenter": tc,
            "priorMsCenter": float(prior(tc)), "lagMs": lag_ms, "msCenter": float(prior(tc)) + lag_ms,
            "r": float(C[j]), "r2": float(C[j2]), "lag2Ms": int(lags[j2] * HOP_MS),
            "channels": per,
        })
    for w in wins:
        chs = " ".join(f"{k}:{v[0]:+d}/{v[1]:.2f}" for k, v in w["channels"].items())
        print(f"bars {w['bar0']:3d}-{w['bar1']:3d} lag {w['lagMs']:+7.1f} r={w['r']:.3f} 2nd {w['lag2Ms']:+5d}/{w['r2']:.3f}  | {chs}")
    json.dump({"global": g, "windows": wins}, open(os.path.join(a.out, "windows.json"), "w"), indent=1)


if __name__ == "__main__":
    main()
