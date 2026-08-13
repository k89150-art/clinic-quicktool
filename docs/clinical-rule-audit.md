# Phase 1.1 Clinical Rule Audit

Audit date: 2026-08-13  
Audited commit: `38283e1` (`Build Clinic QuickTool Phase 1`)  
Scope: the rules actually executed by the Phase 1 client-side application. This document describes existing behavior only; it does not approve, reinterpret, or change any clinical rule.

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
- **Actual expression:** medication true → positive; else if either `sbp === null || dbp === null` → unknown; else `sbp >= 130 || dbp >= 85` → positive, otherwise negative.
- **Thresholds:** SBP `>= 130 mmHg` or DBP `>= 85 mmHg`.
- **Positive:** medication true, or either threshold met when both measurements are present.
- **Negative:** both measurements present, both below threshold, medication false.
- **Insufficient:** either SBP or DBP missing and medication false, even if the other present value already exceeds its threshold.
- **Refer:** none.
- **Tests:** SBP `129/130`; DBP `84/85`.
- **TODO / uncertainty:** no explicit README TODO. Audit observation: partial BP input is always unknown under the present expression.

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
- **Actual expression:** missing age, `dialysis === 'unknown'`, or syndrome `insufficient-data` are collected; any missing item returns `insufficient-data` immediately.
- **Eligible:** not decided by this rule.
- **Not eligible:** not decided by this rule.
- **Insufficient:** at least one required item is missing/unknown.
- **Refer:** none.
- **Tests:** aggregation unknown behavior is tested; there is no direct program test for missing age or dialysis unknown.
- **TODO / uncertainty:** no explicit README TODO. Evaluation precedence means missing data wins before a known age exclusion or dialysis exclusion.

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
- **Not eligible:** age exclusion, dialysis yes, or syndrome not eligible, subject to missing-data precedence.
- **Insufficient:** any missing-data gate.
- **Refer:** none.
- **VPN behavior:** unchecked still returns `eligible` with “尚未確認 VPN／收案系統資格”; checked returns `eligible` with confirmed wording.
- **Tests:** age and dialysis; VPN wording/status is not unit-tested.
- **TODO / uncertainty:** **yes** — README administrative exclusions TODO; application cannot verify external VPN conflicts.

## 3. DM program eligibility

Source function: `src/features/eligibility/domain/diabetesRules.ts` → `evaluateDiabetesEligibility()`  
Test file: `src/features/eligibility/domain/diabetesRules.test.ts`

### DM-MISSING — Complete four-field gate

- **Inputs:** `diagnosisE08ToE13`, `visitsWithin90DaysAtLeastTwo`, `primaryDiagnosis`, `closedWithinPastYear`.
- **Actual expression:** if **any** field is `unknown`, return `insufficient-data` immediately with all unknown fields listed.
- **Eligible:** not decided by this rule.
- **Not eligible:** not evaluated until no field is unknown.
- **Insufficient:** any of four fields is unknown.
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
- **Actual expression:** with no unknowns, any accumulated rejection reason → `not-eligible`; otherwise `eligible`. VPN only changes the reason string.
- **Eligible:** diagnosis yes, visits yes, primary diagnosis yes, recent closure no.
- **Not eligible:** any explicit failed condition, provided no condition is unknown.
- **Insufficient:** any unknown takes precedence, even if another answer is already an explicit failure.
- **Refer:** none.
- **Tests:** full eligible; one unknown; each individual failure.
- **TODO / uncertainty:** **yes** — VPN mapping and administrative conditions.

## 4. Early CKD program eligibility and staging

Source functions: `src/features/eligibility/domain/ckdRules.ts` → `getCkdStage()`, `evaluateCkdEligibility()`  
Test file: `src/features/eligibility/domain/ckdRules.test.ts`

### CKD-STAGE — eGFR stage classification

- **Inputs:** `egfr`.
- **Actual expression:** null → null; `>=90` G1; `>=60` G2; `>=45` G3a; `>=30` G3b; `>=15` G4; otherwise G5.
- **Boundaries:** `90`, `60`, `45`, `30`, `15` mL/min/1.73m².
- **Eligible stage range:** stage alone can support Early CKD only for G1, G2, or G3a; urine/admin rules still apply.
- **Not eligible:** no direct status from staging alone.
- **Insufficient:** null eGFR.
- **Refer:** eGFR below 45 is handled by PRE-ESRD-EGFR.
- **Tests:** `90`, `89.9`, `60`, `59.9`, `45`, `44.9`. G4/G5 boundaries are not directly tested.
- **TODO / uncertainty:** no explicit README TODO; general administrative-conditions TODO applies to enrollment, not staging.

