<script lang="ts">
  import AccountMenu from '../components/AccountMenu.svelte';

  // Records how AccountMenu invokes its onSignOut prop when the Sign out
  // button is clicked. The regression this guards: the button bound
  // `onclick={onSignOut}`, which handed the click PointerEvent to onSignOut as
  // its first argument. `signOut` (account.ts) declares that first parameter as
  // a defaulted `fetchFn` — so the event shadowed `fetch`, `fetchFn('/auth/logout')`
  // threw, the empty catch swallowed it, and logout never went out. Kept fully
  // in-browser (no function prop crossing the CT boundary) so the recorded arg
  // count is exact.
  let argCount = -1;

  function onSignOut(...args: unknown[]): void {
    argCount = args.length;
  }
</script>

<div>
  <AccountMenu status="signed-in" displayName="Ada" {onSignOut} />
  <span data-testid="signout-arg-count">{argCount}</span>
</div>
