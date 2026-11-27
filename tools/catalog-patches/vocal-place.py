"""Turn sung syllables (vocal-align.py) into vocal-track notes on the tab's grid.

Usage: vocal-place.py <align.json> <lyrics.lrc> <meta.json> <song.gp> <out-dir>

Writes <out-dir>/notes.json (the notes gp-add-vocal-track.py writes into the
.gp) and <out-dir>/raw-line.txt (the raw lyric line to dispatch onto them:
one line per LRC lyric line, words cut with `-` exactly where vocal-align.py
cut them (a hyphen already in the LRC becomes a space), so there is one chunk per note and no `+` or `_`).

Method:
- Recording ms -> tab tick: the inverse of the song's `syncPoints` mapping
  (linear between anchors, extrapolated past the ends; same as
  tools/timing/app-times.ts and client/src/playback-sync.ts). The song must
  have no repeats (written ticks = playback ticks); the script refuses
  otherwise.
- Each syllable's target is its aligned start, 140 ms earlier for
  vowel-initial words (aligner bias, tools/timing/README.md).
- Syllables with a low alignment score (< 0.3) that fall outside their
  LRC line (from 1 s before its timestamp to 0.5 s after the next line's)
  are re-placed by linear
  interpolation between the nearest confident neighbors, in time, kept
  from 0.2 s before their line's timestamp to its window's end. (Also
  re-placing low-score syllables that start on pYIN silence was tried and
  dropped: it moved them further from the stem's onsets, not closer.)
- Slots: a 16th-note grid. Syllables get strictly increasing slots that
  minimize the weighted sum of |slot - target| (dynamic programming;
  confident syllables weigh 1, others 0.3), so no two share a note.
- Length: until the voice stops (pYIN voicing, gaps up to 120 ms bridged),
  capped by the next note and the bar line, then cut down to the longest
  single note value that fits; a note at most an 8th before the next one
  runs up to it (16th, 8th, dotted 8th, quarter, dotted
  quarter, half, dotted half, whole). No ties, so GP and the pipeline
  dispatch the raw line the same way.
- Pitch: median pYIN pitch over the note, rounded to a semitone, folded by
  octaves to within 7 semitones of the median of its neighbors (3 each
  side) and to within 14 semitones of the song's median; unvoiced notes
  repeat the previous pitch.
"""
import json
import os
import re
import statistics
import sys
import zipfile

align_path, lrc_path, meta_path, gp_path, out_dir = sys.argv[1:6]
data = json.load(open(align_path))
syl = data["syllables"]
frame_ms = data["frameMs"]
f0 = data["f0Midi"]
meta = json.load(open(meta_path))

TPQ = 960
SLOT = TPQ // 4
VOWEL_SHIFT_MS = 140
CONFIDENT = 0.3

gpif = zipfile.ZipFile(gp_path).read("Content/score.gpif").decode("utf-8")
master_bars = re.findall(r"<MasterBar>.*?</MasterBar>", gpif, re.S)
if any(re.search(r"<Repeat |<AlternateEndings>|<Directions>", mb) for mb in master_bars):
    sys.exit("song has repeats, alternate endings or directions; not supported")
bar_start, t = [], 0
for mb in master_bars:
    num, den = map(int, re.search(r"<Time>(\d+)/(\d+)</Time>", mb).group(1, 2))
    bar_start.append(t)
    t += num * 4 * TPQ // den
bar_start.append(t)
assert all(b % SLOT == 0 for b in bar_start)

anchors = sorted(
    (bar_start[p["barIndex"]] + p["barPosition"] * (bar_start[p["barIndex"] + 1] - bar_start[p["barIndex"]]), p["millisecondOffset"])
    for p in meta["syncPoints"]
)
assert all(p["barOccurence"] == 0 for p in meta["syncPoints"])


def seg(x, key):
    i = 0
    while i < len(anchors) - 2 and x >= anchors[i + 1][key]:
        i += 1
    return anchors[i], anchors[i + 1]


