# Beythaus Cut — Exact physical full-span guillotine patterns (21 November 2026)

**Scope:** Strict fixed-orientation/full-span **physical** subclass, **not** general two-dimensional guillotine cutting. All stock, account, production, and Supabase records are unchanged.

- Research [PR #37](https://github.com/Beytullah-dot/Beytullah-/pull/37) merged as `45e46905f022d46b3b84ebed1a2b63defe066be5`.
- Production proof integration [PR #38](https://github.com/Beytullah-dot/Beytullah-/pull/38) merged as `d9497b4bad51d7d1a6c33c787c78df52a636f899`.
- Code: `docs/engine/fullspan-strip-exact.js`; proof bridge: `docs/engine/optimality-certificate.js` and `docs/optimality-worker.js`. PWA cache `beythaus-cut-v41-fullspan-physical-proof`.

## Soundness of exact physical reduction

The solver accepts only a material-compatible group in which every part has exactly the same longitudinal dimension `P`, every part is constrained to the nonrotated orientation, and **every usable, physically eligible stock** has trimmed longitudinal width exactly `P`. Thickness must match; material auto-assignment is excluded. A board wider than `P` that can hold even one part would permit other full-edge arrangements: the solver then returns `unknown-class`, never a physical optimum.

Under those premises, a vertical full-edge cut cannot leave any child holding a required `P`-wide part. Thus any valid item-producing guillotine tree can be represented by horizontal full-edge cuts and one-dimensional strips. For any nonempty board pattern with `n` pieces of heights `h_i`, saw kerf `k >= 0`, and board usable height `H`, the total required span is `sum(h_i) + (n-1)k`. Any trailing unused height `R = H - sum(h_i) - (n-1)k` must be zero or at least `k` to be separated into an actual free leaf. If `0 < R < k`, that pattern is invalid (an overly short scrap cannot be made by the saw). For `k=0`, any nonnegative residual is separable.

The implementation exhaustively enumerates the physically valid integer demand-vector patterns for each eligible stock type, then solves the bounded exact stock-cover DP, separately minimizing **recorded stock cost**, **gross stock area**, or **board count**. It materializes every chosen cut as a full-edge tree and preserves physical part IDs. An exhaustive finish proves the physical optimum **only within this certified subclass**. Any time/state/node budget exhaustion, unrepresentable decimal grid, unsupported orientation, mixed compatibility, or uncaught internal anomaly returns UNKNOWN; it never proves infeasibility/optimality. There is no artificial user-facing piece or board count limit. A missing recorded price remains unknown for the cost objective.

The main deployed proof certifier uses this as an **optional seventh, independently validated proof family**. Only results tagged `optimal-physical-class` enter the maximum of completed safe lower bounds; missing module, a rejected class, a timeout or an exception leaves the existing families in place. The certifier still needs an independently audited feasible incumbent and never infers physical optimality for unrelated two-dimensional layouts.

## Independent test evidence

The research test `tests/motor-fullspan-exact.cjs` compares the solver against an entirely separate **per-item, per-physical-sheet exhaustive assignment oracle**. Over 24 deterministic jobs × 3 objectives, **72/72** results match across **93,000** assignments; no false completed optimum. It also audits every returned pattern with the normal production full-edge audit and `tests/optimization-oracle.cjs` independently. It rejects tampered short cuts, 1-mm leftover with 3-mm saw kerf, unsupported grain/rotation, wide alternative stock, unknown registered price, and zero budget. Masif `priceUnit:m3` retains the existing volume-based stock cost.

Research CI (PR #37 HEAD `b642a81a184b51011eead2954f3583ddc1fe430f`) SUCCESS: Optimizer `44942648819`, Geometry `44942648787`, Scale `44942648902`, iPhone WebKit **emulation** `44942648807`. Master PR #37 merge checks: Optimizer `44942778055`, Geometry `44942778071`, WebKit emulation `44942778134`, Pages `44942778265` SUCCESS.

Production proof test `tests/motor-fullspan-certificate.cjs` independently checks a full-edge 6-part witness plus cost/area/count certificates and the **actual** `optimality-worker.js` importScripts/message boundary. With 60-mm fixed width, three 45-mm pieces and three 35-mm pieces, usable height 80 mm and kerf 2 mm:

| Objective | Old kerf-expanded area relaxation | New physical exact bound | Verified physical optimum |
|---|---:|---:|---:|
| Registered COST | 320 TL | 400 TL | 400 TL |
| Gross AREA | 20,336 mm² | 25,420 mm² | 25,420 mm² |
| Board COUNT | 4 | 5 | 5 |

In the **same physical job** of four 60×20-mm parts, the lowest cost is **96 TL** and the lowest gross area is **5,456 mm²**, attained by **different cutting plans**. The cheapest plan has gross area **5,580 mm²**; the minimum-area plan costs **140 TL**. Each opposite objective correctly stays at `gap`, rather than falsely granting another optimum proof.

The 44/305 tests here are **new uniform full-span jobs**, not the original PR #30 and not the independently planted PR #32 holdouts. For 44 items, 15 audited boards attain recorded cost **1,350 TL** and gross area **61,380 mm²**, both proved optimal for that strict class. For 305 items, 102 audited boards attain **9,180 TL** and **417,384 mm²**, both proved. The research case observed 10,607 memo states and ~27 ms for 305 items in one Linux GitHub CI run. This is not an algorithmic complexity guarantee.

The PR #38 final source HEAD `36acdf62472a14999a424be15f5d2756a4171e05` passed Optimizer `44943104123`, Geometry `44943104128`, scale `44943104120`, and iPhone WebKit **emulation** `44943104122`, all SUCCESS. Linux process peak RSS in the proof integration test was **68,768 KiB** (~67.16 MiB); this is whole-process peak, not isolated extra memory or a real-phone device guarantee. The update also tested optional solver exceptions and strict fallback.

PR #38 merge `d9497b4bad51d7d1a6c33c787c78df52a636f899`: Optimizer `44943215498` SUCCESS; Geometry `44943215388` SUCCESS; Pages `44943215250` SUCCESS. iPhone WebKit emulation `44943215406` was still in progress **when this report was initially drafted**: re-check its final result and update the handoff before finalizing. Do not transpose source-PR checks into master status.

## Limits and future work

The old PR #30 physically feasible 44/305 workloads retain incumbent/lower-bound gaps, and the PR #32 independently proved 305-piece physical optimum still has a weak AREA certificate in the general case. These were **not** solved by the restricted full-span code. Improving them requires independently verifiable multiple-width/nested full-edge pattern generation, sound branch-and-price/MILP/CP-SAT or safe dominance, explicit complexity/RSS/UNKNOWN tracking and distinct cost/area objectives. General physical optimality is **NOT** established. Supabase migration, real stock, production data, and Auth were not modified. Actual iPhone Safari, multi-user cloud end-to-end testing, live JS byte comparisons, and independent server-side cut-tree validation remain outstanding.

Conceptual research reference only (not claimed as implemented equivalence): [Pattern-based diving for guillotine cutting stock with leftovers](https://www.sciencedirect.com/science/article/pii/S2192440621001180) and [Exact generation of multi-level patterns](https://www.sciencedirect.com/science/article/pii/S1524070324000080).
