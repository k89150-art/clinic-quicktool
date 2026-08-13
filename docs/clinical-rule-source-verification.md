# Clinical Rule Source Verification — Phase 1.2

Verification date: 2026-08-13

Scope: the three unresolved items recorded in `README.md` and `docs/clinical-rule-todo.md`

Rule-change status: **no clinical rule or threshold was changed during this verification**

## Source policy

Only official government sources were accepted as rule evidence. The main current sources reviewed were:

- [National Health Administration — Metabolic syndrome topic and current official resources](https://www.hpa.gov.tw/221/s), including the linked 2026 program excerpt, 2026 care manual, 2026-07-08 VPN guide, and FAQ dated 115-01-20.
- [National Health Insurance Administration — Payment Standards, Part 8 Chapter 2](https://www.nhi.gov.tw/ch/cp-14177-adf81-3576-1.html), current PDF effective 115-04-01 and page updated 115-04-29.
- [NHI Payment Standards PDF effective 115-04-01](https://www.nhi.gov.tw/ch/dl-65879-e1d3294beea24125ac05b832243bd9f3-1.pdf).
- [NHI diabetes quality-payment data description](https://www.nhi.gov.tw/ch/dl-74560-89c54c3a359942aca940a52437346108-1.pdf), data year 112, extracted 2024-09-09.
- [NHI plan Q&A index](https://www.nhi.gov.tw/ch/cp-14178-779da-3577-1.html), including DKD FAQ updated 112-12-28 and Early CKD FAQ updated 113-12-10.

Blogs, clinic websites, SEO articles, unsourced summaries, and AI-generated answers were not used as final evidence.

## TODO-CLINICAL-001 — HDL-related medication definition

- **Question:** Which medication classes, products, indications, or treatment states formally satisfy the HDL “related medication treatment” alternative in the metabolic-syndrome factor?
- **Current implementation:** `hdlMedication === true` makes the HDL factor positive without a numeric HDL result. The UI describes this only as current medication use; the application has no medication list or indication check.
- **Official source:** The current [NHA metabolic-syndrome page](https://www.hpa.gov.tw/221/s) confirms the numeric HDL thresholds (male `<40 mg/dL`, female `<50 mg/dL`) and links the current 2026 program materials. The reviewed official material index does **not** provide a sufficiently explicit, authoritative drug/class list that can be mapped safely to the boolean field.
- **Source date/version:** NHA resource page updated 2026-04-02; linked VPN guide updated 2026-07-08; linked care manual is the 2026 edition.
- **Exact relevant requirement (summary):** The official public page defines low HDL by sex-specific laboratory values. It does not, on the evidence available here, define whether any lipid-lowering therapy qualifies, whether therapy must target low HDL specifically, or which ATC/product classes qualify.
- **Confidence:** **High** that the numeric threshold is supported; **low/insufficient** for a medication definition.
- **Recommended action:** Keep the current behavior unchanged until a clinical owner verifies the exact clause in the applicable program attachment or obtains a written NHA interpretation. Do not add a medication list based on general dyslipidemia treatment guidance.
- **Disposition:** **TODO: requires clinical rule confirmation**

## TODO-CLINICAL-002 — DM 90-day diagnosis/visit-count VPN mapping

- **Question:** What are the exact qualifying encounters and corresponding VPN/system fields for “recent 90 days at the same institution, at least two diabetes visits”?
- **Current implementation:** Two manual tri-state inputs represent (1) E08–E13 diabetes diagnosis and (2) at least two same-institution visits within 90 days. A separate manual input represents DM as the primary diagnosis for the enrollment visit. No VPN connection or automated encounter count exists.
- **Official source:** [NHI Payment Standards PDF effective 115-04-01](https://www.nhi.gov.tw/ch/dl-65879-e1d3294beea24125ac05b832243bd9f3-1.pdf), Part 8 Chapter 2, collection criteria; and the [NHI diabetes quality-payment data description](https://www.nhi.gov.tw/ch/dl-74560-89c54c3a359942aca940a52437346108-1.pdf).
- **Source date/version:** Payment standard effective 2026-04-01 (115-04-01), page updated 2026-04-29; data-description source year 112, extraction date 2024-09-09.
- **Exact relevant requirement (summary):** The current payment standard requires a diabetes diagnosis with ICD-10-CM prefix E08–E13 at the same institution during the most recent 90 days, with at least two visits, and requires the enrollment encounter to report diabetes as the primary diagnosis. The official data-description document additionally shows a warehouse/quality-indicator implementation that counts primary-diagnosis E08–E13 encounters and excludes specified non-qualifying claim records (including meal-fee inpatient cases, outpatient case type 08, supplemental-order records, and specified dispensing modes).
- **Confidence:** **High** for the clinical/claim wording above; **medium** for using the older quality-indicator extraction logic as the current operational encounter definition; **insufficient** for the exact VPN screen field names, value codes, query timing, and facility HIS-to-VPN mapping.
- **Recommended action:** Keep the existing manual questions and rule unchanged. Before any automation, obtain the current VPN operating manual/data dictionary used by the facility and confirm whether the 115-version operational query applies the same exclusions as the published quality-indicator extraction.
- **Disposition:** The payment-standard wording is verified, but the stated TODO is specifically about VPN mapping and therefore remains **TODO: requires clinical rule confirmation**.

## TODO-CLINICAL-003 — Program administrative exclusions

- **Question:** What is the complete current set of patient-, provider-, facility-, cross-program-, closure-, and re-enrollment exclusions for the metabolic, DM, Early CKD, and DKD workflows?
- **Current implementation:** The engines evaluate only Phase 1 fields. Metabolic checks age and dialysis; DM checks same-institution closure within one year; Early CKD produces a Pre-ESRD referral result at the coded renal boundaries. `vpnConfirmed` is manual and changes explanatory text only; it does not independently prove or alter clinical eligibility.
- **Official source:** [NHI Payment Standards PDF effective 115-04-01](https://www.nhi.gov.tw/ch/dl-65879-e1d3294beea24125ac05b832243bd9f3-1.pdf); [NHI plan Q&A index](https://www.nhi.gov.tw/ch/cp-14178-779da-3577-1.html); and the [NHA current metabolic-program resource page](https://www.hpa.gov.tw/221/s), which links the program attachment and VPN operating guide.
- **Source date/version:** NHI payment standard effective 115-04-01; DKD FAQ updated 112-12-28; Early CKD FAQ updated 113-12-10; NHA metabolic VPN guide updated 2026-07-08.
- **Exact relevant requirement (summary):** The NHI standard confirms multiple administrative rules beyond laboratory thresholds: participating facility/personnel qualifications; DM same-institution re-enrollment prohibition for one year after closure; defined closure conditions; Early CKD/combined-care referral to Pre-ESRD when renal function worsens to the stated limits; mandatory VPN quality-data upload; and exclusion of patients already enrolled by another physician and not closed when calculating the DM new-enrollment measure. These provisions do not form a complete, single patient-level eligibility matrix for every cross-facility or cross-program VPN state. The public indexes also do not establish the facility-specific VPN/HIS field mapping.
- **Confidence:** **High** for the listed clauses; **insufficient** that the reviewed set is a complete exclusion list for all four workflows and every current VPN conflict state.
- **Recommended action:** Continue to show clinical eligibility separately from the explicit “VPN/system qualification not yet confirmed” warning. Have the facility billing/clinical owner verify the live VPN conflict screen and current program attachments before encoding any new exclusion. Do not infer an exclusion merely from a quality-measure denominator rule.
- **Disposition:** **TODO: requires clinical rule confirmation**

## Verification conclusion

1. The current 115-04-01 NHI payment standard supports the DM 90-day/two-visit/E08–E13/enrollment-primary-diagnosis wording already represented by the application.
2. It does not fully resolve the exact VPN UI/data-field mapping.
3. No sufficiently explicit official HDL medication list was established.
4. Several administrative clauses are confirmed, but a complete current cross-program and cross-facility exclusion matrix was not established.
5. All three TODO markers therefore remain open, and no clinical rules were modified.
