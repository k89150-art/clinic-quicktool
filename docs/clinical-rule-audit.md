# Phase 1.1 Clinical Rule Audit

Audit date: 2026-08-13  
Audited commit: `38283e1` (`Build Clinic QuickTool Phase 1`)  
Scope: the rules actually executed by the Phase 1 client-side application. This document describes existing behavior only; it does not approve, reinterpret, or change any clinical rule.

Phase 1.3 update: decision precedence, partial BP evidence, domain numeric validation, advisory propagation, and VPN wording were re-audited on 2026-08-13. The Phase 1.3 corrections below supersede the original Phase 1.1 observations where noted. **No confirmed numeric clinical threshold changed.**

## Status and data conventions

- `eligible`: UI label `符合`.
- `not-eligible`: UI label `不符合`.
- `insufficient-data`: UI label `資料不足`.
- `refer`: UI label `評估轉介／其他方案`.
- Numeric missing data is `null`, not `0`.
- Tri-state inputs are `yes | no | unknown`.
- `vpnConfirmed` changes explanatory text only. It does **not** change `eligible` to another status in any current rule engine.
- Rule source versions displayed by the app are maintained in `src/config/clinicalRuleVersion.ts`:
  - DM/CKD/DKD: 衛生福利部中央健康保險署, effective date `2026-04-01` / `115/04/01`.
  - Metabolic syndrome: 衛生福利部國民健康署, 2026 / ROC year 115.

## 1. Metabolic syndrome disease determination

Source function: `src/features/eligibility/domain/metabolicRules.ts` → `evaluateMetabolicSyndrome()`  
Shared test file: `src/features/eligibility/domain/metabolicRules.test.ts`

### MET-DX-OBESITY — Obesity risk factor

- **Inputs:** `sex`, `waist`, `bmi`.
- **Actual expression:** positive when `(bmi !== null && bmi >= 27) || (sex === 'male' && waist !== null && waist >= 90) || (sex === 'female' && waist !== null && waist >= 80)`.
- **Thresholds:** male waist `>= 90 cm`; female waist `>= 80 cm`; BMI `>= 27 kg/m²`.
- **Positive / contributes one eligible factor:** any one of the three expressions is true. Waist and BMI being positive still count as one factor.
- **Negative:** no positive expression and all of `bmi`, `sex`, and `waist` are non-null.
- **Insufficient:** otherwise remains `unknown`; for example, BMI below 27 with missing sex or waist.
- **Refer:** none.
- **Tests:** waist `89.9/90`, female waist `79.9/80`, BMI `26.9/27`, and double-positive waist+BMI counts once.
- **TODO / uncertainty:** no explicit README TODO. Audit observation: the current negative result requires all three inputs even when one completed measurement is normal; clinical/UX confirmation may be useful, but this audit does not alter it.

### MET-DX-GLUCOSE — Glucose risk factor

- **Inputs:** `fastingGlucose`, `glucoseMedication`.
- **Actual expression:** medication first: `glucoseMedication === true` → positive; otherwise `fastingGlucose === null` → unknown; otherwise `fastingGlucose >= 100` → positive, else negative.
- **Threshold:** fasting glucose `>= 100 mg/dL`.
- **Positive:** threshold met or medication flag true.
- **Negative:** measurement present, below 100, medication false.
- **Insufficient:** measurement null and medication false.
- **Refer:** none.
- **Tests:** `99` negative; `100` positive.
- **TODO / uncertainty:** no explicit README TODO; medication category is not enumerated in code.

### MET-DX-BP — Blood-pressure risk factor

