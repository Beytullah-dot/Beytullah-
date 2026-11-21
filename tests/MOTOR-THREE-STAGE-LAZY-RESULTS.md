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

## Verified GitHub Actions measurements (research HEAD `5bdda14d6c658b48777bbafdba331624a0b81f71`)

[Optimizer Verification run #44952409212](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44952409212):
the isolated lazy research test step **SUCCESS**. All **10/10** planted
cost/area research cases returned `feasible-uncertified` with **two**
physical guillotine auditors accepting each full cut tree, including
**11** independently audited best-so-far callback emissions.
The extended regression checks cover masif m³ pricing, fractional
dimensions, count objective and no inventory quantity oversubscription.
No false optimum claims were emitted. All counts below refer solely
to this designed experiment, **not** a population success percentage.

| Width family / parts / objective | Physical result | Stock copies | Recorded objective | Cuts | Wall time |
| --- | --- | ---: | ---: | ---: | ---: |
| mixed / 8 / cost | audited feasible | 1 | 100 TL | 7 | 4.728 ms |
| mixed / 40 / cost | audited feasible | 5 | 600 TL | 48 | 12.880 ms |
| mixed / 200 / cost | audited feasible | 24 | 2,943 TL | 199 | 79.001 ms |
| repeated / 200 / cost | audited feasible | 25 | 3,100 TL | 253 | 44.246 ms |
| mixed / 40 / area | audited feasible | 5 | 10,556 mm² | 48 | 10.496 ms |

The ten research cases and physical audits consumed approximately
**190.76 ms** together in one Linux/Node 22 process, excluding the
other test steps in the CI workflow. Observed process `maxRSS`:
**67,592 KiB (~66.0 MiB)**, including Node/V8 startup, fixtures,
both auditors and test code; not an algorithm-only memory metric,
a bound on other jobs or a mobile benchmark. The JSON report contains
individual nodes, board probes, counts, cut totals, objective values and
wall times. No real stock or Supabase records were used.

Under the previous PR #44 **different** budgeted exact experiments:
the mixed 8/40/200 cases and repeated 200 case reached `UNKNOWN`;
the repeated 8/40 cases completed class-exact enumeration. Here the
known **mixed-eight tight-budget exact baseline was again UNKNOWN**
(12,000-node / 1,500-pattern class budget), whereas this lazy study
constructed one independently audited board in the same planted case.
The mixed-200 24-sheet result is an **upper-bound witness**, not a
certified minimum: 25 planted copies were available, and the selected
24 cost 2,943 TL in this synthetic fixture. Do not compare wall times
as if the exact and heuristic methods had identical work or limits.
No arbitrary user-facing piece/board ceiling has been added.

## Post-merge and deterministic fuzz verification

Research PR [#46](https://github.com/Beytullah-dot/Beytullah-/pull/46)
merged into `master` at
`300187a29a3c73f3d0a9b901288f31aa62e092c5`.
Master Actions: [Optimizer #44952654524](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44952654524),
[Geometry #44952654649](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44952654649),
[WebKit emulation #44952654606](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44952654606)
and [Pages #44952654269](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44952654269):
**all SUCCESS**. Real iPhone Safari is NOT inferred from emulation.

After the initial 10 deterministic planted sample jobs, a distinct
**96-case seeded fuzz suite** varies up to 14 part identities, geometry,
positive/zero kerf, trim, stock quantity and all three objectives.
Its direct execution produced **93 feasible completed plans**
accepted by the production and independent full-edge tree audits,
with **3 UNKNOWN** (no false infeasibility). The same executable
suite is part of GitHub Optimizer Verification, not a user population
claim. The more comprehensive GitHub
[Optimizer #44952550336](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44952550336)
also passed the fuzz and policy checks. Its attached research JSON
reported Linux Node process maximum RSS **80,912 KiB (~79.0 MiB)**
including the additional tests, auditors and runtime, and aggregate
test wall time **329.06 ms**. This is distinct from the earlier
67,592 KiB run *before* the 96-case extension.

The subsequent PR [#47](https://github.com/Beytullah-dot/Beytullah-/pull/47)
adds explicit `seededFuzz` and `policyRegressions` fields to the
JSON artifact, for independently checkable per-run verification.
These tests only validate candidate physical soundness when a
complete plan is found. They provide **no exhaustive completeness,
minimum-cost or minimum-board certificate**.

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
