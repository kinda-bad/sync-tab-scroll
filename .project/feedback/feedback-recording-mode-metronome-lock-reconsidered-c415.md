---
status: planned
created: 2026-07-23
plan: plan-c75f-2026-07-23-5638.md
---

# Feedback

## Reconsidered
- [x] F001 Recording mode currently disables the personal metronome toggle for the whole session (`client/src/components/SettingsModal.svelte` `toggleMetronome`, per `ui.md`'s "The personal metronome preference — disabled, same treatment" under the recording-mode synth-channel-suspension list). Reconsidered: the metronome has a visual component (the beat widget), not just audio, so it shouldn't be locked at whatever state it happened to be in when the source switched — a participant should still be able to turn it on or off. Ideally the synth click would still play audibly layered over the recording rather than being unavailable, though the user notes this may run into the same "alphaTab cannot mix synth audio with a backing track" constraint (upstream #1961) the current disable was built around — worth confirming during planning whether audible click-over-recording is actually achievable, or whether only the visual beat widget can be preserved. [artifacts: ui]