- **Inputs:** `sbp`, `dbp`, `bloodPressureMedication`.
- **Actual expression:** medication true → positive; otherwise a valid `sbp >= 130` or a valid `dbp >= 85` independently proves positive; both valid and below threshold → negative; otherwise unknown.
- **Thresholds:** SBP `>= 130 mmHg` or DBP `>= 85 mmHg`.
- **Positive:** medication true, or either available valid measurement reaches its threshold; the other measurement is not required.
- **Negative:** both measurements present, both below threshold, medication false.
- **Insufficient:** medication false, no available measurement is positive, and one or both measurements are missing/invalid.
- **Refer:** none.
- **Tests:** SBP `129/130`; DBP `84/85`; partial pairs `140/null`, `null/90`, `120/null`, `null/70`, and `120/70`.
- **TODO / uncertainty:** no explicit README TODO. Phase 1.3 corrected partial positive-evidence handling without changing `130/85`.

### MET-DX-TG — Triglyceride risk factor

- **Inputs:** `triglycerides`, `triglycerideMedication`.
- **Actual expression:** medication true → positive; null measurement → unknown; otherwise `triglycerides >= 150` → positive, else negative.
- **Threshold:** TG `>= 150 mg/dL`.
- **Positive:** threshold met or medication flag true.
- **Negative:** measurement present, below 150, medication false.
- **Insufficient:** measurement null and medication false.
- **Refer:** none.
- **Tests:** `149` negative; `150` positive.
- **TODO / uncertainty:** no explicit README TODO; medication category is not enumerated in code.

### MET-DX-HDL — HDL risk factor

- **Inputs:** `sex`, `hdl`, `hdlMedication`.
- **Actual expression:** medication true → positive; missing sex or HDL → unknown; otherwise male `hdl < 40`, female `hdl < 50` → positive, else negative.
- **Thresholds:** male `< 40 mg/dL`; female `< 50 mg/dL` (strictly less than).
- **Positive:** sex-specific threshold met or medication flag true.
- **Negative:** sex and measurement present and at/above threshold, medication false.
- **Insufficient:** sex or HDL missing and medication false.
- **Refer:** none.
- **Tests:** male `39.9/40`; female `49.9/50`.
- **TODO / uncertainty:** **yes** — README explicitly requires confirmation of which medications formally qualify as HDL-related treatment.

### MET-DX-AGGREGATE — Five-factor aggregation

- **Inputs:** the five factor results: obesity, glucose, blood pressure, TG, HDL.
- **Actual expression:** `positiveCount >= 3 ? eligible : positiveCount + unknownCount < 3 ? not-eligible : insufficient-data`.
- **Threshold:** at least 3 of 5 positive factors.
- **Eligible:** `positiveCount >= 3`.
- **Not eligible:** even treating every unknown as positive cannot reach 3: `positiveCount + unknownCount < 3`.
- **Insufficient:** not already eligible and still mathematically possible to reach 3.
- **Refer:** none.
- **Tests:** 3 positive; 2 positive + 3 negative; 2 positive + 1 negative + 2 unknown; 1 positive + 3 negative + 1 unknown.
- **TODO / uncertainty:** no explicit README TODO.

## 2. Metabolic syndrome prevention-program eligibility

Source function: `src/features/eligibility/domain/metabolicRules.ts` → `evaluateMetabolicProgramEligibility()`  
Test file: `src/features/eligibility/domain/metabolicRules.test.ts`

### MET-PGM-MISSING — Required-data gate

- **Inputs:** `age`, `dialysis`, and the result of `evaluateMetabolicSyndrome()`.
- **Actual expression:** known failures and unresolved fields are collected separately. Any age-range failure, `dialysis === 'yes'`, or syndrome `not-eligible` returns `not-eligible`; only when none exists do missing/invalid age, `dialysis === 'unknown'`, or syndrome `insufficient-data` return `insufficient-data`.
- **Eligible:** not decided by this rule.
- **Not eligible:** any known required-condition failure, even if another required field is unknown.
- **Insufficient:** at least one required item is missing/invalid/unknown and no known failure exists.
- **Refer:** none.
- **Tests:** age 70 + dialysis unknown; age null + dialysis yes; invalid age; syndrome aggregation and complete eligible paths.
- **TODO / uncertainty:** no explicit README TODO; the general administrative-conditions TODO still applies.

