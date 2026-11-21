# Beythaus Cut — Kerf-expanded area proof and physically exact holdouts

**Released motor PR:** [#32](https://github.com/Beytullah-dot/Beytullah-/pull/32),
merged to master as `aaccc74ba4429b55872d8d98f4b8a910c5685220`
on 21 November 2026. GitHub Actions optimizer, geometry, iPhone
WebKit **emulation**, scale and Pages deployment were all verified
successful on the indicated commits. A physical iPhone/device acceptance,
multi-user cloud UAT or direct live-JS byte comparison is NOT implied.
No production database or inventory was modified.

## The new necessary geometric inequality

For a valid full-edge guillotine plan with saw kerf `k >= 0`, usable
board dimensions `W = stock.l - 2*trim` and
`H = stock.w - 2*trim`, let each placed part have positive dimensions
`(l_i,w_i)`. Every pair of distinct finished pieces is separated by a
kerf-width gap in at least one axis, since their lowest common ancestor in
the cut tree is a full-edge cut. Expand every placed rectangle rightward
by `k` and downward by `k`; the expanded rectangles remain pairwise
nonoverlapping and fit the `(W+k) x (H+k)` expanded board envelope.
Therefore, **for each source board**:

```
sum_over_its_parts((l_i+k)*(w_i+k)) <= (W+k)*(H+k)
```

The inequality is independent of part rotation, and respects grain rules
because it only relaxes, never introduces, alternative orientations.
Summing over bounded integer stock quantities yields a covering
RELAXATION, not physical packability:

```
demand = sum_over_all_parts((part.l+k)*(part.w+k))
capacity(stock) = max(0, (stock.l-2*trim+k)*(stock.w-2*trim+k))
if usable width and usable height are both strictly positive; otherwise 0.
```

The existing exact bounded-multiset `cover()` separately minimizes
registered stock COST, GROSS stock AREA and COUNT under that necessary
capacity. Unknown registered prices remain unknown. Invalid/nonfinite
inputs or exhausted proof budgets never manufacture a finite optimum.
`certify()` takes the greatest **completed valid bound** across the old
families and this new expanded-area family.

This construction resembles an additive geometric dual-feasible
necessary condition; it does **not** implement or validate arbitrary
general dual-feasible functions for mixed grains or non-guillotine exact
pricing. A generalized DFF or physical-pattern pricing solver remains
future research.

## Direct regression observations — original planted cases

The pre-PR lower bounds were read from the existing
`MOTOR-TRIPLE-THRESHOLD-RESULTS.md`. Updated values were independently
observed in an isolated-JS harness AND reproduced by the merged
master Optimizer run `44939079866` (success). Time-bounded family
completion may differ between machines.

| Original, not physically proven optimal | Existing feasible incumbent | Former LB | Updated LB | New open gap |
|---|---:|---:|---:|---:|
| 44 items / registered COST | 500 TL | 220 TL | **255 TL** | 245 TL (49.00%) |
| 44 items / gross AREA | 99,174 mm² | 71,544 mm² | **78,399 mm²** | 20,775 mm² (20.95%) |
| 305 items / registered COST | 1,000 TL | 409 TL | **485 TL** | 515 TL (51.50%) |
| 305 items / gross AREA | 585,753 mm² | 419,200 mm² | **467,000 mm²** | 118,753 mm² (20.27%) |

For these **original** cases, the actual physical optimum remains
UNKNOWN. A smaller reported bound gap is a stronger theorem; it is not
an improvement to the existing physical cut plan. In these direct
runs the new expanded family itself supplied the largest lower bound
for both objectives.

## Independent tests — explicitly separated claims

`node tests/motor-kerf-expanded-area.cjs` has two non-overlapping
kinds of reference:

1. **Exact stock-cover oracle, NOT a physical solver:** 28 deterministic
   seeds x 3 objectives = **84** complete comparisons. A fresh brute-force
   enumerator checks every bounded integer stock multiset using the
   geometric inequality. The isolated JavaScript harness observed
   **84/84 matches, zero unsafe overbounds**, examining 9,072 full
   combinations. This checks the new relaxation's DP implementation,
   not guillotine pattern feasibility.
2. **Separately proved PHYSICAL optimum:** Construct new 44- and
   305-piece plans with 60x20 mm and 60x42 mm direction-locked pieces,
   2 mm kerf, 1 mm trim, and independently written complete cut trees.
   Two separate production-tree auditors, including the oracle module's
   independent auditor, accept the plans; shortened full-edge cuts are
   rejected.

For the separate physically exact family, one 60x20 mm piece contributes
`(60+2)*(20+2) = 1,364 mm²` of expanded area and weight 1; one
60x42 mm piece contributes `(60+2)*(42+2) = 2,728 mm²` and weight 2.
The 62x66 mm source stock has 60x64 mm usable space and accommodates
either three small pieces or one large plus one small, using exactly
three weighted units. Its registered cost is 90 TL. **The expanded-board
area bound globally implies at least 1,364 mm² gross stock per unit.**
Other usable source types satisfy the independently checked cost
inequality `registered price >= 30 TL * floor(gross stock area / 1,364)`.
Two very cheap 24-mm-wide source types are physically unable to contain
any 60-mm-wide direction-locked piece; they are deliberately retained
in the relaxed stock-cover problem to expose the geometry gap.
Thus **all physical cutting plans** cost at least 30 TL per unit and
consume at least 1,364 mm² gross area per unit. The constructed full-edge
trees simultaneously attain both bounds: global physical optimality of
this family is proved without using the production optimizer.

| New physically exact holdout | Parts | Verified full-edge cuts | Physical cost optimum | Physical gross-area optimum |
|---|---:|---:|---:|---:|
| Mixed 7 + small-only 10 groups | 44 | 27 | **1,530 TL** | **69,564 mm²** |
| Mixed 61 + small-only 61 groups | 305 | 183 | **10,980 TL** | **499,224 mm²** |

The direct isolated-JS run of the **integrated certifier** returned:

| Proven-optimal physical case | Cost LB / open gap | Gross-area LB / open gap |
|---|---|---|
| 44 parts | 663 TL / 867 TL (56.67%) | 69,564 mm² / 0 |
| 305 parts | 5,490 TL / 5,490 TL (50.00%) | 208,692 mm² / 290,532 mm² (58.20%) |

**Attribution demonstrated:** these cases are already physically
optimal, so any positive certifier gap is **entirely weakness of the
relaxation and/or exhausted computation budgets**, not actual
achievable savings. In particular, for the 305-piece exact holdout
the larger cover DP may return `UNKNOWN` because of its internal
state/time budget even when the correct physical optimum is known
by an independent argument.

## Resources, scaling and next stages

The test JSON artifact `kerf-expanded-report.json` records objective
execution times, a Linux process-wide peak RSS high-water mark
(`process.resourceUsage().maxRSS`, KiB), and final heap/RSS samples.
The first isolated-JS run used a mocked process interface, so its
**resource numbers are not valid memory measurements**; only genuine
Node / GitHub Actions measurements may be reported as such. A CI
runner and actual iPhone Safari test are separate obligations.

For four or more thresholds, dominance is safe **only** when a
candidate has no greater objective and at least as much capacity in
**every** area/threshold coordinate. Weighted scalarization cannot be
used to discard multidimensional Pareto states. Exact pairwise skyline
checking is O(frontier²), so next steps should profile memory/RSS under
diverse 4+ threshold demands, use bounded internal computation with
`UNKNOWN` on interruption, and compare to a separate exhaustive
small-stock oracle. Do not present an incomplete threshold enumeration
as a globally completed relaxation. No four-threshold production solver
or MILP/CP-SAT/branch-and-price engine is claimed by this PR.

To isolate the 44/305 **original** cases further, compare the
current physical layout to additional fully audited physical pattern
searches, while keeping separate objectives and retaining the best
completed lower bound. Only a new feasible physically audited plan can
prove an incumbent improvement; only a matching lower bound or
independent exact physical oracle can prove optimality.

## Verified GitHub Actions and resource metrics

After merge `aaccc74ba4429b55872d8d98f4b8a910c5685220`:

- Optimizer verification: [44939079866](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44939079866) — **SUCCESS**.
  The independent 28 x 3 stock-cover oracle and both separately audited
  physical exact holdouts passed in real Node 22 on Linux. 84/84 exact
  stock-cover comparisons, 0 overbounds, 9,072 combinations.
- Geometry: [44939079961](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44939079961) — **SUCCESS**.
- iPhone WebKit **emulation**, not actual Safari device:
  [44939079982](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44939079982) — **SUCCESS**.
- Pages build and deployment:
  [44939079731](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44939079731) — **SUCCESS**.
- Source PR head `9d7828a00ab7eea60324503a046eb55f8ecfe216`
  also passed all four applicable source PR Actions checks:
  optimizer `44938954744`, geometry `44938954690`,
  WebKit emulation `44938954696`, uncapped-scale `44938954689`.
  The service worker was updated to
  `beythaus-cut-v39-kerf-expanded-proof`.

Real master Linux Node process, from optimizer step logs:

| Observation | Value |
|---|---:|
| 44-piece exact physical holdout: process maxRSS at checkpoint | 65,444 KiB |
| 305-piece exact physical holdout: process maxRSS at checkpoint | 97,772 KiB |
| Final process-wide peak RSS | **97,772 KiB (~95.48 MiB)** |
| Final heap used | 15,905,640 bytes |
| Final resident set RSS snapshot | 99,123,200 bytes |
| Independent oracle's 84 comparisons | 8.70 ms |
| 44-piece optimum: certification cost / area | 19.80 / 97.66 ms |
| 305-piece optimum: certification cost / area | 239.93 / 218.05 ms |

RSS high-water measures the entire Node process, not the per-algorithm
peak incremental allocation. The independent oracle test is
stock-multiset mathematical verification; it does not silently turn
into a general physical guillotine exact solver.

The physically optimal new 44/305 holdouts and the original
44/305 planted non-optimality-certified incumbents remain intentionally
separate datasets. General physical optimality is **NOT proved**.
