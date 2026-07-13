---
status: open      # open -> planned
created: 2026-07-13
plan: null        # set to the consuming plan's filename once planned
---

# Feedback

## Reconsidered
- [ ] F001 Account controls should be available on the create/join (Landing)
      page whether signed in or out — you shouldn't need to be in a session to
      manage auth. Today the Landing page shows a sign-in control **only when
      signed-out** (`client/src/views/Landing.svelte:45`, `{#if status ===
      'signed-out'}`); when signed **in** it shows nothing account-related — no
      identity, no sign-out. That's because ui.md:50–54 deliberately scopes the
      persistent account menu (display name + Sign out) to the "Lobby/Playback
      Bar's identity area," which is only reachable inside a session; the
      Landing view gets only the subordinate signed-out sign-in link. This item
      reverses that placement decision: the account menu (or an equivalent
      signed-in identity + sign-out affordance) should also be present on the
      Landing/create-join page, so a signed-in user can see who they are and
      sign out before ever joining a session. [artifacts: ui]

      (Origin note: originally reported as "no sign-in on the create/join
      page." On closer look the reporter was likely already signed in — sign-in
      is correctly hidden then — but there's no signed-in indicator or sign-out
      on Landing either, which is the real gap.)
