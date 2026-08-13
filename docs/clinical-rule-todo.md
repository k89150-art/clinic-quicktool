# Phase 1.1 Clinical Rule TODO Audit

Audit date: 2026-08-13  
Source searched: `README.md` and `src/`  
Search marker: `TODO: requires clinical rule confirmation`

## Current explicit TODO marker

The repository contains one explicit marker in `README.md`, with three unresolved topics:

> TODO: requires clinical rule confirmation — HDL「相關藥物治療」的正式涵蓋藥品、DM「最近 90 天於該院所診斷」與就醫次數的實際 VPN 欄位對應，以及各方案行政排除條件，仍應由院所依主管機關正式文件確認。

## TODO-CLINICAL-001 — HDL-related medication definition

- **Affected rule:** `MET-DX-HDL`.
- **Current implementation:** `hdlMedication === true` makes the HDL risk factor positive without a numeric HDL value.
- **Unresolved question:** which medications/treatment states formally qualify under the applicable National Health Administration rule.
- **Current status:** unresolved; no medication list or validation was added.
- **Required owner:** clinical owner / official rule document reviewer.

## TODO-CLINICAL-002 — DM 90-day diagnosis and visit-count VPN mapping

- **Affected rules:** `DM-DIAGNOSIS`, `DM-VISITS`.
- **Current implementation:** two manual tri-state answers: E08–E13 diagnosis yes/no/unknown and at least two visits within 90 days yes/no/unknown.
- **Unresolved question:** exact VPN fields, same-facility definition, qualifying encounter definition, and operational mapping used by the facility.
- **Current status:** unresolved; no VPN API or automatic date/count calculation exists.
- **Required owner:** clinical/administrative owner with access to current NHI operational documentation.

## TODO-CLINICAL-003 — Program administrative exclusions

- **Affected rules:** metabolic program, DM, Early CKD, and therefore DKD.
- **Current implementation:** only the administrative fields explicitly present in Phase 1 are evaluated; `vpnConfirmed` is a manual confirmation flag and does not alter eligibility status.
- **Unresolved question:** complete current exclusion list, cross-facility enrollment conflicts, closure/re-enrollment exceptions, VPN state, and facility-specific workflow requirements.
- **Current status:** unresolved; application explicitly does not connect to the VPN system.
- **Required owner:** clinical and billing/administrative owners.

## Disposition

- No TODO has been removed, guessed, or marked complete.
- No clinical threshold or engine behavior was modified during this audit.
- The audit observations in `clinical-rule-audit.md` are validation questions, not additional resolved rules.
