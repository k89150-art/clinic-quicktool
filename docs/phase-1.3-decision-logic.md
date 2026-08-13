# Phase 1.3 — Decision Logic Hardening

Date: 2026-08-13

Scope: decision precedence, tri-state evaluation, domain numeric validation, advisory/status separation, and VPN wording. This phase did not add a program, clinical threshold, backend, database, login, patient data, AI, OCR, or HIS/VPN integration.

## Design principles now enforced

1. **Decisive evidence is evaluated before unresolved data.** A known required-condition failure returns `not-eligible`; `insufficient-data` is used only when no known failure exists and unresolved data could still change the answer.
2. **Positive OR evidence does not require unrelated missing data.** For metabolic BP, either available abnormal measurement is sufficient to mark the factor positive.
3. **Invalid is not negative.** Negative, `NaN`, infinite, non-number, and unparseable runtime values are invalid data and cannot satisfy a “below threshold therefore negative” branch.
4. **Advisory is not eligibility.** Important clinical notices are carried separately from the eligibility status and survive downstream status precedence.
5. **VPN confirmation is manual context.** It does not change clinical thresholds or imply that the application queried VPN.

## Logic corrections

### Metabolic blood-pressure tri-state

Before:

- If either SBP or DBP was missing, the factor was `unknown`, even when the available value was already abnormal.

After:

- Medication true → `positive`.
- Valid SBP `>=130` → `positive`, regardless of DBP availability.
- Valid DBP `>=85` → `positive`, regardless of SBP availability.
- Both valid and below threshold → `negative`.
- No positive evidence plus missing/invalid required measurement → `unknown`.

Examples:

| Input | Before | After |
|---|---|---|
| SBP 140, DBP null | unknown | positive |
| SBP null, DBP 90 | unknown | positive |
| SBP 120, DBP null | unknown | unknown |
| SBP null, DBP 70 | unknown | unknown |
| SBP 120, DBP 70 | negative | negative |

### Known-failure precedence

DM, Early CKD, and metabolic program now collect known failures and unknown fields separately.

| Scenario | Before | After |
|---|---|---|
| DM diagnosis no + visits unknown | insufficient-data | not-eligible |
| DM diagnosis yes + visits unknown, no failure | insufficient-data | insufficient-data |
| Metabolic age 70 + dialysis unknown | insufficient-data | not-eligible |
| Metabolic age null + dialysis yes | insufficient-data | not-eligible |
| CKD G2, UACR 10, UPCR 100, recent visit unknown | insufficient-data | not-eligible |
| CKD renal criteria met, recent visit no, primary diagnosis unknown | insufficient-data | not-eligible |

The existing G1/G2 behavior that one available valid urine measure can establish the proteinuria result when the other is missing was retained. An invalid companion value is different from a missing value: a valid-low + invalid combination remains `insufficient-data`, because the invalid value must not be interpreted as negative. No UACR/UPCR threshold changed.

## Domain numeric validation

Reusable validation is implemented in `src/features/eligibility/domain/clinicalInputValidation.ts` and is applied before clinical comparisons.

Covered inputs:

- age
- waist
- BMI
- fasting glucose
- SBP
- DBP
- TG
- HDL
- eGFR
- UACR
- UPCR

Validation states:

- `missing`: `null`, `undefined`, or empty runtime value.
- `invalid`: negative, `NaN`, positive/negative infinity, non-number, or unparseable value.
- `valid`: finite non-negative number.

Invalid data becomes an unresolved/invalid field and is never treated as a normal negative clinical criterion. Very high but finite non-negative values remain domain-valid; no new upper clinical threshold was created. Existing UI upper-value warnings remain presentation warnings only.

## Advisory architecture

`EligibilityResult` now includes:

```ts
interface ClinicalAdvisory {
  code: string;
  severity: 'info' | 'warning' | 'important';
  message: string;
}

interface EligibilityResult {
  status: EligibilityStatus;
  reasons: string[];
  missingFields: string[];
  advisories: ClinicalAdvisory[];
}
```

Pre-ESRD produces:

```ts
{
  code: 'PRE_ESRD',
  severity: 'important',
  message: 'CKD：建議評估 Pre-ESRD'
}
```

Early CKD may still return `refer`. DKD now receives complete DM/CKD results instead of status strings and merges advisories by code. Therefore DM `not-eligible` + CKD `refer` still yields DKD `not-eligible`, but PRE_ESRD remains available to DKD and the summary UI.

## VPN wording

Clinical status is unchanged by `vpnConfirmed`.

When not confirmed:

- `依目前輸入條件符合`
- `尚未確認 VPN／收案系統資格`

When manually confirmed:

- `依目前輸入條件符合`
- `VPN／收案系統資格已人工確認`

The UI explicitly states that the application is not directly connected to VPN.

## Thresholds unchanged

No confirmed numeric threshold changed. This includes:

- Metabolic waist: male 90 cm, female 80 cm.
- BMI: 27.
- Fasting glucose: 100 mg/dL.
- BP: SBP 130 mmHg or DBP 85 mmHg.
- TG: 150 mg/dL.
- HDL: male 40 mg/dL, female 50 mg/dL.
- Metabolic program age: 20–64.
- DM: 90 days and at least two visits.
- CKD staging boundaries: 90, 60, 45, 30, and 15 mL/min/1.73m².
- UACR: 30 mg/g.
- UPCR: 150 mg/g.
- Pre-ESRD reminder: eGFR below 45 or UPCR at least 1000 mg/g.

## Regression coverage

The Phase 1.3 suite covers:

- partial BP inputs;
- all medication-positive paths;
- DM, CKD, and metabolic known-failure + unknown combinations;
- G4/G5 boundaries;
- negative, `NaN`, infinite, and non-number domain inputs;
- finite high values without invented upper thresholds;
- Pre-ESRD advisory creation and DKD preservation;
- DKD refer and not-eligible + refer combinations;
- unconfirmed and manually confirmed VPN wording;
- all pre-existing prescription/date and clinical tests.

## Clinical TODOs retained

The following remain exactly unresolved:

1. `TODO: requires clinical rule confirmation` — HDL-related medication definition.
2. `TODO: requires clinical rule confirmation` — DM 90-day diagnosis/visit VPN field mapping.
3. `TODO: requires clinical rule confirmation` — complete administrative exclusion conditions for all programs.

No TODO was inferred, guessed, or closed in Phase 1.3.