### MET-PGM-AGE — Program age range

- **Inputs:** `age`.
- **Actual expression:** `age < 20 || age > 64` → not eligible.
- **Thresholds:** inclusive `20–64` years.
- **Eligible condition contribution:** age between 20 and 64 inclusive.
- **Not eligible:** age 19 or lower; age 65 or higher.
- **Insufficient:** age null, handled by `MET-PGM-MISSING`.
- **Refer:** none.
- **Tests:** `19`, `20`, `64`, `65`.
- **TODO / uncertainty:** no explicit README TODO.

### MET-PGM-DIALYSIS — Dialysis exclusion

- **Inputs:** `dialysis` (`yes | no | unknown`), covering HD/PD in UI text.
- **Actual expression:** `dialysis === 'yes'` → not eligible.
- **Eligible condition contribution:** dialysis is `no`.
- **Not eligible:** dialysis is `yes`.
- **Insufficient:** dialysis is `unknown`.
- **Refer:** none.
- **Tests:** dialysis yes exclusion.
- **TODO / uncertainty:** no explicit README TODO.

### MET-PGM-SYNDROME — Disease-determination dependency

- **Inputs:** result of `evaluateMetabolicSyndrome()`.
- **Actual expression:** syndrome `not-eligible` → program `not-eligible`; syndrome `insufficient-data` → program `insufficient-data`; syndrome `eligible` proceeds.
- **Eligible condition contribution:** metabolic syndrome status is eligible.
- **Not eligible:** metabolic syndrome status is not eligible.
- **Insufficient:** metabolic syndrome status is insufficient.
- **Refer:** none.
- **Tests:** exercised through program age/dialysis cases and aggregation tests; no isolated dependency test.
- **TODO / uncertainty:** program administrative exclusions beyond the coded fields fall under the README administrative-conditions TODO.

### MET-PGM-FINAL — Program final result and VPN text

- **Inputs:** all above gates plus `vpnConfirmed`.
- **Actual expression:** after all gates pass, always returns `eligible`; `vpnConfirmed` only selects one of two reason strings.
- **Eligible:** syndrome eligible, age 20–64, dialysis no, all required inputs complete.
- **Not eligible:** any known age exclusion, dialysis yes, or syndrome not eligible; known failure takes precedence over unrelated unknown data.
- **Insufficient:** no known failure and at least one unresolved required input.
- **Refer:** none.
- **VPN behavior:** VPN never changes the clinical status. Eligible results always say `依目前輸入條件符合`, followed by either `尚未確認 VPN／收案系統資格` or `VPN／收案系統資格已人工確認`.
- **Tests:** age/dialysis boundaries, known-failure + unknown combinations, invalid age, and both VPN wording paths.
- **TODO / uncertainty:** **yes** — README administrative exclusions TODO; application cannot verify external VPN conflicts.

## 3. DM program eligibility

Source function: `src/features/eligibility/domain/diabetesRules.ts` → `evaluateDiabetesEligibility()`  
Test file: `src/features/eligibility/domain/diabetesRules.test.ts`

### DM-MISSING — Complete four-field gate

- **Inputs:** `diagnosisE08ToE13`, `visitsWithin90DaysAtLeastTwo`, `primaryDiagnosis`, `closedWithinPastYear`.
- **Actual expression:** collect explicit failures and unknown fields independently; any explicit failure returns `not-eligible`, otherwise any unknown returns `insufficient-data`.
- **Eligible:** not decided by this rule.
- **Not eligible:** any explicit failure, even when another field is unknown.
- **Insufficient:** one or more unknown fields only when no explicit failure exists.
- **Refer:** none.
- **Tests:** one case with `closedWithinPastYear === 'unknown'`.
- **TODO / uncertainty:** **yes** — README requires confirmation of real VPN field mappings for recent diagnosis and visit count.

### DM-DIAGNOSIS — E08–E13 diagnosis

