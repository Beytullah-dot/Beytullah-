# Three-stage canonical nested guillotine — research (PR #42 candidate)

**Research-only.** This change introduces `docs/engine/three-stage-nested-exact.js`;
it is not imported by `docs/optimality-worker.js` or any user-facing
general optimality certificate. All calculations concern the explicit
canonical three-stage subclass, **not unrestricted guillotine cutting**.

## Physical mathematical class

All pieces are unrotated, stock-compatible in material/category/thickness
and constrained by the declared part grain. Each selected usable stock
rectangle has trim on every side and nonnegative kerf `k`. For each board:

- **VH-V:** stage 1 slices the board vertically into full-height strips.
  Stage 2 slices each strip horizontally into full-width bands.
  Stage 3 slices each band vertically into individual pieces.
- **HV-H:** the full transposition (horizontal strips, vertical bands,
  horizontal cuts within each band).
- Every cut crosses the **entire current live subrectangle**.
  A piece spans the full width/height of its own final band in the
  second-stage direction; no stage 4 and no mixed orientations within a
  board. Unused end pieces may be removed by physical full-edge cuts.
- A positive residual `r` beyond a final piece or band must satisfy
  `r >= k`. The half-open interval `0 < r < k` is invalid. Zero residual
  is valid with no cut. Parts may have different widths and heights.
- All integerized dimensions/kerf/trim are exact in a common up-to-6-decimal
  grid. Precision failures and exhausted compute budgets are UNKNOWN.

## Finite completeness argument — subclass only

For one third-stage band, its physical occupation along the last-stage axis
is `u = Σ(part spans) + (number of pieces - 1) * k`. For a containing
first-stage strip of width `d`, the exact permitted widths are
`d = u` or `d >= u + k`. Intersecting permitted widths for all bands
in the strip, the minimum feasible value belongs to the finite set of
band occupation thresholds `{u, u+k}`. Shrinking a strip to that minimum
does not increase the sum of strip widths; it cannot invalidate another
strip, stock boundary, or part assignment.

The solver enumerates every compatible homogeneous-height band count vector,
every threshold strip width, every admissible multiset of bands inside each
strip, then every admissible multiset of strips within each usable board.
Equal part-count vectors in the **same stock type** may retain one physical
witness because objective values depend on stock type, not the cut order.
Different count vectors are **not** dominated. The cross-stock exact DP
covers all remaining quantity vectors and stock quantities. Thus, **only
after complete enumeration/DP**, the result is optimal for this canonical
three-stage subclass for the requested `cost`, `area` or `count` target.

Material/rotations outside this subclass, >6-place precision, unknown
price in cost mode and search-budget exhaustion never create a general
infeasibility/optimality claim. Costs/areas use BigInt fixed-denominator
comparisons. Unknown-price stocks are not assigned a zero price.

## Independent oracle and physical audit

`tests/motor-three-stage-exact.cjs` uses a **different algorithm**:
each identity-based stock-copy assignment is enumerated; each assigned
stock is tested by recursive integer-coordinate enumeration of full-edge
cut trees with V-H-V/H-V-H stage transitions. It does not import strip
enumeration, candidate width thresholds or solver DP. Each generated
physical plan is also replayed against:

1. Its own independent live-leaf full-edge tree checker.
2. The production `auditCutPlan` physical audit.
3. Independent `optimization-oracle.cjs` production audit.

A strict witness uses five pieces `(8×10, 8×10, 18×12, 12×14, 12×8)`,
stock `32×24`, zero trim, 2 mm kerf. The cut pattern is stage 1 V
`18 | 12`, stage 2 H within each strip `10/12` and `14/8`,
and stage 3 V within the top-left band `8 | 8`.
This pattern is physically valid but neither canonical VH nor HV
**two-stage** pattern fits this stock. A `52×24` panel with recorded price
60 and a `32×24` panel with recorded price 90 establish different
single-panel minimum-cost versus minimum-gross-area choices.

All empirical counts, runner RSS and timing must come from **actual
GitHub Actions**. Do not transfer historic two-stage figures to this run.

## Limits and unresolved cases

This solver is research-only and unconnected to production certifiers.
It is not complete for arbitrary four-or-more-stage guillotine trees,
mixed direction on one board, or rotated pieces. It never converts
`unknown-limit` or `infeasible-three-stage-class` into general physical
infeasibility or certified optimum.

**Separate older benchmarks remain open:** PR #32's verified 305-piece
physical gross-area optimum is **499,224 mm²** while its *general* lower
bound is **208,692 mm²**. That gap is not closed by this research.
Neither the separate PR #37 strict-fullspan 44/305 jobs nor PR #30's
planted 44/305 cases are this holdout.

## Reproduce

```bash
MOTOR_THREE_STAGE_JSON=three-stage-report.json node tests/motor-three-stage-exact.cjs
```

No Supabase schema/Auth/stock/production data is used or changed.
