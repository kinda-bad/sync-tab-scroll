---
status: open
created: 2026-07-17
plan: null
---

# Feedback

## Bugs

- [ ] F001 Audio-output-latency ticker offset (originally `feedback-lyrics-timing-tiro-c741.md` F001) remains unconfirmed after `tasks-1619-1185.md`/`plan-1619-2026-07-17-39c6.md`'s T014 research task. Findings from that pass:
  - alphaTab v1.8.3's `AlphaSynthBase` exposes a **public** `get output(): ISynthOutput`, but `ISynthOutput` (the public interface) does not surface `AudioContext`, `outputLatency`, or `baseLatency` — only `sampleRate`, `open`/`play`/`pause`/`destroy`/`addSamples`/etc.
  - At runtime on web targets, the concrete instance behind that interface (`AlphaSynthWebAudioOutputBase`, `alphaTab.core.mjs` ~line 24820) does hold a `context: AudioContext | null` field, but it's **private and unexposed** — reachable only via an unsupported cast (`(api.player.output as any).context.outputLatency`) into alphaTab's internal implementation, not a documented/stable API. It could change or be renamed in a future alphaTab release without notice.
  - The empirical half of T014 (reading `outputLatency` live across at least one Bluetooth and one wired/built-in-speaker output device, to check whether it correlates with the reported "~2 syllables ahead" lead on "Time Is Running Out") **could not be performed** in the worktree environment this research ran in — no interactive browser, no way to enumerate/switch real audio output devices.
  - The plan's own Technical Approach section already notes the hypothesis wasn't reproducible against local low-latency output on the original dev machine (ticker/engine-tick/audible-onset agreed within ~25-40ms); only an untested Bluetooth-output theory (≈300-500ms latency ≈ 960 ticks at 118bpm, matching "2 syllables ahead" almost exactly) remains open.

  **Recommended next step**, when someone has real multi-device browser access: (1) decide whether relying on the unsupported `output.context` internal is acceptable given its fragility across alphaTab versions (or find/request a stable API from alphaTab upstream instead); (2) if acceptable, actually measure `outputLatency`/`baseLatency` live across a Bluetooth and a wired/built-in device and check the correlation before implementing any compensation in `client/src/lyrics-overlay.ts`'s tick-compare logic. Per `tasks-1619-1185.md`'s T015 (gated on T014), no fix was implemented this pass — the hypothesis stayed unconfirmed rather than forcing an unverified change.
