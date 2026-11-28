"""Where each lyric syllable is sung in a recording, and at what pitch.

Usage: vocal-align.py <lyrics.lrc> <split-spec.json | -> <vocals.wav> <out.json>

Input to building a vocal track for a song whose tab has none
(vocal-place.py, gp-add-vocal-track.py; docs/catalog-patches.md).

- <lyrics.lrc>: the song's LRC. Its non-blank lines, in order, are the lyric
  lines; each whitespace-separated token is a word.
- <split-spec.json>: where to cut words into syllables, numbers only, so no
  lyric text has to live outside the catalog:
  {"<LRC file line, 1-based>": {"<word index, 0-based>": [cut, ...]}}, each
  cut a character offset into the raw token. `-` uses pyphen (en_US, at
  least 2 letters each side, every piece must have a vowel) for every word.
  Hyphens already in a token (e.g. a repeated interjection) always split.
- <vocals.wav>: the Demucs vocal stem of recording.mp3.

Method:
- Syllable starts: wav2vec2 (torchaudio WAV2VEC2_ASR_BASE_960H) emissions
  over the whole stem in 30 s chunks, then one CTC forced alignment of the
  whole lyric text, so order is enforced and repeated choruses can't
  cross-match (same as tools/timing/global_align.py). A syllable's start is
  its first character's span start; its score is the mean character score.
- Pitch and voicing: librosa pYIN (65-1000 Hz) on the stem at 22050 Hz,
  hop 256. Frame time is computed as 1000 * hop / sr (tools/timing/README.md
  pitfalls).

Output: {"frameMs", "f0Midi": [...|null], "rms": [...], "syllables": [{text,
line, fileLine, word, first, vowelInitial, startMs, score}]}.
"""
import json
import re
import sys

import librosa
import numpy as np
import torch
import torchaudio
import torchaudio.functional as F

lrc_path, spec_path, wav_path, out_path = sys.argv[1:5]


def pyphen_cuts(token):
    import pyphen

    d = pyphen.Pyphen(lang="en_US", left=2, right=2)
    letters = [i for i, ch in enumerate(token) if ch.isalpha() or ch == "'"]
    word = "".join(token[i] for i in letters)
    pieces = d.inserted(word).split("-")
    if len(pieces) < 2 or not all(re.search(r"[aeiouy]", p.lower()) for p in pieces):
        return []
    cuts, n = [], 0
    for p in pieces[:-1]:
        n += len(p)
        cuts.append(letters[n])
    return cuts


spec = None if spec_path == "-" else json.load(open(spec_path))
syllables, line = [], 0
for file_line, raw in enumerate(open(lrc_path, encoding="utf-8"), 1):
    m = re.match(r"\[(\d+):(\d+(?:\.\d+)?)\](.*)", raw.strip())
    if not m or not m.group(3).strip():
        continue
    line += 1
    for wi, tok in enumerate(m.group(3).split()):
        # pieces split on hyphens already in the token, then on the spec's cuts
        cuts = pyphen_cuts(tok) if spec is None else spec.get(str(file_line), {}).get(str(wi), [])
        cuts = sorted(set(cuts) | {i + 1 for i, ch in enumerate(tok) if ch == "-"})
        b = 0
        for c in cuts + [len(tok)]:
            piece = tok[b:c]
            b = c
            if not re.search(r"[A-Za-z]", piece):
                continue
            syllables.append({"text": piece, "line": line, "fileLine": file_line, "word": wi, "first": not syllables or syllables[-1]["line"] != line or syllables[-1]["word"] != wi})

bundle = torchaudio.pipelines.WAV2VEC2_ASR_BASE_960H
model = bundle.get_model().eval()
index = {c: i for i, c in enumerate(bundle.get_labels())}
for s in syllables:
    s["tokens"] = [index[c] for c in re.sub(r"[^A-Z']", "", s["text"].upper()) if c in index]
    s["vowelInitial"] = s["first"] and bool(re.match(r"[^A-Za-z]*[AEIOUaeiou]", s["text"]))

wave, sr = torchaudio.load(wav_path)
mono = wave.mean(0, keepdim=True)
wave16 = torchaudio.functional.resample(mono, sr, bundle.sample_rate)
chunk = 30 * bundle.sample_rate
emissions = []
with torch.inference_mode():
    for start in range(0, wave16.shape[1], chunk):
        em, _ = model(wave16[:, start : start + chunk])
        emissions.append(torch.log_softmax(em, dim=-1))
emission = torch.cat(emissions, dim=1)
sec_per_frame = wave16.shape[1] / bundle.sample_rate / emission.shape[1]

sep = index["|"]
transcript = []
for i, s in enumerate(syllables):
    if i and s["first"]:
        transcript.append(sep)
    transcript.extend(s["tokens"])
aligned, scores = F.forced_align(emission, torch.tensor([transcript], dtype=torch.int32), blank=0)
spans = [sp for sp in F.merge_tokens(aligned[0], scores[0].exp()) if sp.token != sep]
k = 0
for s in syllables:
    n = len(s["tokens"])
    ss = spans[k : k + n]
    k += n
    s["startMs"] = round(ss[0].start * sec_per_frame * 1000, 1)
    s["score"] = round(float(sum(x.score for x in ss) / n), 3)
    del s["tokens"]

y = librosa.resample(mono[0].numpy(), orig_sr=sr, target_sr=22050)
hop = 256
f0, voiced, _ = librosa.pyin(y, fmin=65, fmax=1000, sr=22050, hop_length=hop, frame_length=2048)
rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=hop)[0]
f0_midi = [round(float(librosa.hz_to_midi(f)), 2) if v and np.isfinite(f) else None for f, v in zip(f0, voiced)]

json.dump(
    {"frameMs": 1000 * hop / 22050, "f0Midi": f0_midi, "rms": [round(float(r), 5) for r in rms], "syllables": syllables},
    open(out_path, "w"),
)
print(f"{len(syllables)} syllables, {sum(s['score'] >= 0.3 for s in syllables)} with score >= 0.3 -> {out_path}")
