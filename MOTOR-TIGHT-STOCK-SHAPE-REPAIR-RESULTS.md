# Beythaus Cut — Stock-shape physical completion repair
**22 November 2026 | PR #58 | measured head `ee736f7076a115fe45a108a7f999bf43a09d8d02`**

Verified PR-head CI: [Optimizer SUCCESS #45046398189](https://github.com/Beytullah-dot/Beytullah-/actions/runs/45046398189), [Geometry SUCCESS #45046398195](https://github.com/Beytullah-dot/Beytullah-/actions/runs/45046398195), [Uncapped Scale SUCCESS #45046398194](https://github.com/Beytullah-dot/Beytullah-/actions/runs/45046398194), [automated WebKit smoke SUCCESS #45046398308](https://github.com/Beytullah-dot/Beytullah-/actions/runs/45046398308). Automated WebKit is NOT physical iPhone Safari UAT.

## Production implementation
`docs/engine/guillotine-block-repair.js`: shape-multiplicity bottom-up reconstruction of physically full-edge guillotine cutting patterns; diverse stock types, each with limited quantity; repeated part instances are bound only AFTER the general shape pattern is found. Respect material/thickness, grain/rotation, kerf, trim, stock count, unknown prices and count/area/cost objective. Candidate must place **every** piece and pass deployed production audit before replacing an incomplete plan. Independent `tests/optimization-oracle.cjs` replays all resulting plans in CI. Preplanted cutting witnesses remain inaccessible to the motor. This heuristic does not issue optimum or infeasibility proofs.

A second, general bug was identified using a **different six-leaf holdout**: the dynamic program prematurely stopped when a particular intermediate part-count level was empty, even though two 3-piece subtrees can make a valid 6-piece tree without any 4-piece tree. Empty cardinality levels now continue. Local pattern depth (eight pieces), state and time caps are search-resource limits, **not user project N limits**. Exhaustion means incomplete/UNKNOWN.

## PR #57 original stratified campaign — same 60 cases

| Physical N (feasible only) | Previous enhanced/UI full | New enhanced/UI full | New selected-objective global certificate |
|---|---:|---:|---:|
| 10 | 6/6 | 6/6 | 6/6 |
| 25 | 6/6 | 6/6 | 6/6 |
| 50 | 3/6 | 6/6 | 6/6 |
| 100 | 0/6 | 6/6 | 6/6 |
| 200 | 0/6 | 6/6 | 6/6 |
| **Total** | **15/30** | **30/30** | **30/30** |

Feasible family: panel-tight **6/15 → 15/15**; mixed-grain-tight **9/15 → 15/15**. The other 30 target cases (panel-scarce 15, mixed-grain-scarce 15) are independently **AREA-IMPOSSIBLE**; none was falsely accepted as full. Unenhanced baseline stays **7/30**; separate bounded constructive Worker stays **3/30**.

The shipped global lower-bound/equal-upper-bound certifier marked **30/30 selected objectives OPTIMAL**: count **10/10**, gross area **10/10**, recorded cost **10/10**. All 30 full candidate cut trees passed both the deployed production audit and **independent physical oracle** replay. That second auditor independently confirms physical geometry, not a second proof of global objective optimality. No class-only two/three-stage proof was promoted to global. The old planted witness was not injected, no known positive plan beat the enhanced plan, unknown prices were never interpreted as zero.

Isolated Linux Node 22 first enhanced calculation wall time across 60 target cases: p50 **122.1 ms**, p95 **704.2 ms**, peak **1387.2 ms**. Maximum observed process RSS **137.4 MiB** (includes VM and audits). This is NOT real phone responsiveness or a guaranteed SLA.

## Independent holdout

`tests/motor-stock-shape-holdout.cjs` independently builds a different six-leaf/five-cut tree per board, reverses input piece order and varies dimensions, stock/material, forced rotation, positive kerf and trim. It is **not** the PR #57 fixture. Four N=12/24/48/96 cases × 3 count/area/cost goals = **12 feasible holdout objective-runs**. Previously unenhanced **3/12** completed; newly enhanced **12/12** completed and passed production + independent geometry audit. 12 additional empty-stock negatives produced **0** falsely accepted full plans. No separate global optimum claim on holdout.

## Acceptance and restrictions

These selected synthetic families are not representative commercial success percentages. The practical UNKNOWN profile, quality of plans beyond these families, real devices and sustained budget/SLA remain unverified. Neither motor development nor product v1 is accepted at 100%. Product v1 engineering estimate stays **~70% (+0)**. First synchronous optimize still blocks the UI thread pending Worker migration. Server physical-cut migration `20261122_000003_server_physical_cut_guard.sql` remains **unapplied**; live Supabase was only inspected in read-only mode (actual migration history has initial inventory and atomic production v2 only). Do not change real user stock/Auth/payment/production records for testing. Open: PDF/cut order/offcut/cost/stock E2E; isolated server physical audit and atomic concurrency; real iPhone Safari and two-user acceptance.

After PR merge, separately confirm current master SHA, master Optimizer/Geometry and actual GitHub Pages deployment. A green PR is not a deployed release.
