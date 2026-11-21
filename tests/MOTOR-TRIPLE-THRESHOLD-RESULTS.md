# Beythaus Cut — triple-threshold Pareto validation (21 November 2026)

## Mathematical scope

The stock-cover lower bound jointly enforces **usable stock area** and
**three different nested minimum-side threshold counts** on the exact same
bounded integer stock multiset. Per-sheet square-slot capacities account
for positive kerf and trim. For a fixed physical instance, all four
inequalities are necessary for any feasible guillotine plan. Relaxing actual
pattern geometry, rotation choices, cutting order and exact leaf partition
makes the resulting optimum a **safe lower bound only**. Cost, gross stock
area, and stock count are separately minimized.

The code uses a five-component state
`(usable area, threshold-1 slots, threshold-2 slots, threshold-3 slots,
objective)`. A state is pruned only if another state has at least as much
capacity in **every** resource and no larger objective. Dominance is an
exact pairwise skyline test; scalarized weights are used only for the
processing order, never for deleting candidates.

Pairwise skyline checks can grow quadratically in the number of states.
The internal proof budget is 700 states / 180 ms per certification group;
the test helper can request other budgets. This is a computation budget,
**not a user input limit**. A resource budget ending prematurely returns
`unknown-limit`, or the maximum bound from already fully completed
relaxations; it never reports exact completion for an interrupted triple.

## Independently enumerated strict separation

Parts: one 80×80 mm, two 50×50 mm, 25 25×25 mm; trim 2 mm, kerf 3 mm.

Stock types (mm, bounded quantity, registered cost in TL):

| Type | Size | Quantity | Unit cost |
|---|---|---:|---:|
| A | 50×240 | 2 | 46 |
| B | 80×600 | 3 | 143 |
| C | 70×110 | 1 | 32 |
| D | 60×240 | 1 | 122 |
| E | 130×90 | 1 | 84 |

Independent exhaustive stock-multiset enumeration gives **208 TL** for
all three threshold inequalities jointly, compared to **176 TL** for the
strongest two-threshold relaxed bound. This proves **strengthening of a
relaxation**, not existence of a 208-TL physical cut plan. The test
asserts these exact values and repeats independent oracle checks for
gross area and stock count.

## Physical feasibility versus relaxation and holdout

A second, independently planted **44-piece, five-stock** mixed-size
physical plan constructs full-edge guillotine cuts on actual consumed
leaves. The normal production auditor verifies it and rejects a deliberately
shortened cut. Cost and gross area are independently certified and reported,
including finite lower bounds, unknowns, absolute gaps and relative gap
upper limits. A positive gap means **unproven potential improvement**, not
an attainable saving.

Additionally, 24 deterministic jobs with **eight heterogeneous stock
types and five part-size classes**, positive kerf and trim, compare each
of three separately minimized objectives against a fresh exhaustive
**stock-multiset** oracle (72 target comparisons). This reference cannot
prove physical packability. The test records comparison counts, UNKNOWN,
resource use, and any unsafe overbounds in a JSON artifact.

Reproduce: `MOTOR_TRIPLE_JSON=triple-threshold-report.json
node tests/motor-triple-threshold.cjs`.
GitHub Actions stores the JSON with other optimizer artifacts.


## Measured CI results (PR #30, optimizer workflow 44933791883)

These figures are observations from a specific GitHub Actions Linux runner, not
a constant-time guarantee. The test independently enumerates 245,412
bounded-stock combinations across 24 seeds x three objectives.

- Strict cost example: three-threshold lower bound **208 TL** versus
  strongest two-threshold lower bound **176 TL**. Independent cost/area/count
  full-threshold references matched; the exact three-threshold relaxation
  cost case needed 14 peak states.
- Independent eight-stock / five-part-class oracle: **72/72 completed
  comparable results, 0 overbounds, 0 UNKNOWN**. Largest observed
  frontier 11 states, maximum per-result runtime 8 ms. This dataset by
  itself does not stress Pareto blowup.
- Audited **44 pieces, five stocks, 49 full-edge cuts**:
  registered cost incumbent 500 TL, certified LB 220 TL, **280 TL gap
  (56.00% of incumbent)**; gross stock area incumbent 99,174 mm²,
  certified LB 71,544 mm², **27,630 mm² gap (27.86%)**. Both remain
  \`status=gap\`, not \`optimal\`.
- Audited **305 pieces, 17 eligible heterogeneous stock types, five
  used source stocks, 310 full-edge cuts**:
  registered cost incumbent 1,000 TL, integrated certified LB **409 TL**,
  **591 TL gap (59.10%)**; gross area incumbent **585,753 mm²**,
  integrated certified LB **419,200 mm²**, **166,553 mm² gap (28.43%)**.
  Both remain \`status=gap\`, not \`optimal\`.
- On that 305-piece case at 700 frontier states / 250 ms: cost bound
  409 TL finished all ten threshold triples; area returned
  **UNKNOWN** with no usable triple LB. At 3,000 states / 1,000 ms,
  area produced a safe **419,200 mm²** LB from completed triples,
  **2,038 peak Pareto states**, but did **not** finish all ten
  triples (3/10 in this run). Timing can change the count of
  completed triples; a partial bound remains valid, but global
  triple enumeration completeness is unproven.
- Separate 35-state resource limit returned UNKNOWN for cost and
  area without manufacturing an exact bound. These are **internal
  computation budgets, never artificial limits on input parts/stocks**.

The holdout batch took 2,559 ms of wall time in this CI observation;
Node heap sampled before/after was about 6.6 MB / 49.4 MB. These two
snapshots are **not peak memory measurements**. For a trustworthy peak
RSS/heap profile, a separate process sampler or Actions runner metrics
would be required. Absolute timings and the number of completed
time-budgeted triples are machine dependent.

The 305-piece integrated cost and area bounds match the standalone
three-threshold reference LBs for this instance; this is evidence of a
stronger necessary-condition bound, **not** independent proof of physical
optimality. The physical witnesses establish feasible upper bounds
only. Cost and gross-area gaps must never be added together or conflated.

## Limitations and next research

The larger comparator tests are finite-stock relaxation tests, **not**
exact physical guillotine optimum oracles. Three thresholds may produce
no improvement, or return UNKNOWN, on larger heterogeneous cases.
Four or more simultaneous thresholds remain a mathematical extension,
not an implemented claim. Before attempting MILP, CP-SAT or branch-and-price,
a restricted pattern class and an exact pricing/feasibility oracle with
independent full-edge cut-tree validation are required. Two-stage
guillotine literature cannot justify unbounded-stage exactness.

Reference reading:
- https://www.sciencedirect.com/science/article/pii/S0305054813000749
- https://www.sciencedirect.com/science/article/pii/S0305054809002007
- https://doi.org/10.1057/jors.2012.70
- https://arxiv.org/abs/2111.06348

No Supabase schema, Auth, stock, or production data has been modified.
No real Safari/device end-to-end validation is claimed.
