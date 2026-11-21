# Physical stock-geometry compatibility — independent verification (21 Nov 2026)

Motor PR [#34](https://github.com/Beytullah-dot/Beytullah-/pull/34) merged as `5f94ff0bcc11ea4fe19a807fac1e849439fc1a99`. This is a **necessary geometry filter**, not a physical guillotine pattern generator. It was introduced in `docs/engine/optimality-certificate.js` before all independent cost/area/count relaxations. Service-worker cache advanced to v40.

## Soundness argument

Within each independent material group (or category in explicit material assignment mode), any physical cut of a positive-demand part from a stock of dimensions `(L,W)` requires one of the orientations the *part itself* permits. The stock's usable rectangle is `(L-2trim,W-2trim)`. A part locked to stock length requires `(l,w)`; locked to width requires a **permitted 90-degree rotation** and `(w,l)`; a free part may use the original orientation and may rotate only when the part permits it. Specified finite part thickness must match the stock thickness as in the actual engine. A mismatch of material grouping cannot provide that stock to this demand group. Thus if **no eligible item fits in either permissible orientation**, any physically valid cut tree uses zero such stocks. Deleting that stock type cannot delete a feasible physical solution; its removal from every *completed* relaxed stock multiset can only improve (raise) the valid global objective lower bound.

Saw kerf cannot make an oversized individual piece fit, but a tight, single-part exact-fit leaf need not have an extra kerf-width margin. It would be UNSAFE to reject a stock because the residual width is positive but less than kerf. The filter therefore only checks `kerf>=0` and uses single-item geometry; the original separate kerf-aware relaxations remain unchanged.

Invalid geometry, uncertain dimensions or exhausted filter time **fail open or return UNKNOWN**; filtered results are not used if incomplete. An excluded stock's unknown price cannot influence physical cost. An unknown price on *any remaining eligible stock type* still prohibits a cost certificate. No part-count, sheet-count or SKU-count ceiling was added. This filter is applied only in the certified, audited-plan path and never claims the retained stock collection has a feasible full-tree cutting plan.

## GitHub Actions verification

Source PR #34 head `6ac621f4d0e81c8cc4d8cd8f0bd6b501e0b7b691`: Optimizer `44940766616`, Geometry `44940766407`, scale research `44940766387`, iPhone WebKit **emulation** `44940766365`: **all SUCCESS**.

Master merge `5f94ff0bcc11ea4fe19a807fac1e849439fc1a99`: Optimizer `44940928987`, Geometry `44940928989`, WebKit emulation `44940929029`, GitHub Pages build/deployment `44940928297`: **all SUCCESS**.

Independent test `tests/motor-geometry-stock-filter.cjs`: **72 deterministic jobs x 3 independently optimized stock-cover objectives = 216/216 full exact stock-multiset comparisons**, `10,764` enumerations, **0 unsafe objective overbounds**. Physical witness: three 60x20 mm direction-locked pieces, 62x66 mm stock, trim=1 and kerf=2, with two full-edge cuts; original production tree audit + independent reference audit accept it, both reject the shortened cut. Minimum recorded cost **90 TL** and gross area **4,092 mm²** separately proved. The stock of size 24x360 mm is unusable regardless of its very low/unknown price. A compatible missing-price alternative correctly produces `unknown-price`. Zero time budget yields UNKNOWN, not a certificate.

## Legacy and newly physically exact holdouts — same merged engine CI

| Workload | Objective | Audited incumbent/physical exact optimum | New completed LB | Status |
|---|---|---:|---:|---|
| Original 44 items (physical optimum unknown) | COST | 500 TL incumbent | 255 TL | gap |
| Original 44 items (physical optimum unknown) | AREA | 99,174 mm² incumbent | 78,399 mm² | gap |
| Original 305 items (physical optimum unknown) | COST | 1,000 TL incumbent | 485 TL | gap |
| Original 305 items (physical optimum unknown) | AREA | 585,753 mm² incumbent | 467,000 mm² | gap |
| NEW 44 items (independently proved physical optimum) | COST | 1,530 TL optimum | 1,530 TL | optimal |
| NEW 44 items (independently proved physical optimum) | AREA | 69,564 mm² optimum | 69,564 mm² | optimal |
| NEW 305 items (independently proved physical optimum) | COST | 10,980 TL optimum | 10,980 TL | optimal |
| NEW 305 items (independently proved physical optimum) | AREA | 499,224 mm² optimum | 208,692 mm² | gap |

The new physically exact family has two very cheap, too-narrow stock types; the legacy 44/305 classes contain **zero** wholly incompatible stock types, so their bounds remain unchanged. Exact physical minimum for the NEW holdouts was already independently established in PR #32. The 305-area `208,692` result is a weak completed threshold family under the CI runtime budget, not a 58% savings opportunity.

This optimizer run reported whole-process Linux peak RSS `102,848 KiB` (about 100.44 MiB), which includes all preceding and subsequent tests and is NOT an isolated filter allocation or device memory guarantee.

## Open limitations

A singleton compatibility check does not guarantee that several parts share a feasible guillotine arrangement. Its necessary-condition strength can be zero on jobs with large compatible board collections. Real Safari/device acceptance, live-JS byte comparison, multi-user Supabase end-to-end stock consumption, and server-side independent physical tree verification remain open. Neither GitHub CI nor the mathematical lower bounds establish global physical optimality in general.
