# Beythaus Cut — Agent instructions

Before changing this repository, read [BEYTHAUS-CUT-HANDOFF.md](./BEYTHAUS-CUT-HANDOFF.md) and check whether its status is current against GitHub HEAD, CI, and connected Supabase. It contains the user's approved product decisions, release state, open risks, and next task.

## Nonnegotiable workflow
- Continue this existing app in `docs/`; do not create a replacement standalone HTML demo or change the public URL.
- Treat the user's latest explicit decision as authoritative; distinguish planned, coded, tested, and actually released.
- Preserve verified guillotine-only production; unknown stock prices must stay unknown; panel and masif grain directions must be respected; never model thickness planing for masif.
- The physical inventory is server-authoritative when cloud mode is active. Do not silently copy or overwrite local stock. Do not deduct physical stock on plan calculation or approval, only on explicit completed production.
- Do not store service-role/secret keys, user passwords, personal data, or real production records in the repository.
- Run relevant local and GitHub CI tests before reporting success; never equate unit tests with Safari or multi-user acceptance testing.
- Update `BEYTHAUS-CUT-HANDOFF.md` at the end of every substantive change (current commit/release, tests, outstanding risk, next action); do not leave handoff stale.