### CKD-EGFR-MISSING — Required eGFR

- **Inputs:** `egfr`.
- **Actual expression:** `egfr === null` → `insufficient-data` immediately.
- **Eligible / not eligible:** not evaluated without eGFR.
- **Insufficient:** eGFR null.
- **Refer:** not evaluated without eGFR.
- **Tests:** indirectly through UI/default behavior; no direct unit-test assertion for null eGFR.
- **TODO / uncertainty:** none explicit.

### CKD-G1-G2-URINE — Proteinuria requirement

- **Inputs:** `stage`, `uacr`, `upcr`.
- **Actual expression:** for G1/G2 only: both null → insufficient; else positive when `(uacr ?? -1) >= 30 || (upcr ?? -1) >= 150`; otherwise not eligible.
- **Thresholds:** UACR `>= 30 mg/g` or UPCR `>= 150 mg/g`.
- **Eligible condition contribution:** either threshold met.
- **Not eligible:** at least one urine value supplied but neither threshold met, after missing administrative inputs are resolved.
- **Insufficient:** both urine values null. Also, later administrative unknowns can make the final result insufficient even when supplied urine values are below threshold.
- **Refer:** UPCR `>=1000` is intercepted earlier by PRE-ESRD-UPCR.
- **Tests:** missing urine at eGFR 75; UACR `29.9/30`; UPCR `149.9/150`.
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
- **Actual expression:** either unknown is added to missing fields; any missing field returns `insufficient-data`. Once none are unknown, either `no` returns `not-eligible`; both `yes` pass.
- **Eligible condition contribution:** recent visit yes and CKD primary diagnosis yes.
- **Not eligible:** either answer no, provided neither is unknown and prior urine requirements are not missing.
- **Insufficient:** either answer unknown. This takes precedence over known administrative “no” and over G1/G2 sub-threshold urine status.
- **Refer:** none.
- **Tests:** base cases use yes/yes; no direct tests for each administrative failure or unknown combination.
- **TODO / uncertainty:** **yes** — README administrative-conditions TODO.

### CKD-FINAL — Final Early CKD result and VPN text

- **Inputs:** all CKD fields plus optional `vpnConfirmed`.
- **Actual expression precedence:** eGFR missing → insufficient; Pre-ESRD condition → refer; urine/admin missing → insufficient; urine failure → not eligible; admin failure → not eligible; else eligible. VPN only changes reason text.
- **Eligible:** G1/G2 with proteinuria threshold or G3a, plus recent visit yes and primary diagnosis yes.
- **Not eligible:** G1/G2 urine threshold fails or either administrative answer no, subject to missing-data precedence.
- **Insufficient:** eGFR null; required urine data absent; or admin unknown.
- **Refer:** Pre-ESRD rule fires before other CKD eligibility evaluation.
- **Tests:** major stage/proteinuria/referral boundaries; VPN wording/status is not tested.
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
- **TODO / uncertainty:** no explicit README TODO. The reminder acts as the entire CKD result rather than a secondary advisory.

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

- **Inputs:** final `dmStatus`, final `ckdStatus`; there is no manual DKD input.
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
- **Tests:** eligible+eligible; not-eligible+eligible; eligible+insufficient.
- **Untested combinations:** refer combinations and mixed-precedence pairs such as DM not-eligible + CKD refer.
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

## Audit findings requiring owner review (no rule changes made)

1. VPN confirmation is informational only in every current engine; unchecked status remains `eligible`.
2. Metabolic blood pressure is `unknown` whenever either SBP or DBP is missing, even if the present value already exceeds threshold.
3. DM missing-data evaluation precedes rejection evaluation; one unknown plus one known failure returns `insufficient-data`.
4. CKD missing administrative data precedes G1/G2 proteinuria failure and known administrative failure.
5. Pre-ESRD returns the primary `refer` status, not a secondary warning alongside a separate Early CKD result.
6. DKD `not-eligible` has precedence over `refer` when its two upstream statuses conflict.
7. Domain functions do not reject negative or physiologically implausible numeric values; UI displays an abnormal-value warning but still passes the value to the engine.
8. The existing 59 tests cover specified primary boundaries but do not cover all precedence combinations, medication flags, VPN wording, or administrative unknown/no combinations.

These are observations of the current implementation, not proposed corrections.
