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