def ms_to_tick(ms):
    (t0, m0), (t1, m1) = seg(ms, 1)
    return t0 + (ms - m0) * (t1 - t0) / (m1 - m0)


def tick_to_ms(tick):
    (t0, m0), (t1, m1) = seg(tick, 0)
    return m0 + (tick - t0) * (m1 - m0) / (t1 - t0)


# Targets in recording ms.
line_ms = {}
for file_line, raw in enumerate(open(lrc_path, encoding="utf-8"), 1):
    m = re.match(r"\[(\d+):(\d+(?:\.\d+)?)\]", raw.strip())
    if m:
        line_ms[file_line] = int(m.group(1)) * 60000 + float(m.group(2)) * 1000
later = sorted(line_ms)


def line_window(file_line):
    nxt = next((line_ms[f] for f in later if f > file_line), float("inf"))
    return line_ms[file_line] - 1000, nxt + 500


for s in syl:
    s["targetMs"] = s["startMs"] - (VOWEL_SHIFT_MS if s["vowelInitial"] else 0)
    s["confident"] = s["score"] >= CONFIDENT
    a, b = line_window(s["fileLine"])
    s["outside"] = not s["confident"] and not (a <= s["targetMs"] <= b)
for i, s in enumerate(syl):
    if not s["outside"]:
        continue
    prev = next((j for j in range(i - 1, -1, -1) if syl[j]["confident"]), None)
    nxt = next((j for j in range(i + 1, len(syl)) if syl[j]["confident"]), None)
    if prev is not None and nxt is not None:
        a, b = syl[prev]["targetMs"], syl[nxt]["targetMs"]
        s["targetMs"] = a + (b - a) * (i - prev) / (nxt - prev)
    lo_ms, hi_ms = line_window(s["fileLine"])
    s["targetMs"] = min(max(s["targetMs"], lo_ms + 800), hi_ms)

# Monotone slot assignment (DP over 16th slots).
targets = [ms_to_tick(s["targetMs"]) / SLOT for s in syl]
weights = [1.0 if s["confident"] else 0.3 for s in syl]
n_slots = bar_start[-1] // SLOT
lo = max(0, int(min(targets)) - 8)
hi = min(n_slots, int(max(targets)) + 8)
width = hi - lo
INF = float("inf")
prev_cost = [0.0] * width
choice = []
for i, tg in enumerate(targets):
    # best[k] = min over slots < k of prev_cost (strictly increasing slots)
    cost = [INF] * width
    arg = [-1] * width
    best, best_k = INF, -1
    for k in range(width):
        if i == 0:
            cost[k] = weights[i] * abs(lo + k - tg)
        else:
            if k > 0 and prev_cost[k - 1] < best:
                best, best_k = prev_cost[k - 1], k - 1
            if best < INF:
                cost[k] = best + weights[i] * abs(lo + k - tg)
                arg[k] = best_k
    choice.append(arg)
    prev_cost = cost
k = min(range(width), key=lambda j: prev_cost[j])
slots = [0] * len(syl)
for i in range(len(syl) - 1, -1, -1):
    slots[i] = lo + k
    k = choice[i][k]
slots = [s for s in slots]

# Lengths and pitch.
VALUES = [16, 12, 8, 6, 4, 3, 2, 1]  # in 16ths


def voiced_end_ms(start_ms, limit_ms):
    i = int(start_ms / frame_ms)
    last_voiced, gap = None, 0
    while i < len(f0) and i * frame_ms < limit_ms:
        if f0[i] is not None:
            last_voiced, gap = i, 0
        else:
            gap += 1
            if last_voiced is not None and gap * frame_ms > 120:
                break
            if last_voiced is None and (i * frame_ms - start_ms) > 150:
                break
        i += 1
    return (last_voiced + 1) * frame_ms if last_voiced is not None else start_ms


