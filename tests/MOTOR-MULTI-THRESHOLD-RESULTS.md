# Beythaus Cut — simultaneous multi-threshold cover validation

Date: 21 November 2026 (Türkiye). Implemented in PR #28.

## Exact mathematical claim

For every selected stock type s, let q_s be its bounded nonnegative integer
multiplicity, A_s its usable area after trims, and C_s(t) a **safe upper
bound** on the number of pieces with minimum side >= t that one sheet could
accommodate after kerf. Let D be total required part area and N(t) the count
of demanded pieces with minimum side >= t.

Every physically feasible guillotine production plan satisfies, for any
two thresholds t1 and t2 simultaneously:

- sum_s q_s A_s >= D
- sum_s q_s C_s(t1) >= N(t1)
- sum_s q_s C_s(t2) >= N(t2)
- 0 <= q_s <= stock_s.qty; q_s integer.

The minimum registered stock cost, gross stock area, and sheet count are
solved separately for the resulting *relaxation*. Relaxing actual rectangle
placement/cut order can only make its optimum no greater than the true
physical optimum. A trusted physical incumbent attaining that lower bound
certifies **that one objective**. It is not an exact general guillotine
solver, nor a proof of infeasibility when the search is interrupted.

Pareto states are (usable_area, slots_t1, slots_t2, objective). A state is
discarded only if another state provides >= each of the three capacities
and <= objective. The area-descending scan uses an offline two-dimensional
Fenwick prefix-min on threshold slots. This is safe dominance, not
heuristic state deletion. Bounded compute time/state resources return
UNKNOWN; they do not set user-visible input limits.

## Independently audited worked example

Pieces: 2 x 70x70 mm, 15 x 40x40 mm and 14 x 20x20 mm;
kerf 3 mm, trim 2 mm, 18-mm panel, 39,400 mm2 part area.

Available stock:

| Type | Dimensions mm | Available qty | Recorded unit cost |
|---|---:|---:|---:|
| A | 50 x 900 | 5 | 61 TL |
| B | 600 x 77 | 1 | 78 TL |
| C | 200 x 200 | 4 | 90 TL |

Independent stock-multiset exhaustive oracle enforces **all** thresholds.
The new DP runs pairs of thresholds while retaining any completed bound.
For this case its bounds equal the exhaustive all-threshold oracle.

| Metric | Previous area+one-threshold LB | New area+two-threshold LB | Independent audited feasible optimum witness |
|---|---:|---:|---:|
| Registered cost | 78 TL | **139 TL** | A+B = 139 TL, gross area 91,200 mm2 |
| Gross stock area | 46,200 mm2 | **80,000 mm2** | C+C = 80,000 mm2, cost 180 TL |

Both witnesses were independently constructed from literal, current
full-edge guillotine cut-tree leaves; neither was built by the proof
solver. The separately loaded `production-audit.js` checker accepted
both complete 31-part witnesses. Deliberately truncated cut rejected.

Cross-objective **certified upper limits on possible improvement**:
- Cost-optimized A+B plan has area gap 91,200 - 80,000 = 11,200 mm2,
  approximately 12.28% of that incumbent gross stock area.
- Area-optimized C+C plan has recorded-cost gap 180 - 139 = 41 TL,
  approximately 22.78% of that incumbent cost.
These are **not** promised attainable improvements from those plans.

## Independent six-stock holdout

`tests/motor-multi-threshold.cjs` generates 64 deterministic cases
with six heterogeneous stock types (different dimensions, registered
prices and bounded quantities) and four heterogeneous part-size classes,
including non-square pieces. Each reference is obtained from an
independent exhaustive stock-multiset enumeration across **all**
thresholds; no dynamic-programming routines or dominance code are
shared with the reference.

- 64 cases x 3 objectives (registered cost, gross area, count) = **192**.
- Completed, comparable bounds: **192 / 192**.
- Unsafe overestimates relative to independent oracle: **0 / 192**.
- Incomplete bounds in these particular holdouts: **0**.
- A separate, previously established 150-part/30-sheet/6-stock
  positive-kerf physical-tree holdout remains guarded by
  `tests/motor-nested-residual.cjs` (PR #24).

These counts are **regression evidence**, not a proof that all larger
heterogeneous cutting jobs become solvable. An oracle that also relaxes
physical guillotine cuts cannot prove pattern feasibility on its own.

## Tested guards and limitations

- Missing alternate eligible stock price prevents cost certification.
- A zero proof budget returns UNKNOWN, not an optimum or infeasibility.
- Different objectives retain different optimal plans and explicit gaps.
- Signed-off witnesses must pass independent physical cut-tree audit.
- No real Supabase inventory, production record, Auth or migration touched.
- Real iPhone/Safari and two-user production UAT remain outstanding.
- General unrestricted guillotine exact optimization remains unsolved.

Related academic approaches (not implemented here):
- Multiple stock sizes and two-stage models:
  https://www.sciencedirect.com/science/article/pii/S0305054813000749
- Arc-flow guillotine model:
  https://www.sciencedirect.com/science/article/pii/S0305054809002007
- Branch-and-price for *two-stage* guillotine cutting:
  https://doi.org/10.1057/jors.2012.70

The current proof is a direct necessary-capacity relaxation, not a claim
to implement the exact published pattern-pricing algorithms.
