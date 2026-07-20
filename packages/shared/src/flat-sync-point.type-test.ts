// Compile-time guard for the `FlatSyncPoint` re-export (datamodel.md, T006).
//
// This is a *.type-test.ts, not a *.test.ts: it carries no runtime assertions
// and is not picked up by vitest. Its teeth come from `tsc --noEmit` (each
// package's `check` script, run by the pre-commit hook) — a type error here
// fails the commit.
//
// `ExpectedFlatSyncPoint` is an INDEPENDENTLY hand-written mirror of alphaTab's
// `FlatSyncPoint`. Asserting our re-export (a type alias) against alphaTab's
// own type would be tautological — an alias always equals its target. Pinning a
// separate literal shape and asserting bidirectional assignability means that
// if alphaTab adds, removes, renames, or retypes a field upstream, one
// direction of the assertion resolves to `never` and this file stops compiling
// — the "fails loudly" the task asks for. Note alphaTab's spelling
// `barOccurence` (one 'r'), kept verbatim.
import type { FlatSyncPoint } from './index.js';

interface ExpectedFlatSyncPoint {
  barIndex: number;
  barPosition: number;
  barOccurence: number;
  millisecondOffset: number;
}

// Resolves to `true` only when A and B are mutually assignable, `never`
// otherwise; the `never` then fails to satisfy the `true`-typed const below.
type AssertEqual<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;

const _structuralIdentity: AssertEqual<FlatSyncPoint, ExpectedFlatSyncPoint> = true;
void _structuralIdentity;
