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
}

/** Shape of the `/me` response (server auth-routes.ts). */
export interface MeResponse {
  accountsEnabled: boolean;
  user: { displayName: string } | null;
}

/** Pure mapping from a `/me` body to client account state. */
export function accountStateFromMe(body: MeResponse): AccountState {
  if (!body.accountsEnabled) return { status: 'unavailable', displayName: null };
  if (!body.user) return { status: 'signed-out', displayName: null };
  return { status: 'signed-in', displayName: body.user.displayName };
}

function createAccountStore() {
  const { subscribe, set } = writable<AccountState>({ status: 'unknown', displayName: null });
  return { subscribe, set };
}

/** Single reactive account store (constitution Principle I). */
export const accountStore = createAccountStore();

/**
 * Fetches `/me` on load and updates {@link accountStore}. Any failure (network
 * error or non-200) resolves to `unavailable` — the safe, affordance-absent
 * state — so a server without the account layer never breaks the client.
 */
export async function loadAccount(fetchFn: typeof fetch = fetch): Promise<AccountState> {
  let state: AccountState;
  try {
    const res = await fetchFn('/me');
    state = res.ok ? accountStateFromMe((await res.json()) as MeResponse) : { status: 'unavailable', displayName: null };
  } catch {
    state = { status: 'unavailable', displayName: null };
  }
  accountStore.set(state);
  return state;
}

/** Starts the OAuth full-page redirect for a provider (design §6 — the return reloads + rejoins). */
export function signIn(provider: 'google' | 'github'): void {
  window.location.href = `/auth/${provider}/login`;
}

/**
 * Revokes the session server-side, then transitions {@link accountStore} to
 * `signed-out` **in memory** — no page reload. The single reactive store
 * (Principle I) is wired to both AccountMenu instances, so the UI flips with no
 * navigation and no race. Only a confirmed `res.ok` (the logout's
 * cookie-clearing `Set-Cookie` has committed) flips the store; a non-OK
 * response or a thrown fetch leaves the store signed-in and surfaces a terse
 * Error toast (ui.md States) rather than presenting a failed logout as success.
 * A trailing `window.location.reload()` used to race the in-flight request and
 * abort it, so logout silently failed — see feedback F001.
 */
export async function signOut(fetchFn: typeof fetch = fetch): Promise<void> {
  try {
    const res = await fetchFn('/auth/logout', { method: 'POST' });
    if (!res.ok) {
      toastStore.push('Sign out failed — please try again.');
      return;
    }
    accountStore.set({ status: 'signed-out', displayName: null });
  } catch {
    toastStore.push('Sign out failed — please try again.');
  }
}
