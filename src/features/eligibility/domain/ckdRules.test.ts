import { describe, expect, it } from 'vitest';
import { evaluateCkdEligibility, getCkdStage, type CkdInput } from './ckdRules';

const base = (overrides: Partial<CkdInput> = {}): CkdInput => ({
  egfr: 52, uacr: null, upcr: null, recentVisit: 'yes', primaryDiagnosis: 'yes', ...overrides
});

describe('CKD stage and eligibility', () => {
  it.each([[90, 'G1'], [89.9, 'G2'], [60, 'G2'], [59.9, 'G3a'], [45, 'G3a'], [44.9, 'G3b']])('classifies eGFR %s', (egfr, stage) => expect(getCkdStage(egfr)).toBe(stage));
  it.each([[30, 'G3b'], [29.9, 'G4'], [15, 'G4'], [14.9, 'G5']])('classifies G4/G5 boundary eGFR %s', (egfr, stage) => expect(getCkdStage(egfr)).toBe(stage));
  it('accepts G3a without proteinuria', () => expect(evaluateCkdEligibility(base()).status).toBe('eligible'));
  it('requires urine data for G1/G2', () => expect(evaluateCkdEligibility(base({ egfr: 75 })).status).toBe('insufficient-data'));
  it.each([[29.9, 'not-eligible'], [30, 'eligible']])('applies UACR %s threshold', (uacr, status) => expect(evaluateCkdEligibility(base({ egfr: 75, uacr })).status).toBe(status));
  it.each([[149.9, 'not-eligible'], [150, 'eligible']])('applies UPCR %s threshold', (upcr, status) => expect(evaluateCkdEligibility(base({ egfr: 75, upcr })).status).toBe(status));
  it('refers when eGFR is below 45', () => expect(evaluateCkdEligibility(base({ egfr: 44.9 })).status).toBe('refer'));
  it.each([[999.9, 'eligible'], [1000, 'refer']])('applies Pre-ESRD UPCR boundary %s', (upcr, status) => expect(evaluateCkdEligibility(base({ egfr: 75, upcr })).status).toBe(status));

  it('creates a structured Pre-ESRD advisory', () => {
    expect(evaluateCkdEligibility(base({ egfr: 44.9 })).advisories).toEqual([
      { code: 'PRE_ESRD', severity: 'important', message: 'CKD：建議評估 Pre-ESRD' }
    ]);
  });

  it('keeps a known G2 renal failure ahead of unknown administrative data', () => {
    const result = evaluateCkdEligibility(base({ egfr: 75, uacr: 10, upcr: 100, recentVisit: 'unknown' }));
    expect(result.status).toBe('not-eligible');
    expect(result.reasons).toContain('未達 UACR／UPCR 蛋白尿條件');
  });

  it('keeps a known recent-visit failure ahead of unknown primary diagnosis', () => {
    const result = evaluateCkdEligibility(base({ recentVisit: 'no', primaryDiagnosis: 'unknown' }));
    expect(result.status).toBe('not-eligible');
    expect(result.missingFields).toContain('本次 CKD 主診斷');
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])('does not stage invalid eGFR %s as G5', (egfr) => {
    const result = evaluateCkdEligibility(base({ egfr }));
    expect(result.status).toBe('insufficient-data');
    expect(result.stage).toBeNull();
    expect(result.missingFields).toContain('eGFR（數值無效）');
  });

  it.each([
    [{ uacr: -1, upcr: null }, 'UACR（數值無效）'],
    [{ uacr: null, upcr: Number.NaN }, 'UPCR（數值無效）']
  ])('does not interpret invalid urine data as a negative criterion %#', (values, issue) => {
    const result = evaluateCkdEligibility(base({ egfr: 75, ...values }));
    expect(result.status).toBe('insufficient-data');
    expect(result.missingFields).toContain(issue);
  });

  it('does not let a valid low urine value turn another invalid urine value into renal failure', () => {
    const result = evaluateCkdEligibility(base({ egfr: 75, uacr: Number.NaN, upcr: 100 }));
    expect(result.status).toBe('insufficient-data');
    expect(result.missingFields).toContain('UACR（數值無效）');
  });

  it.each([
    [false, '尚未確認 VPN／收案系統資格'],
    [true, 'VPN／收案系統資格已人工確認']
  ])('uses manual VPN wording when confirmed=%s', (vpnConfirmed, wording) => {
    expect(evaluateCkdEligibility(base({ vpnConfirmed })).reasons).toContain(wording);
    expect(evaluateCkdEligibility(base({ vpnConfirmed })).reasons).toContain('依目前輸入條件符合');
  });
});