- **Inputs:** `diagnosisE08ToE13`.
- **Actual expression:** `no` appends a rejection reason; `yes` passes.
- **Threshold:** ICD-10-CM first three characters E08–E13, represented as a yes/no answer; code does not parse an ICD string.
- **Eligible condition contribution:** yes.
- **Not eligible:** no, after the missing-data gate passes.
- **Insufficient:** unknown.
- **Refer:** none.
- **Tests:** explicit no rejection.
- **TODO / uncertainty:** **yes** — VPN/administrative field mapping.

### DM-VISITS — Two visits within 90 days

- **Inputs:** `visitsWithin90DaysAtLeastTwo`.
- **Actual expression:** `no` appends a rejection reason; `yes` passes.
- **Threshold:** at least 2 same-facility DM visits within 90 days, represented as yes/no; code does not accept a numeric count or calculate dates.
- **Eligible condition contribution:** yes.
- **Not eligible:** no, after the missing-data gate passes.
- **Insufficient:** unknown.
- **Refer:** none.
- **Tests:** explicit no rejection.
- **TODO / uncertainty:** **yes** — exact VPN field mapping and operational definition.

### DM-PRIMARY — DM as primary diagnosis

- **Inputs:** `primaryDiagnosis`.
- **Actual expression:** `no` appends a rejection reason; `yes` passes.
- **Eligible condition contribution:** yes.
- **Not eligible:** no, after the missing-data gate passes.
- **Insufficient:** unknown.
- **Refer:** none.
- **Tests:** explicit no rejection.
- **TODO / uncertainty:** included in the broader administrative-conditions TODO.

### DM-RECENT-CLOSURE — One-year re-enrollment exclusion

- **Inputs:** `closedWithinPastYear`.
- **Actual expression:** `yes` appends a rejection reason; `no` passes.
- **Boundary:** Boolean answer for closure within the past year; code does not calculate an anniversary date.
- **Eligible condition contribution:** no recent closure.
- **Not eligible:** yes, after the missing-data gate passes.
- **Insufficient:** unknown.
- **Refer:** none.
- **Tests:** yes rejection and unknown state.
- **TODO / uncertainty:** **yes** — exact administrative definition/exception handling is not encoded.

### DM-FINAL — Final DM result and VPN text

- **Inputs:** four DM answers and optional `vpnConfirmed`.
- **Actual expression:** any accumulated rejection reason → `not-eligible`; if there is no rejection but unknown data remains → `insufficient-data`; otherwise `eligible`. VPN only changes explanatory wording.
- **Eligible:** diagnosis yes, visits yes, primary diagnosis yes, recent closure no.
- **Not eligible:** any explicit failed condition; known failure takes precedence over unknown data.
- **Insufficient:** one or more unknown answers and no explicit failure.
- **Refer:** none.
- **Tests:** full eligible; one unknown; each individual failure; diagnosis no + visits unknown; and VPN wording paths.
- **TODO / uncertainty:** **yes** — VPN mapping and administrative conditions.

## 4. Early CKD program eligibility and staging

Source functions: `src/features/eligibility/domain/ckdRules.ts` → `getCkdStage()`, `evaluateCkdEligibility()`  
Test file: `src/features/eligibility/domain/ckdRules.test.ts`

### CKD-STAGE — eGFR stage classification

- **Inputs:** `egfr`.
- **Actual expression:** a valid finite non-negative value is staged as `>=90` G1; `>=60` G2; `>=45` G3a; `>=30` G3b; `>=15` G4; otherwise G5. Missing or invalid values return null.
- **Boundaries:** `90`, `60`, `45`, `30`, `15` mL/min/1.73m².
- **Eligible stage range:** stage alone can support Early CKD only for G1, G2, or G3a; urine/admin rules still apply.
- **Not eligible:** no direct status from staging alone.
- **Insufficient:** missing, negative, `NaN`, infinite, or non-numeric runtime eGFR.
- **Refer:** eGFR below 45 is handled by PRE-ESRD-EGFR.
- **Tests:** both sides of `90`, `60`, `45`, `30`, and `15`, including direct G4/G5 boundary coverage and invalid values.
- **TODO / uncertainty:** no explicit README TODO; general administrative-conditions TODO applies to enrollment, not staging.

