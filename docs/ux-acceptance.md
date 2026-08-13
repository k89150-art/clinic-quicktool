# Phase 1.1 UX Acceptance Test

Test date: 2026-08-13  
Target: `https://k89150-art.github.io/clinic-quicktool/`  
Build under test: commit `38283e1`  
Viewports: Desktop `1366×768`; Mobile `390×844`

## Measurement convention

- **Click count** includes navigation cards, yes/no choices, expand buttons, checkboxes, and disclosure controls. It excludes field focus when the flow is performed with Tab/keyboard.
- **Keyboard input count** is the number of fields whose value is typed, not the number of characters or key presses.
- Counts start from the home page with a freshly reloaded React state.
- Prescription early/on-time/late flows below use the intended “病人今天來領藥” flow: actual date remains at its default of today, and the scheduled date is set through the quick MMDD field.
- “Scrolling” records whether a user must scroll to reach an input or read the resulting message, not the number of wheel/touch events.

## Summary

| Scenario | Result | Clicks | Keyboard inputs | Desktop 1366×768 | Mobile 390px |
|---|---:|---:|---:|---|---|
| Today, new prescription | Pass | 1 navigation; **0 additional after page entry** | 0 | All three dates visible without scrolling | Dates calculated immediately; second/third require downward scrolling to view |
| Early dispensing | Pass | 2 | 1 | Short scroll required to read expanded result | Downward scroll required; single-column/touch flow works |
| On-time dispensing | Pass | 2 | 1 | Short scroll required to read expanded result | Downward scroll required; single-column/touch flow works |
| Late dispensing | Pass | 2 | 1 | Short scroll required to read expanded result | Downward scroll required; single-column/touch flow works |
| Metabolic rapid input | Pass with UX note | 3 | 7 | Completes with vertical scrolling; sticky result remains available | Completes one-handed; long scroll, then return to top summary to review final result |
| DM rapid determination | Pass with UX note | 5 | 0 | Completes with vertical scrolling; sticky result visible | Completes one-handed; must return to top summary to review final result |
| CKD G1 | Pass | 3 | 2 | G1 + UACR 30 + admin yes/yes → eligible | Single-column controls work; scrolling and return to summary required |
| CKD G2 | Pass | 3 | 2 | G2 + UACR 45 + admin yes/yes → eligible | Stage/proteinuria text appears near input; final status is in top summary |
| CKD G3a | Pass | 3 | 1 | eGFR 52; UACR/UPCR hidden; admin yes/yes → eligible | Same behavior; scrolling and return to summary required |
| DKD automatic derivation | Pass with UX note | 7 | 1 | DM eligible + CKD G3a eligible → DKD eligible, no manual DKD control | Derives correctly; final summary is off-screen after completing bottom fields |
| Insufficient-data | Pass | 1 | 0 | Four result cards show data insufficient above the fold | Four data-insufficient rows visible in top summary |
| Pre-ESRD reminder | Partial | 1 | 1 | Refer status visible; exact Pre-ESRD reason requires one extra “為什麼？” click | Refer status visible, but exact “Pre-ESRD” reason is not available in mobile summary |
| VPN not confirmed | Desktop pass / Mobile fail | DM example: 5 | 0 | Explicit `尚未確認系統收案資格` warning visible | Eligible status appears, but pending VPN warning/reason is not rendered in mobile summary |

Add one click to any qualifying enrollment flow when the user checks `已確認相關 VPN／收案系統資格`.

## Detailed results

### UX-RX-01 — Today, new prescription

- Entered the prescription page from a clean home page.
- With no date input or calculate button, the production UI immediately displayed:
  - first: `2026/08/13`
  - second: `2026/09/10`
  - third: `2026/10/08`
- Desktop: all three cards fit in the initial 1366×768 viewport.
- Mobile: first card fits; second and third are present in the DOM immediately but begin below the initial viewport.
- Result: **pass** for zero additional operations; mobile requires visual scrolling, not calculation input.

### UX-RX-02 — Early dispensing

- Controlled flow: first date `08/01`; second scheduled date `08/29`; actual date defaults to today `08/13`.
- Immediate result: `提前 16 天領藥`; next date `09/26`.
- Clicks: home navigation + second-dispense expansion = 2.
- Keyboard inputs: quick MMDD field = 1.
- Result: **pass**.

### UX-RX-03 — On-time dispensing

- Controlled flow: first date `07/16`; second scheduled and actual date both `08/13`.
- Immediate result: `準時領藥`; next date `09/10`.
- Result: **pass**.

### UX-RX-04 — Late dispensing

- Controlled flow: first date `07/01`; second scheduled date `07/29`; actual date defaults to `08/13`.
- Immediate result: `延後 15 天領藥`; next date `09/10`.
- Result: **pass**.

