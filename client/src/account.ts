import { writable } from 'svelte/store';
import { toastStore } from './toast-store';

/**
 * Client account state (ui.md Account & Sign-In). `/me` distinguishes three
 * outcomes so the UI can render the right affordance:
 * - `unavailable` — the server has no DB configured; sign-in affordances are
 *   simply **absent** (not disabled/errored), the app presents as signed-out.
 * - `signed-out` — accounts are available; show the "Sign in" affordances.
 * - `signed-in` — show the display name + Sign out.
 * `unknown` is the pre-`/me` state (render nothing until resolved).
 */
export type AccountStatus = 'unknown' | 'unavailable' | 'signed-out' | 'signed-in';

export interface AccountState {
  status: AccountStatus;
  displayName: string | null;
  /** T011: the signed-in user's owned catalogue ids (gates "My catalogues"). Always [] when not signed-in. */
  ownedCatalogueIds: string[];
  /** T014: whether the server currently accepts in-app song uploads (gates "Add song" — absent, not disabled, when false). Defaults true so an older/mocked `/me` body doesn't wrongly hide the action. */
  songUploadEnabled: boolean;
}

/** Shape of the `/me` response (server auth-routes.ts). */
export interface MeResponse {
  accountsEnabled: boolean;
  user: { displayName: string } | null;
  ownedCatalogueIds?: string[];
  songUploadEnabled?: boolean;
}

/** Pure mapping from a `/me` body to client account state. */
export function accountStateFromMe(body: MeResponse): AccountState {
  const ownedCatalogueIds = body.ownedCatalogueIds ?? [];
  const songUploadEnabled = body.songUploadEnabled ?? true;
  if (!body.accountsEnabled) return { status: 'unavailable', displayName: null, ownedCatalogueIds: [], songUploadEnabled };
  if (!body.user) return { status: 'signed-out', displayName: null, ownedCatalogueIds: [], songUploadEnabled };
  return { status: 'signed-in', displayName: body.user.displayName, ownedCatalogueIds, songUploadEnabled };
}

function createAccountStore() {
  const { subscribe, set } = writable<AccountState>({ status: 'unknown', displayName: null, ownedCatalogueIds: [], songUploadEnabled: true });
  return { subscribe, set };
}

/** Single reactive account store (constitution Principle I). */
export const accountStore = createAccountStore();

/**
 * Whether the in-app authoring modal (T011-T018, ui.md In-App Authoring) is
 * open. Shared between the Landing and Bar `AccountMenu` instances (only one
 * `AuthoringModal` is ever mounted, in `App.svelte`) so either entry point
 * can open the same modal instance — Principle I, one reactive store, not a
 * side-channel prop threaded through two independent trees.
 */
export const authoringModalOpen = writable(false);

/**
 * Reads `/me` (the source of truth for account state) and maps it to an
 * {@link AccountState}. Unlike {@link loadAccount}, this does NOT swallow
 * failures: a non-ok response or a network/abort error **throws**, so callers
 * can distinguish "the server says accounts are unavailable" from "I couldn't
 * reach the server right now". {@link signOut} relies on that distinction —
 * a transient `/me` failure mid-sign-out must not blank the account menu to
 * *unavailable* (feedback F003).
 */
export async function fetchMe(fetchFn: typeof fetch = fetch): Promise<AccountState> {
  const res = await fetchFn('/me');
  if (!res.ok) throw new Error(`/me responded ${res.status}`);
  return accountStateFromMe((await res.json()) as MeResponse);
}

/**
 * Fetches `/me` on load and updates {@link accountStore}. Any failure (network
 * error or non-200) resolves to `unavailable` — the safe, affordance-absent
 * state — so a server without the account layer never breaks the client. This
 * boot-time swallowing lives here, not in {@link fetchMe}, and is the single
 * store write (Principle I).
 */
export async function loadAccount(fetchFn: typeof fetch = fetch): Promise<AccountState> {
  let state: AccountState;
  try {
    state = await fetchMe(fetchFn);
  } catch {
    state = { status: 'unavailable', displayName: null, ownedCatalogueIds: [], songUploadEnabled: true };
  }
  accountStore.set(state);
  return state;
}

/** Starts the OAuth full-page redirect for a provider (design §6 — the return reloads + rejoins). */
export function signIn(provider: 'google' | 'github'): void {
  window.location.href = `/auth/${provider}/login`;
}

/**
 * Revokes the session server-side, then confirms the outcome by re-reading
 * `/me` (the source of truth) rather than trusting the `/auth/logout` response.
 * The logout response can be aborted client-side even when the server already
 * cleared the session cookie (feedback F001), so its `res.ok` is not reliable;
 * `/me` reflects the committed server state. {@link loadAccount} performs that
 * fetch and updates {@link accountStore} (the single reactive store, Principle I,
 * wired to both AccountMenu instances) — the UI flips in memory with no page
 * reload and no race. If `/me` still reports `signed-in`, the logout genuinely
 * failed and a terse Error toast is surfaced (ui.md States).
 *
 * Uses {@link fetchMe} directly (not {@link loadAccount}) so an unreachable
 * `/me` does NOT blank the menu to *unavailable* — that state is reserved for a
 * DB-less server, not a transient failure. On an unreachable `/me` the menu
 * stays *Signed-in* and the same retryable toast is surfaced (feedback F003).
 */
export async function signOut(fetchFn: typeof fetch = fetch): Promise<void> {
  try {
    // The response can be aborted even when the server succeeded — verify via /me.
    await fetchFn('/auth/logout', { method: 'POST' });
  } catch {
    /* aborted/network error — the server may still have logged us out; /me decides */
  }
  try {
    const state = await fetchMe(fetchFn);
    accountStore.set(state);
    if (state.status === 'signed-in') {
      toastStore.push('Sign out failed — please try again.');
    }
  } catch {
    // Couldn't confirm via /me. Don't touch the store (the menu stays as it
    // was, signed-in) — a transient failure must not masquerade as *Accounts
    // unavailable*. Surface the same retryable toast (feedback F003).
    toastStore.push('Sign out failed — please try again.');
  }
}