### CKD-EGFR-MISSING — Required or invalid eGFR

- **Inputs:** `egfr`.
- **Actual expression:** domain validation accepts only finite, non-negative numeric eGFR; otherwise it returns `insufficient-data` before staging or referral evaluation.
- **Eligible / not eligible:** not evaluated without eGFR.
- **Insufficient:** eGFR missing or invalid.
- **Refer:** not evaluated without eGFR.
- **Tests:** direct null, negative, `NaN`, and positive-infinity assertions.
- **TODO / uncertainty:** none explicit.

### CKD-G1-G2-URINE — Proteinuria requirement

- **Inputs:** `stage`, `uacr`, `upcr`.
- **Actual expression:** for G1/G2 only: positive when either valid UACR is `>=30` or valid UPCR is `>=150`; otherwise one valid low value with the other missing is a known renal failure under the existing rule; no valid value is insufficient; any invalid unresolved value keeps the criterion insufficient unless the other value is already positive.
- **Thresholds:** UACR `>= 30 mg/g` or UPCR `>= 150 mg/g`.
- **Eligible condition contribution:** either threshold met.
- **Not eligible:** at least one valid urine value is below its threshold, the other is missing or also valid and below threshold, and neither value is invalid; this known renal failure takes precedence over administrative unknowns.
- **Insufficient:** no valid urine value, or an invalid urine value remains unresolved and the other value is not positive; administrative unknowns apply only when no renal/admin failure exists.
- **Refer:** UPCR `>=1000` is intercepted earlier by PRE-ESRD-UPCR.
- **Tests:** missing urine at eGFR 75; UACR `29.9/30`; UPCR `149.9/150`; invalid urine alone and invalid + valid-low combinations.
- **TODO / uncertainty:** no explicit threshold TODO. Evaluation precedence should be clinically reviewed with the overall administrative flow.

### CKD-G3A — G3a renal criterion

- **Inputs:** `egfr`/derived stage.
- **Actual expression:** G3a bypasses the G1/G2 UACR/UPCR block; renal status remains eligible.
- **Threshold:** `45 <= eGFR < 60`.
- **Eligible condition contribution:** G3a renal criterion is met without urine threshold.
- **Not eligible:** not from urine values in G3a.
- **Insufficient:** administrative unknowns still apply.
- **Refer:** no, unless UPCR supplied and `>=1000` (the UI does not normally show urine fields for G3a, but the domain input can contain one).
- **Tests:** eGFR 52 eligible with administrative yes/yes; stage boundaries.
- **TODO / uncertainty:** none explicit.

### CKD-ADMIN — Facility visit and primary diagnosis

- **Inputs:** `recentVisit`, `primaryDiagnosis`.
- **Actual expression:** administrative `no` values are collected as known failures and `unknown` values as missing data. Known failures return `not-eligible` before missing-data evaluation.
- **Eligible condition contribution:** recent visit yes and CKD primary diagnosis yes.
- **Not eligible:** either answer no, even when the other administrative answer is unknown; a known G1/G2 renal failure also takes precedence over administrative unknowns.
- **Insufficient:** an administrative answer is unknown only when no renal or administrative failure is already decisive.
- **Refer:** none.
- **Tests:** yes/yes, recent-visit no + primary unknown, and G2 renal failure + administrative unknown.
- **TODO / uncertainty:** **yes** — README administrative-conditions TODO.

### CKD-FINAL — Final Early CKD result and VPN text

