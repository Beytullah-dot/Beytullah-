# Beythaus Cut — First Stratified Motor Capacity Acceptance Study
Date: 2026-11-22. Research PR [#56](https://github.com/Beytullah-dot/Beytullah-/pull/56).
Actual GitHub Actions optimizer CI [#44972616223](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44972616223): **SUCCESS** on head `3bd91a89d83156d216a26461195c742ed1e339f8`.
Other same-head PR checks: Geometry [#44972616247](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44972616247) **SUCCESS**; uncapped motor scale [#44972616222](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44972616222) **SUCCESS**. JSON artifact: `motor-capacity-matrix.json` on optimizer run.

## Claims permitted and forbidden

This campaign is **35 synthetic geometry/stock fixtures × 3 independently selected objectives = 105 objective-runs**, NOT a statistically representative set of 105 commercial customer jobs. All fixtures deliberately have enough or generous stock for physically feasible cutting, and are not a production material catalogue. N points 10, 25, 50, 100, 200, 500, 1000 are experimental strata, **NOT hard user input limits**. K is distinct piece geometry/material/grain class. None of these positive results establishes a universal N ceiling or 100% motor-completion acceptance. Product v1 readiness stays **estimated 70%, unchanged**.

The actual synchronous deployed `engine.optimize(data,false,false,objective)` baseline is run in its own Linux Node process for every scenario; only **complete** plans pass the existing production physical cut replay **and** separate `tests/optimization-oracle.cjs` independent cut-tree replay. The actual deployed constructive Worker runs separately; its `feasible-uncertified` candidates receive the same two auditors. Bounded full-span / two-stage / three-stage research exact are measured independently; their class-optimum status is **never promoted to global optimum**. A global `OPTIMAL` requires a complete audited incumbent and the shipped objective-specific `BeythausOptimalityCertificate.certify` proof; a gap is a *certified lower-bound vs upper-bound discrepancy*, not proven achievable savings. Material assignment remains **fixed** in this test; never extrapolate its certificate to auto-material-assignment mode.

## Measured summary

- Synchronous deployed main engine: **105/105 fully placed and doubly physically audited**; **0** baseline watchdog timeouts. This is the synthetic sample success rate only.
- Deployed bounded constructive Worker: **69/105** doubly audited full plans, **36 UNKNOWN** (15 budget, 21 unsupported class); these are not proof of global infeasibility.
- Either real production solution path: **105/105** doubly audited physical plans.
- Global **objective-specific** optimum: **60/105**; **45** audited plans with positive bound gap or absent proof. Global proof by `count`: 23/35, `area`: 19/35, `cost`: 18/35.
- Class-only research optimum: **18**/105 full-span/3-stage status in the primary research column, plus **3** two-stage class optima (scope-limited and possibly overlapping); NOT additive with the global proof total.
- Deployed main-engine median `60.1 ms`, p95 `357.1 ms`; deployed constructive Worker median `15.8 ms`, p95 `325.5 ms`. These are isolated Linux Node measures, NOT genuine Safari/iPhone responsiveness.
- Largest observed process RSS across two computation/audit paths **136.3 MiB** (`139544 KiB`). This includes Node VM/runtime and auditing overhead; neither app memory limit nor mobile prediction.
- Max observed initial main-thread calculation about **521 ms**. Since it is currently synchronous on the main thread, **mobile UI freeze remains an open v1 risk**, irrespective of these Linux performance numbers.

| Fixture family | Main engine full | Constructive Worker full | Globally proven | Main engine p95 ms | Observed peak RSS MiB |
|---|---:|---:|---:|---:|---:|
| `fullspan` | 21/21 | 21/21 | 21/21 | 286 | 88.1 |
| `strip4` | 21/21 | 21/21 | 4/21 | 491 | 136.3 |
| `nested8` | 21/21 | 18/21 | 7/21 | 281 | 122.7 |
| `unique` | 21/21 | 9/21 | 7/21 | 366 | 118.6 |
| `multimaterial-rotation` | 21/21 | 0/21 | 21/21 | 187 | 71.1 |

**Fixed stock full-span strong witness**: 1000 physical parts, K=1, positive kerf=2mm, trim=1mm, single 62×66 stock type: independent proof = 334 stocks, gross stock area 1,366,728 mm², registered acquisition cost 30,060 synthetic currency units. All three `count`, `area`, `cost` prove global optimum **for this one defined job**. This does not establish all N<=1000 jobs are solvable or provable.

**Hard heterogeneous case**: Four heights and four differently priced stocks at N=1000 remained gap/uncertified for count, area and cost despite full double-audited production plan. A weak proof lower bound can cause a large gap: e.g. gross-area incumbent vs LB has a relative upper gap around 64.1% for Worker on this fixture; this **is not a forecast of reducible waste**. Benchmark must not declare a high-K / heterogeneous success optimal without a zero certified gap.

**Distinct K=N case**: at N=1000, all 1,000 pieces have distinct decimal dimensions on a fixed four-decimal grid. Production main optimizer formed complete doubly audited plans for all three objectives; constructive Worker returned UNKNOWN in these scenarios. Corrected fixture avoids accidental floating-addition precision artifacts. There is **no global proof** at N=1000 for this fixture.

**Panel/masif/grain case**: the bounded three-stage constructive Worker correctly returns `unknown-class`; deployed main engine delivers audited full plans. Under these specific fixed assignment/uniform matching stock conditions, all 21 panel/masif/grain objective runs happen to reach proven optimum. This does not certify flexible material assignment or all real grain combinations.

## N × K and objective detail

Symbols: `PROVEN` means independently audited feasible solution plus shipped global zero-gap proof. `GAP/UNKNOWN` means valid complete main-engine plan exists but mathematically optimal cannot be asserted. Three-entry triplets always follow order **count / area / cost**. Worker triplets are independently full/unknown.

| Fixture | N | K | Global optimum: count / area / cost | Constructive Worker: count / area / cost | Main engine longest ms |
|---|---:|---:|---|---|---:|
| `fullspan` | 10 | 1 | PROVEN / PROVEN / PROVEN | full / full / full | 9 |
| `fullspan` | 25 | 1 | PROVEN / PROVEN / PROVEN | full / full / full | 21 |
| `fullspan` | 50 | 1 | PROVEN / PROVEN / PROVEN | full / full / full | 29 |
| `fullspan` | 100 | 1 | PROVEN / PROVEN / PROVEN | full / full / full | 55 |
| `fullspan` | 200 | 1 | PROVEN / PROVEN / PROVEN | full / full / full | 69 |
| `fullspan` | 500 | 1 | PROVEN / PROVEN / PROVEN | full / full / full | 94 |
| `fullspan` | 1000 | 1 | PROVEN / PROVEN / PROVEN | full / full / full | 293 |
| `strip4` | 10 | 4 | PROVEN / GAP/UNKNOWN / GAP/UNKNOWN | full / full / full | 14 |
| `strip4` | 25 | 4 | PROVEN / GAP/UNKNOWN / GAP/UNKNOWN | full / full / full | 30 |
| `strip4` | 50 | 4 | PROVEN / GAP/UNKNOWN / GAP/UNKNOWN | full / full / full | 43 |
| `strip4` | 100 | 4 | GAP/UNKNOWN / GAP/UNKNOWN / GAP/UNKNOWN | full / full / full | 80 |
| `strip4` | 200 | 4 | GAP/UNKNOWN / PROVEN / GAP/UNKNOWN | full / full / full | 118 |
| `strip4` | 500 | 4 | GAP/UNKNOWN / GAP/UNKNOWN / GAP/UNKNOWN | full / full / full | 161 |
| `strip4` | 1000 | 4 | GAP/UNKNOWN / GAP/UNKNOWN / GAP/UNKNOWN | full / full / full | 520 |
| `nested8` | 10 | 8 | PROVEN / PROVEN / PROVEN | full / full / full | 11 |
| `nested8` | 25 | 8 | PROVEN / PROVEN / PROVEN | full / full / full | 27 |
| `nested8` | 50 | 8 | PROVEN / GAP/UNKNOWN / GAP/UNKNOWN | full / full / full | 41 |
| `nested8` | 100 | 8 | GAP/UNKNOWN / GAP/UNKNOWN / GAP/UNKNOWN | full / full / full | 71 |
| `nested8` | 200 | 8 | GAP/UNKNOWN / GAP/UNKNOWN / GAP/UNKNOWN | full / full / full | 88 |
| `nested8` | 500 | 8 | GAP/UNKNOWN / GAP/UNKNOWN / GAP/UNKNOWN | full / full / full | 120 |
| `nested8` | 1000 | 8 | GAP/UNKNOWN / GAP/UNKNOWN / GAP/UNKNOWN | unknown / unknown / unknown | 302 |
| `unique` | 10 | 10 | PROVEN / PROVEN / PROVEN | full / full / full | 16 |
| `unique` | 25 | 25 | PROVEN / PROVEN / PROVEN | full / full / full | 26 |
| `unique` | 50 | 50 | GAP/UNKNOWN / GAP/UNKNOWN / GAP/UNKNOWN | full / full / full | 43 |
| `unique` | 100 | 100 | PROVEN / GAP/UNKNOWN / GAP/UNKNOWN | unknown / unknown / unknown | 83 |
| `unique` | 200 | 200 | GAP/UNKNOWN / GAP/UNKNOWN / GAP/UNKNOWN | unknown / unknown / unknown | 115 |
| `unique` | 500 | 500 | GAP/UNKNOWN / GAP/UNKNOWN / GAP/UNKNOWN | unknown / unknown / unknown | 162 |
| `unique` | 1000 | 1000 | GAP/UNKNOWN / GAP/UNKNOWN / GAP/UNKNOWN | unknown / unknown / unknown | 376 |
| `multimaterial-rotation` | 10 | 4 | PROVEN / PROVEN / PROVEN | unknown / unknown / unknown | 10 |
| `multimaterial-rotation` | 25 | 4 | PROVEN / PROVEN / PROVEN | unknown / unknown / unknown | 20 |
| `multimaterial-rotation` | 50 | 4 | PROVEN / PROVEN / PROVEN | unknown / unknown / unknown | 38 |
| `multimaterial-rotation` | 100 | 4 | PROVEN / PROVEN / PROVEN | unknown / unknown / unknown | 49 |
| `multimaterial-rotation` | 200 | 4 | PROVEN / PROVEN / PROVEN | unknown / unknown / unknown | 100 |
| `multimaterial-rotation` | 500 | 4 | PROVEN / PROVEN / PROVEN | unknown / unknown / unknown | 180 |
| `multimaterial-rotation` | 1000 | 4 | PROVEN / PROVEN / PROVEN | unknown / unknown / unknown | 191 |

## Test family definitions

- `fullspan`: Same one dimension and one stock class.
- `strip4`: Four repeated heights and four heterogeneous stock prices.
- `nested8`: Eight mixed widths, four stock classes, V-H-V plausible.
- `unique`: K=N distinct dimensions; 4-decimal exact inputs.
- `multimaterial-rotation`: Two materials (panel/masif), required grain direction and 90° rotation.
All fixtures enforce positive kerf **2 mm**, trim **1 mm per edge**, dimensional/grain/material checks, bounded registered quantities, and known prices. The `unique` family intentionally uses finer than workshop-standard decimal geometries to isolate combinatorial complexity; there is no basis to treat it as a real-client input distribution.

## Open acceptance conditions

1. **No 100% motor acceptance yet**: this is a first nonrandom, feasible-fixture baseline. Add independent impossible/insufficient-stock, tight heterogenous, no-rotation, mixed-grain, auto-assignment and **independently known nonoptimal** target holdouts; distinguish genuine heuristic quality from weak bounds. Measure planned production workloads, not merely artificial strata.
2. **Main thread**: some first calculations reach hundreds of milliseconds on Linux. Move heavy initial `optimize` off UI thread with strict stale-request, cancel and double-audit gates; measure a real iPhone Safari before claiming mobile acceptance.
3. **Mathematical certificate**: objective-specific, only for audited full plans and fixed-material assumptions; never copy `optimal-three-stage-class` or `optimal-two-stage-class` into global 2D `OPTIMAL`. No universal N cap.
4. **Server**: `supabase/migrations/20261122_000003_server_physical_cut_guard.sql` is tested in isolated PostgreSQL only, **NOT APPLIED to live Supabase**; continue safe staging/compatibility/concurrency/RLS tests without modifying live Auth/stocks/production.
5. **Release D/E**: genuine two-user real transaction race tests, PDF/cost/offcut/cut sequence, Pages asset byte hashes/PWA cache, actual iPhone Safari and saw-workshop UAT remain open.
6. **Completion tracking**: motor development status **not accepted 100%**; overall v1 readiness **70% (+0 percentage points)**. `SUCCESS` CI on synthetic Node Linux is not a substitute for customer device tests.

