# Phase 1.4 — Prescription Workflow Refactor

Date: 2026-08-13

Scope: chronic prescription workflow, date calculation, and related Desktop/Mobile UX only. No eligibility rule, clinical threshold, VPN wording, clinical TODO, backend, database, login, AI, OCR, or Phase 2 work was changed.

## Workflow

All modes use a fixed 28-day dispense interval. The new-prescription and second-dispense modes begin with `最後一次看診／開慢箋日期`; the third-dispense mode begins with the actual third dispense date.

### New prescription

- Default last-visit date: today.
- Scheduled second dispense: D0 + 28 days.
- Scheduled third dispense: D0 + 56 days.
- Follow-up: D0 + 84 days.
- Lab: follow-up − 7 days.

The lab and follow-up dates are the primary results. The three dispense dates are secondary context.

### Second dispense

Inputs: last visit D0 and actual second dispense A2. The original scheduled second dispense S2 is derived as D0 + 28 and is never requested from the user.

- A2 < S2: early; keep S3 at S2 + 28.
- A2 = S2: on time; keep S3 at S2 + 28.
- A2 > S2: late; move S3 to A2 + 28.
- Follow-up: S3 + 28.
- Lab: follow-up − 7.

### Third dispense

Required input: actual third dispense A3. It defaults to today, so selecting the third-dispense mode immediately produces the result.

- Follow-up: A3 + 28 days, regardless of the original schedule.
- Lab: follow-up − 7 days.
- Last visit D0 is optional and never blocks this calculation.
- When D0 is present, the UI may show the original reference dates D0 + 28, D0 + 56, and D0 + 84 and compare A3 with the original third date.
- The comparison is worded as `相較最後一次看診日起算之原始第3次排程：早／晚 N 天`; it is not presented as a clinical judgment that the third dispense itself was delayed.
- The workflow does not ask whether the second dispense was delayed and does not request the actual second dispense date.

## Rule engine

Pure functions are in `src/features/prescription/domain/prescriptionWorkflowRules.ts`:

- `calculateInitialPrescriptionPlan()`
- `calculateSecondDispensePlan()`
- `calculateThirdDispensePlan()`

Constants:

- `DISPENSE_INTERVAL_DAYS = 28` remains unchanged.
- `LAB_BEFORE_VISIT_DAYS = 7` centralizes the lab offset.

Every required date is normalized to a local calendar day. Missing or invalid `Date` values return `null`; they never enter `date-fns` calculations or formatters.

## UX changes

Before:

- The page centered on three dispense cards.
- Second and third actual-dispense calculations were separate expandable panels.
- Third dispense could not account for a delayed second dispense.

After:

- Three large modes: new, second dispense, and third dispense.
- Only inputs required for the selected mode are shown.
- Users never enter an original second/third scheduled date.
- Third dispense has one required input, defaults it to today, and gives the answer in one mode-selection click.
- Its optional last-visit field is visually secondary and supplies reference context only.
- Lab and follow-up appear first in large side-by-side cards.
- Mobile dispense modes also keep a compact lab/follow-up summary above the safe area for longer forms; the new-prescription mode already shows both primary cards in the first viewport. The compact summary hides while a virtual keyboard/input is active.
- Detailed scheduled/actual dates and early/on-time/late context appear below.
- Controls are at least 48–56 px high and remain usable at 360/390/430 px widths.

## Regression coverage

- New prescription reference scenario.
- Second dispense early, on-time, and late.
- Third dispense with only A3, with an explicit null D0, and with an optional D0 reference.
- Third dispense earlier/later than the original third schedule while preserving A3-based follow-up arithmetic.
- Month, year, and leap-year boundaries.
- Null and invalid dates.
- Cleared native date inputs, incomplete quick input, and invalid month/day input.
- Removal of all second-dispense-history fields from third mode, one-click default result, and primary result hierarchy.

## Unchanged areas

No file under `src/features/eligibility/domain/` was modified in Phase 1.4. The Phase 1.3 clinical TODOs remain unresolved and unchanged.
