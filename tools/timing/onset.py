"""Fixed 2026-11-27: frame times now use frame_ms = 1000*hop/sr instead of a nominal 10 ms (sr//100 is exact at 44.1/48 kHz, so earlier results there are unaffected)."""
import sys, torch, torchaudio
for p in sys.argv[1:]:
    w, sr = torchaudio.load(p); w = w.mean(0)
    hop = sr // 100; e = w[: len(w)//hop*hop].reshape(-1, hop).pow(2).mean(1).sqrt()
    db = 20 * torch.log10(e + 1e-9); peak = db.max()
    first = round(int((db > peak - 30).nonzero()[0]) * 1000 * hop / sr)
    print(f"{p.split('/')[-2]}/{p.split('/')[-1]}: first sound within 30 dB of peak at {first} ms")
