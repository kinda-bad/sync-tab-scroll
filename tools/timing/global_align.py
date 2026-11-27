"""Whole-song forced alignment: where each lyric word is sung, independent
of where the app places it.

Usage: global_align.py <app.json> <vocals.wav> <out.json>

Runs wav2vec2 (torchaudio WAV2VEC2_ASR_BASE_960H) over the whole vocal stem
in 30 s chunks, concatenates the frame emissions, and force-aligns the full
lyric text in one pass, so word order is enforced (repeated choruses can't
cross-match) and there's no search window limiting the offset.
"""
import json
import re
import sys

import torch
import torchaudio
import torchaudio.functional as F

app_path, wav_path, out_path = sys.argv[1:4]
syllables = json.load(open(app_path))["syllables"]

# Syllables -> words (a trailing "-" continues into the next syllable).
words, cur = [], None
for s in syllables:
    if cur is None:
        cur = {"text": "", "appMs": s["recMs"], "bar": s["bar"], "tick": s["tick"]}
    cur["text"] += s["text"].rstrip("-")
    if not s["text"].endswith("-"):
        words.append(cur)
        cur = None
if cur:
    words.append(cur)

bundle = torchaudio.pipelines.WAV2VEC2_ASR_BASE_960H
model = bundle.get_model().eval()
labels = bundle.get_labels()  # ('-', '|', 'E', 'T', ...): index 0 is blank
index = {c: i for i, c in enumerate(labels)}

for w in words:
    w["tokens"] = [index[c] for c in re.sub(r"[^A-Z']", "", w["text"].upper()) if c in index]
words = [w for w in words if w["tokens"]]

wave, sr = torchaudio.load(wav_path)
wave = torchaudio.functional.resample(wave.mean(0, keepdim=True), sr, bundle.sample_rate)

chunk = 30 * bundle.sample_rate
emissions = []
with torch.inference_mode():
    for start in range(0, wave.shape[1], chunk):
        em, _ = model(wave[:, start : start + chunk])
        emissions.append(torch.log_softmax(em, dim=-1))
emission = torch.cat(emissions, dim=1)
sec_per_frame = wave.shape[1] / bundle.sample_rate / emission.shape[1]

# One transcript: words separated by the "|" word-boundary token.
sep = index["|"]
transcript = []
for wi, w in enumerate(words):
    if wi:
        transcript.append(sep)
    transcript.extend(w["tokens"])

aligned, scores = F.forced_align(emission, torch.tensor([transcript], dtype=torch.int32), blank=0)
spans = F.merge_tokens(aligned[0], scores[0].exp())
spans = [s for s in spans if s.token != sep]

out, k = [], 0
for w in words:
    n = len(w["tokens"])
    ws = spans[k : k + n]
    k += n
    out.append(
        {
            "bar": w["bar"],
            "tick": w["tick"],
            "word": w["text"],
            "appMs": w["appMs"],
            "measuredMs": round(ws[0].start * sec_per_frame * 1000),
            "deltaMs": round(ws[0].start * sec_per_frame * 1000 - w["appMs"]),
            "score": round(sum(s.score for s in ws) / n, 2),
        }
    )

mono = all(a["measuredMs"] <= b["measuredMs"] for a, b in zip(out, out[1:]))
json.dump(out, open(out_path, "w"), indent=1)
print(f"{len(out)} words aligned, monotonic={mono} -> {out_path}")
