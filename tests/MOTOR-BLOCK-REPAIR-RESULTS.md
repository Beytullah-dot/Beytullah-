# Beythaus Cut — Guillotine block-repair engine (20 Kasım 2026)

## Problem addressed

The prior main engine tried many permutations of single pieces, but when a
guillotine partitioning decision stranded pieces on other sheets it could
not rearrange the whole job. Moreover the legacy `improveGroupPacking`
returns without any action when the first plan has an unplaced piece or
more than eight bins.

The new `docs/engine/guillotine-block-repair.js` is an **enhanced fallback
when the first plan is incomplete**, not a replacement for every packing
stage. It does NOT impose a maximum piece or sheet input count.

## Method

1. Use exact geometric adjacency of a pair of rectangles and actual saw
   kerf to form physically manufacturable binary guillotine blocks.
2. Generate local two-, four-, eight- and selectively sixteen-piece
   slicing trees. Complementary blocks are located by indexed width and
   height. The search is interrupted by a processing budget; this is not a
   physical or mathematical cap on total input count.
3. Identify stock-spanning or near-stock-size blocks; the latter are cut
   from the real board with an explicitly represented exterior trim cut
   and measured residual rectangles.
4. Select stock patterns without using any stock more than its available
   quantity. Run several diversified greedy choices; for deeper layouts
   attempt a bounded minimum-remaining-values (MRV) exact-cover search.
   Remaining pieces can be packed with the existing engine.
5. Convert compound blocks back to their **original individual part
   identities, orientations, exact coordinates, full-edge cutting steps,
   saw kerf and physical residuals**.
6. Accept a candidate **only** if
   `production-audit.js:auditCutPlan` replays the entire cut tree and
   validates original parts, material/thickness, stock quantity and
   kerf. In every unsuccessful case retain the previous plan.
7. This is a **feasible-solution heuristic**, not a general optimality
   proof. The existing rigorous lower-bound/certificate stage remains
   independent and can certify only when conditions are genuinely met.

The implementation has **processing time, candidate-state and local
pattern depth budgets**, not a fixed total number of allowed pieces or
sheets. Their effect must be shown transparently as an interrupted or
partial optimization, not an infeasibility result.

## Reproducible measurements

GitHub Actions research workflow runs
`node tests/motor-scalability-profile.cjs` and
`node tests/motor-repair-stress.cjs`.

### Original 11 planted-feasible cutting jobs

| Condition | Before | After |
|---|---:|---:|
| Complete, physically verified plans | 4/11 | **11/11** |
| Minimum-stock proofs, only for complete plans | 4/11 | **11/11** |
| Most demanding included test | 400 parts / 50 boards | 400 parts / 50 boards |

Particular cases: 200 parts / 25 boards / 3 stock sizes, 36 previously
unplaced now **0**. 400 parts / 50 boards / 3 stock sizes, 54 previously
unplaced now **0**. Stock counts and physical slicing trees re-audited.

### Additional 34 seeded planted-feasible jobs

- **24/24** varying measurements with 200 pieces / 25 stock boards,
  including single-size and three-size stock inventories, complete.
- **5/5** extra jobs with usable exterior leftovers and 3 mm kerf,
  complete.
- **4/5** deeper four-split-level jobs with up to 16 pieces per board,
  complete; **one job still had 3 unplaced pieces**.
- **33/34** complete total, **34/34** better than starting heuristic,
  and **0** worsened scenarios. All improvements audited independently.
- The 24 mixed-size full-board scenarios and the 5 exterior-offcut
  scenarios are **mandatory regression gates**.

These are synthetic **guaranteed-feasible** fixtures from actual physical
slicing trees; they are NOT evidence of universal 25/50-board success, nor
equivalent to the 2DPackLib benchmark. They deliberately conceal each
piece's original board and cutting order from the optimizer.

## Known open work before sealing

1. The single deeper 16-piece/board fixture that still strands 3 parts:
   better branching/backtracking, complete cover patterns and relocation
   among partly used boards; more randomized shapes / deeper levels.
2. Compare against external academic 2DPackLib tests with matching
   kerf/orientation/multi-stock/giyotin constraints, not merely manufactured
   complete-stock fixtures.
3. Test practical large mixed **partial-stock** remnant consumption,
   category/price competition, and live memory/latency on an iPhone.
4. Implement the chosen pre-calculation priority (cost **or** gross
   waste) in the actual search; record proof status and gap for that
   objective, not only stock count.
5. No independent server-side replay of every cut tree yet; true cloud
   physical production acceptance and two-user workflows remain separate
   unresolved safety tasks.

**Sealing status: NOT SEALED.** No promise that arbitrary huge NP-hard
instances can always be optimally solved in bounded time.