notes, raw_pitch = [], []
for i, s in enumerate(syl):
    slot = slots[i]
    bar = max(b for b in range(len(bar_start) - 1) if bar_start[b] <= slot * SLOT)
    bar_end_slot = bar_start[bar + 1] // SLOT
    next_slot = slots[i + 1] if i + 1 < len(syl) else bar_end_slot
    start_ms = tick_to_ms(slot * SLOT)
    limit_ms = tick_to_ms(min(next_slot, bar_end_slot) * SLOT)
    end_ms = voiced_end_ms(start_ms, limit_ms)
    want = max(1, round((ms_to_tick(end_ms) / SLOT) - slot))
    room = min(next_slot, bar_end_slot) - slot
    length = next(v for v in VALUES if v <= (room if room <= 2 else min(want, room)))
    # pitch over the sung part of the note
    a, b = int(start_ms / frame_ms), int(max(end_ms, start_ms + 60) / frame_ms)
    vals = [f0[j] for j in range(max(a, 0), min(b, len(f0))) if f0[j] is not None]
    raw_pitch.append(round(statistics.median(vals)) if vals else None)
    notes.append({"syllable": i, "bar": bar, "slot": slot - bar_start[bar] // SLOT, "length": length, "tick": slot * SLOT})

# Octave errors: fold a note that sits more than 7 semitones from the median
# of its neighbors (3 each side). Centered, so a real register change between
# sections survives. Unvoiced notes repeat the previous pitch.
song_median = statistics.median(q for q in raw_pitch if q is not None)
prev = None
for i, n in enumerate(notes):
    p = raw_pitch[i]
    if p is not None:
        near = [q for q in raw_pitch[max(0, i - 3) : i + 4] if q is not None]
        ref = statistics.median(near)
        while p - ref > 7:
            p -= 12
        while ref - p > 7:
            p += 12
        while p - song_median > 14:
            p -= 12
        while song_median - p > 14:
            p += 12
    else:
        p = prev if prev is not None else round(song_median)
    n["midi"] = prev = p

os.makedirs(out_dir, exist_ok=True)
json.dump({"barCount": len(master_bars), "notes": notes}, open(os.path.join(out_dir, "notes.json"), "w"), indent=0)

# Raw line: the same tokens and cuts vocal-align.py used.
lines = []
by_line = {}
for s in syl:
    by_line.setdefault(s["fileLine"], {}).setdefault(s["word"], []).append(s["text"])
for fl in sorted(by_line):
    words = []
    for wi in sorted(by_line[fl]):
        pieces = by_line[fl][wi]
        # A hyphen already in the LRC token (a repeated interjection) becomes a
        # word break: the app joins `-` pieces back into one word when it
        # shows a raw line (client/src/lyric-line-text.ts).
        word = ""
        for j, p in enumerate(pieces):
            if p.endswith("-"):
                words.append(word + p[:-1])
                word = ""
            else:
                word += p if j == len(pieces) - 1 else p + "-"
        if word:
            words.append(word)
    lines.append(" ".join(words))
open(os.path.join(out_dir, "raw-line.txt"), "w", encoding="utf-8").write("\n".join(lines) + "\n")

# Report (numbers only).
conf = [i for i, s in enumerate(syl) if s["confident"]]
slot_ms = tick_to_ms(SLOT * 100) - tick_to_ms(0)
slot_ms /= 100
err = [abs(tick_to_ms(slots[i] * SLOT) - syl[i]["targetMs"]) for i in conf]
print(f"{len(syl)} notes in {len(lines)} lines; 16th = {slot_ms:.0f} ms")
print(f"confident {len(conf)}: within a 16th {sum(e <= slot_ms for e in err) / len(err):.1%}, beyond an 8th {sum(e > 2 * slot_ms for e in err) / len(err):.1%}, max {max(err):.0f} ms")
print(f"low-score syllables outside their LRC line's window, re-placed: {sum(s['outside'] for s in syl)} (bars {sorted(set(n['bar'] + 1 for n, s in zip(notes, syl) if s['outside']))})")
print("lengths", {v: sum(n["length"] == v for n in notes) for v in VALUES}, "pitch range", min(n["midi"] for n in notes), max(n["midi"] for n in notes))