- **Inputs:** all CKD fields plus optional `vpnConfirmed`.
- **Actual expression precedence:** invalid/missing eGFR → insufficient; Pre-ESRD condition → refer with advisory; otherwise collect renal/admin failures and missing data independently; any failure → not eligible; otherwise missing data → insufficient; else eligible.
- **Eligible:** G1/G2 with proteinuria threshold or G3a, plus recent visit yes and primary diagnosis yes.
- **Not eligible:** G1/G2 urine threshold fails or either administrative answer no; known failure takes precedence over unrelated unknown data.
- **Insufficient:** eGFR null; required urine data absent; or admin unknown.
- **Refer:** Pre-ESRD rule fires before other CKD eligibility evaluation.
- **Tests:** all stage boundaries including G4/G5, proteinuria/referral boundaries, known-failure combinations, invalid numeric values, advisory creation, and VPN wording.
- **TODO / uncertainty:** **yes** — administrative conditions and VPN conflict checking.

## 5. Pre-ESRD reminder

Source function: `src/features/eligibility/domain/ckdRules.ts` → `evaluateCkdEligibility()`  
Test file: `src/features/eligibility/domain/ckdRules.test.ts`

### PRE-ESRD-EGFR — Low eGFR referral

- **Inputs:** `egfr`.
- **Actual expression:** `egfr < 45`.
- **Threshold:** strictly below 45; `45` is G3a, `44.9` refers.
- **Eligible / not eligible:** not returned when this condition is true.
- **Insufficient:** only if eGFR is null, evaluated earlier.
- **Refer:** returns `refer` immediately with Pre-ESRD reason.
- **Tests:** eGFR `45/44.9` through staging/referral assertions.
- **Advisory:** also returns `{ code: 'PRE_ESRD', severity: 'important', message: 'CKD：建議評估 Pre-ESRD' }`.
- **TODO / uncertainty:** no explicit README TODO. CKD may still use `refer`, but the advisory is now structurally separate and preserved downstream.

### PRE-ESRD-UPCR — High UPCR referral

- **Inputs:** `upcr` and non-null `egfr`.
- **Actual expression:** `upcr !== null && upcr >= 1000`.
- **Threshold:** UPCR `>= 1000 mg/g`; `999.9` does not refer, `1000` refers.
- **Eligible / not eligible:** not returned when this condition is true.
- **Insufficient:** not applicable once the threshold is supplied.
- **Refer:** returns `refer` immediately, before urine/admin eligibility checks.
- **Tests:** `999.9/1000` at eGFR 75.
- **TODO / uncertainty:** no explicit README TODO; threshold/source should remain part of clinical sign-off.

## 6. DKD derivation

Source function: `src/features/eligibility/domain/dkdRules.ts` → `evaluateDkdEligibility()`  
Test file: `src/features/eligibility/domain/dkdRules.test.ts`

### DKD-DERIVE — Status derived from DM and CKD

- **Inputs:** final DM and CKD `EligibilityResult` objects; there is no manual DKD input.
- **Actual expression and precedence:**
  1. Either status `not-eligible` → DKD `not-eligible`.
  2. Else either status `refer` → DKD `refer`.
  3. Else either status `insufficient-data` → DKD `insufficient-data`.
  4. Else → DKD `eligible`.
- **Threshold:** none beyond the upstream DM/CKD rules.
- **Eligible:** DM eligible **and** CKD eligible.
- **Not eligible:** either upstream result not eligible; this takes precedence over the other result being refer or insufficient.
- **Insufficient:** no upstream not-eligible/refer and at least one upstream result insufficient.
- **Refer:** no upstream not-eligible and at least one upstream result refer.
- **Advisory propagation:** upstream advisories are merged by advisory code and retained regardless of DKD status precedence.
- **Tests:** eligible, insufficient, refer combinations, advisory propagation, and DM not-eligible + CKD refer with PRE_ESRD preserved.
- **Untested combinations:** none of the precedence combinations requested for Phase 1.3 remain untested.
- **TODO / uncertainty:** inherits all DM/CKD administrative and VPN uncertainties. DKD itself has no separate explicit README TODO.

## 7. Chronic prescription dates

Source functions: `src/features/prescription/domain/prescriptionRules.ts` → `calculateInitialSchedule()`, `calculateActualDispense()`  
Test file: `src/features/prescription/domain/prescriptionRules.test.ts`

