# Three-stage nested guillotine: bounded scale and real RSS study (PR #44)

**Research only; no production Worker or general optimality certificate integration.**
This study profiles the same mathematically restricted `VH-V/HV-H` canonical
physical guillotine exact module introduced in PR #42. It never proves
unrestricted 2D guillotine optimality and never maps `unknown-limit` to
infeasibility. Source and reproducible test:
`docs/engine/three-stage-nested-exact.js`,
`tests/motor-three-stage-scale.cjs`.

## Reproducible experimental setup

24 isolated Node.js 22/Linux processes, with one solver call per process.
The job is visibly planted, with positive **2 mm kerf**, **1 mm trim**,
four catalogued compatible panel stock types of **52x36, 54x38,
56x40, 60x42 mm**, respective recorded prices **100, 114, 129, 157**.
At eight pieces only the first stock type has positive availability;
at 40 and 200 pieces all four stock types have positive quantities.
Each board's usable area contains the same genuine full-edge, three-stage
physical pattern: V strips of 24+2+24 mm; H bands of 16+2+16 mm;
V piece pairs that occupy 24 mm each. A repeated variant has all
eight parts 11x16 mm; the mixed variant has piece lengths
8,14,10,12,9,13,7,15 mm (all heights 16 mm).
One, five and 25 planted boards correspond to 8, 40 and 200 pieces.
Stock availability sums to the planted board count; no real inventory
is involved. For each variant and count, test both recorded-cost and
gross-stock-area objectives under two budgets:

| Budget | Max time | Max enumerator nodes | Max stock patterns | Max DP memo states |
| --- | ---: | ---: | ---: | ---: |
| tight | 800 ms | 12,000 | 1,500 | 2,500 |
| expanded | 1,600 ms | 80,000 | 12,000 | 12,000 |

The explicit budgets belong only to the test harness, **not**
arbitrary product limits on user part or board counts. Successful
results must pass the current production `auditCutPlan` and an
independent `optimization-oracle.cjs` physical-tree audit.

## Verified real GitHub Actions measurements

Source: [Optimizer Verification #44951231525](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44951231525),
`Profile bounded three-stage exact enumeration and isolated Linux RSS`
step. Results are recorded by individual cost/area child-process runs in
`three-stage-scale-report.json` in the Actions artifact.

**8/24 trials** completed exact enumeration/DP for the canonical class
and passed both physical auditors; **16/24** returned `unknown-limit`.
This is a small deliberately designed stress matrix, **not a population
success rate or an optimum guarantee**.

Representative cost-objective runs (the paired area-objective tests
matched each status and resource-limit mechanism):

| Part widths / pieces | Budget | Result | Wall ms | maxRSS KiB | Shelves | Strips | Board patterns | DP states | DP transitions |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| repeated / 8 | tight | class-optimal, audited | 3.695 | 48,240 | 6 | 48 | 8 | 8 | 8 |
| repeated / 40 | tight | class-optimal, audited | 22.719 | 59,284 | 24 | 240 | 32 | 443 | 6,240 |
| repeated / 200 | tight | UNKNOWN (12,001 nodes) | 33.281 | 59,516 | 24 | 240 | 32 | 903 | 10,427 |
| repeated / 200 | expanded | UNKNOWN (80,001 nodes) | 77.906 | 60,492 | 24 | 240 | 32 | 4,767 | 78,427 |
| mixed / 8 | tight | UNKNOWN (1,501 strips) | 9.072 | 57,088 | 131 | 1,501 | 0 | 0 | 0 |
| mixed / 8 | expanded | UNKNOWN (80,001 nodes) | 1,020.929 | 65,852 | 131 | 6,224 | 188 | 0 | 0 |
| mixed / 40 | expanded | UNKNOWN (12,001 strips) | 43.559 | 67,060 | 374 | 12,001 | 0 | 0 | 0 |
| mixed / 200 | expanded | UNKNOWN (12,001 strips) | 52.245 | 66,316 | 374 | 12,001 | 0 | 0 | 0 |

**Peak observed process RSS in this specific matrix:** 67,060 KiB
(~65.49 MiB). It includes Node/V8 baseline and test harness; it is
neither algorithm-only memory nor a bound on larger jobs. Current
process RSS and heap usage are independently included in the JSON
rows. Timings are isolated runner observations, not mobile-device
latency. The test reports generated shelves, generated strips, whole-board
patterns, exact memo states and examined DP transitions, so a partial
enumeration is not mistaken for a completed proof.

**Key bottlenecks:** even mixed **8-piece** jobs can hit thousands of
strip configurations before reaching cross-stock DP; allowing higher
budgets does not automatically eliminate this structural combinatorial
growth. With repeated geometry at 200 pieces the exact enumeration
completes, but cross-stock DP grows to 4,767 memo states/78,427
transitions before the 80,000-node research budget is exhausted.
A tiny elapsed time on an UNKNOWN result does **not** imply the hard
case is solved quickly.

## Consequence for integration

**Do not yet connect this full exact enumerator to the live generic
optimizer as an unconditional candidate provider.** In the worst
small mixed example it consumed ~1 second of Linux runner time without
producing a candidate; a browser/mobile budget and the fallback
policy require separate tests. Research next: construct an
independently audited *anytime* feasible partial-pattern emitter or
safe lazy/column generation of physical board candidates, with an
explicit feasible-plan-only contract and no class/global optimality
label. Compare one or more controlled search budgets against baseline
physical plans. Do not use unsafe cross-vector pattern dominance.

The separate PR #32 verified 305-piece physical gross-area optimum
**499,224 mm²** versus general lower bound **208,692 mm²** remains
open. The strict-fullspan PR #37 44/305 tests and PR #30 44/305
planted stress jobs are different fixtures.

## Reproduce

```bash
MOTOR_THREE_STAGE_SCALE_JSON=three-stage-scale-report.json node tests/motor-three-stage-scale.cjs
```

No Supabase Auth, real stock, migration, production history or schema
is read or changed. Real Safari/iPhone and multi-user cloud UAT
remain separate outstanding acceptance tests.
