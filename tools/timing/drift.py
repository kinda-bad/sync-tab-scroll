"""Per-bar drift table: measured ms minus notated synth ms, for confident words.

Usage: drift.py <pb.json> <g.json> [minscore]
Prints one line per occurrence bar: bar (occ#, written bar), n words, the
deltas (C = consonant-initial, v = vowel-initial), in ms.
"""
import bisect, json, sys
pb = json.load(open(sys.argv[1])); g = json.load(open(sys.argv[2]))
ms = float(sys.argv[3]) if len(sys.argv) > 3 else 0.3
occ = pb["occurrences"]; ppq = pb["ppq"]; tempo = sorted(pb["tempo"])
tt = [t for t, _ in tempo]; tm = [0.0]
for (t0, b0), (t1, _) in zip(tempo, tempo[1:]): tm.append(tm[-1] + (t1 - t0) * 60000 / (b0 * ppq))
def synth(t):
    i = max(0, bisect.bisect_right(tt, t) - 1); return tm[i] + (t - tt[i]) * 60000 / (tempo[i][1] * ppq)
rows = {}
for w in g:
    if (w["score"] or 0) < ms: continue
    v = w["word"].lstrip("(\"'").upper()[:1] in "AEIOU"
    rows.setdefault(w["bar"], []).append(("v" if v else "C") + f"{w['measuredMs'] - synth(w['tick']):+.0f}")
low = {}
for w in g:
    if (w["score"] or 0) < ms: low[w["bar"]] = low.get(w["bar"], 0) + 1
for b in sorted(set(rows) | set(low)):
    o = occ[b - 1]
    print(f"{b:4d} (w{o['barIndex']+1}{'r' if o['occurrence'] else ''}) low={low.get(b,0)} " + " ".join(rows.get(b, [])))