### RX-INTERVAL — Fixed interval

- **Inputs:** none; constant `DISPENSE_INTERVAL_DAYS`.
- **Actual expression:** `DISPENSE_INTERVAL_DAYS = 28`.
- **Threshold / boundary:** exactly 28 calendar days; not user-configurable.
- **Eligibility statuses:** not applicable.
- **Tests:** all prescription cases depend on 28 days.
- **TODO / uncertainty:** no explicit README TODO.

### RX-INITIAL — Initial three-date schedule

- **Inputs:** `firstDate`.
- **Actual expression:** first = `startOfDay(firstDate)`; second = `addDays(first, 28)`; third = `addDays(first, 56)`.
- **Threshold / boundary:** local calendar day, normalized to start of day.
- **Eligible/not eligible/insufficient/refer:** not applicable.
- **Tests:** 2026-05-25 → 2026-06-22 → 2026-07-20; month end; leap year; year boundary.
- **TODO / uncertainty:** no explicit README TODO. Test suite does not run under multiple OS time zones or explicitly cross a DST boundary.

### RX-STATUS — Early/on-time/late classification

- **Inputs:** `scheduledDate`, `actualDate`.
- **Actual expression:** both normalized with `startOfDay`; signed difference = `differenceInCalendarDays(actual, scheduled)`; `<0` early, `>0` late, `0` on-time; displayed `differenceDays = abs(signedDifference)`.
- **Boundary:** exact same local calendar day is on-time.
- **Eligibility statuses:** not applicable.
- **Tests:** early 2 days, on-time, late 3 days.
- **TODO / uncertainty:** no explicit README TODO.

### RX-NEXT-EARLY — Next date after early dispensing

- **Inputs:** scheduled date, actual date, derived status.
- **Actual expression:** when early, `addDays(scheduled, 28)`.
- **Boundary:** actual date before scheduled date.
- **Tests:** scheduled 2026-06-22, actual 2026-06-20 → next 2026-07-20.
- **TODO / uncertainty:** no explicit README TODO.

### RX-NEXT-ONTIME — Next date after on-time dispensing

- **Inputs:** scheduled date, actual date, derived status.
- **Actual expression:** when on-time, `addDays(scheduled, 28)`.
- **Boundary:** actual and scheduled local dates equal.
- **Tests:** 2026-06-22 → next 2026-07-20.
- **TODO / uncertainty:** no explicit README TODO.

### RX-NEXT-LATE — Next date after late dispensing

- **Inputs:** scheduled date, actual date, derived status.
- **Actual expression:** when late, `addDays(actual, 28)`.
- **Boundary:** actual date after scheduled date.
- **Tests:** scheduled 2026-06-22, actual 2026-06-25 → next 2026-07-23.
- **TODO / uncertainty:** no explicit README TODO.

## Phase 1.3 audit disposition

1. VPN confirmation remains informational only; unchecked and manually checked states do not alter clinical eligibility thresholds.
2. Metabolic BP now accepts decisive partial positive evidence while retaining `130/85` unchanged.
3. DM, Early CKD, and metabolic program now apply known-failure-before-unknown precedence.
4. Pre-ESRD remains compatible with CKD `refer` but is also a structured advisory preserved by DKD.
5. DKD `not-eligible` still has precedence over `refer`, while advisories are no longer discarded.
6. Domain numeric validation rejects negative, `NaN`, infinite, and non-numeric runtime values as invalid data. No new upper clinical threshold was introduced.
7. Finite non-negative values remain domain-valid; existing UI upper-value warnings are not clinical engine exclusions.
8. Phase 1.3 expanded the suite beyond the original 59 tests to cover requested precedence, medication, staging, invalid-data, advisory, and VPN wording paths.

The following TODOs remain unresolved and were not inferred or removed: HDL-related medication definition; DM VPN field mapping; complete administrative exclusions for all programs.