### UX-RX-05 — Date-input robustness finding

- Clearing or sending an incomplete keyboard value to the native actual-date field can call `fromDateValue('')`, create an invalid `Date`, and cause a React white screen with `RangeError: Invalid time value`.
- The quick MMDD input and untouched default-today flow worked.
- This is an observed Phase 1 defect. **No code was changed in Phase 1.1.**

### UX-MET-01 — Metabolic rapid input

- Inputs: age 40, male, waist 94, SBP/DBP 136/82, fasting glucose 105, TG 120, HDL 45, dialysis no.
- Output: `3/5`, metabolic syndrome eligible, program eligible under current inputs, VPN pending text in the detailed program panel.
- Clicks: navigation, male, dialysis no = 3.
- Keyboard inputs: age, waist, SBP, DBP, AC, TG, HDL = 7.
- Desktop auto-scroll position reached approximately 762 px; right result dock remained sticky.
- Mobile auto-scroll position reached approximately 1482 px; the static top summary was no longer visible after completing the lower fields.
- Result: **pass**, with mobile result-location UX note.

### UX-DM-01 — DM rapid determination

- Inputs: E08–E13 yes; visits >=2 yes; DM primary diagnosis yes; closure within one year no.
- Output: DM eligible.
- Clicks: navigation + four choices = 5; no numeric keyboard input.
- Desktop: result dock showed eligible and the VPN-pending warning.
- Mobile: eligible appears in the top summary, but the VPN-pending message is not rendered.
- Result: **rule/status pass**; **mobile VPN communication fail**.

### UX-CKD-01 — G1

- Inputs: eGFR 90, UACR 30, recent visit yes, CKD primary diagnosis yes.
- Output: G1, proteinuria condition met, CKD eligible.
- Result: **pass**.

### UX-CKD-02 — G2

- Inputs: eGFR 75, UACR 45, recent visit yes, CKD primary diagnosis yes.
- Output: G2, proteinuria condition met, CKD eligible.
- Mobile stage/proteinuria feedback is adjacent to the CKD inputs; the top final summary is off-screen after completion.
- Result: **pass**.

### UX-CKD-03 — G3a

- Inputs: eGFR 52, recent visit yes, CKD primary diagnosis yes.
- Output: G3a, no UACR/UPCR fields, CKD eligible.
- Result: **pass**.

### UX-DKD-01 — Automatic derivation

- DM eligible inputs plus CKD G3a eligible inputs produced DKD eligible.
- No manual DKD yes/no control exists.
- Desktop right result remains visible while filling lower sections.
- Mobile user must scroll back from the lower CKD section to the top summary to see DKD final status.
- Result: **pass**, with mobile result-location UX note.

### UX-STATE-01 — Insufficient data

- Clean eligibility page shows metabolic, DM, CKD, and DKD as data insufficient.
- Desktop: four statuses visible in the initial right dock.
- Mobile: four statuses visible in the initial top summary.
- Result: **pass**.

### UX-REFER-01 — Pre-ESRD

- Input: eGFR 44.9.
- Output engine/UI status: G3b and refer.
- Desktop: exact reason `建議評估 Pre-ESRD 照護方案` appears only after expanding CKD `為什麼？`.
- Mobile: full result card is hidden; the summary says only `評估轉介／其他方案`, so the Pre-ESRD-specific text cannot be read.
- Result: **partial**. Engine result is correct; mobile communication does not satisfy an explicit Pre-ESRD reminder.

### UX-VPN-01 — VPN not confirmed

- With DM eligible and VPN unchecked, desktop displays `尚未確認系統收案資格`.
- At 390 px, `.results-dock` is hidden and `.mobile-summary` does not include the warning or the result reason.
- Result: **desktop pass; mobile fail**.

## Responsive and one-hand review

- Desktop measurement: viewport 1366; document scroll width 1351 — no horizontal overflow.
- Mobile measurement: viewport 390; document scroll width 375 — no horizontal overflow.
- Visible choice/button minimum measured touch height: 44 px.
- Mobile layout is single-column and can be operated one-handed at the control level.
- Mobile rapid completion is weakened by the long eligibility form and static top result summary: after completing DM/CKD/DKD inputs, the user must scroll back to the top for the combined result.
- No threshold, rule, or UI code was modified as part of this finding.

## Screenshot inventory

- `docs/screenshots/desktop-home.png`
- `docs/screenshots/desktop-prescription.png`
- `docs/screenshots/desktop-eligibility.png`
- `docs/screenshots/mobile-home.png`
- `docs/screenshots/mobile-prescription.png`
- `docs/screenshots/mobile-eligibility.png`
