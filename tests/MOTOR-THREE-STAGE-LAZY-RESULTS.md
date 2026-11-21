# Lazy/anytime physical VH-V/HV-H construction — research PR #46

**Status: research only, not integrated into production or an optimum certificate.**
The implemented algorithm in `docs/engine/three-stage-lazy-research.js`
attempts to construct complete physical 3-stage guillotine jobs directly,
without first enumerating all shelf, strip and stock count vectors.
The exact module `three-stage-nested-exact.js` remains unchanged.

## Algorithm and scope

Each compatible stock copy is examined in VH-V and HV-H orientations.
The constructor greedily creates a first band using pieces of identical
second-axis extent; its occupied first-axis width defines a strip.
Additional bands are chosen lazily with the same width feasibility rule,
and strips are added while the usable stock admits complete full-edge cuts.
Seed order, half-versus-full-width target and alternate traversal provide
multiple bounded candidate construction attempts. Complete plans compete
on the user's selected cost, gross-stock-area or board-count objective.
The scoring is a **heuristic**, not a valid lower bound, dominance rule or
exhaustive search. No part count or board count input ceiling is imposed.

Cuts are materialized as full-source-rectangle live-leaf splits,
with kerf and trim represented in an exactly integerized grid up to six
decimal places. The third stage cuts individual unrotated pieces from
each full-secondary-span band. Positive leftovers smaller than kerf are
rejected. Material, category, thickness and declared part grain and
rotation restrictions filter candidates; stock quantity is respected.
Non-rotated parts with mandatory width grain are outside this special
class, yielding UNKNOWN instead of inferring general infeasibility.
Price is always calculated by `BeythausMaterialPolicy.stockPrice`.
Unknown stock price is not zero; cost-mode returns `unknown-price`
when a potentially usable stock is unpriced. Unknown costs stay null
in area/count-mode returned plans.

**Anytime contract:** `onCandidate` receives only completed,
not partial, best-so-far *research* candidates. The returned status is
`feasible-uncertified`; `proof:'none'` and `researchOnly:true`
are explicit. The attempt budget uses `maxMs`, `maxNodes`,
`maxCandidates` and `maxSeeds`. These are search budgets, not
user-facing part/stock quantity ceilings. A budget overrun with no
complete candidate returns `unknown-limit` and a null plan.
A failed greedy construction without exhaustion is
`unknown-no-candidate`, never 'infeasible'.

## Independent tests and baseline

The CI test `tests/motor-three-stage-lazy.cjs` constructs
8, 40 and 200 piece planted samples with mixed and repeated piece
widths, positive kerf and trim, four compatible priced stock types.
Every returned completed candidate and every best-so-far callback
candidate is checked through both production `auditCutPlan` and
independent `optimization-oracle.cjs` physical full-edge auditors.
It also checks input immutability, budget exhaustion, unknown pricing,
material/thickness, disallowed grain/rotation and deliberate shortening
of a cut line.

Comparison uses the *same* mixed-eight planted exact baseline as
PR #44 with a tight 800ms/12k node/1.5k pattern resource budget.
Its `UNKNOWN` does not imply the constructive result is optimal.
Successful reconstruction is an **upper bound** (an actual usable
candidate) for the selected minimization objective. No lower-bound
or class-optimum claim is made.

## CI measurements

Pending real GitHub Actions execution; fill with measured status,
elapsed time, audited case counts and Linux process RSS from the
`three-stage-lazy-report.json` artifact. Do not report a success
count before the actual workflow finishes.

## Unresolved and non-goals

There is no guarantee the greedy pass will find a plan despite one
existing, or improve towards a global/class optimum as the budget
grows. Its scoring and enumeration do not prove optimality. Browser
responsiveness, worker scheduling, immutable verified candidate
emission, independent server audit and actual mobile Safari behavior
remain to be evaluated before any production candidate hook.
There are no Supabase/Auth/stocks/migration changes.

The **different** PR #32 305-part verified physical gross-area
optimum is still 499,224 mm²; the general safe lower bound is
208,692 mm². The difference is open. PR #30 and PR #37's distinct
44/305 datasets must not be conflated with this holdout.
