import { describe, expect, it } from 'vitest';
import { evaluateCkdEligibility, getCkdStage, type CkdInput } from './ckdRules';

const base = (overrides: Partial<CkdInput> = {}): CkdInput => ({
  egfr: 52, uacr: null, upcr: null, recentVisit: 'yes', primaryDiagnosis: 'yes', ...overrides
});

describe('CKD stage and eligibility', () => {
  it.each([[90, 'G1'], [89.9, 'G2'], [60, 'G2'], [59.9, 'G3a'], [45, 'G3a'], [44.9, 'G3b']])('classifies eGFR %s', (egfr, stage) => expect(getCkdStage(egfr)).toBe(stage));
  it('accepts G3a without proteinuria', () => expect(evaluateCkdEligibility(base()).status).toBe('eligible'));
  it('requires urine data for G1/G2', () => expect(evaluateCkdEligibility(base({ egfr: 75 })).status).toBe('insufficient-data'));
  it.each([[29.9, 'not-eligible'], [30, 'eligible']])('applies UACR %s threshold', (uacr, status) => expect(evaluateCkdEligibility(base({ egfr: 75, uacr })).status).toBe(status));
  it.each([[149.9, 'not-eligible'], [150, 'eligible']])('applies UPCR %s threshold', (upcr, status) => expect(evaluateCkdEligibility(base({ egfr: 75, upcr })).status).toBe(status));
  it('refers when eGFR is below 45', () => expect(evaluateCkdEligibility(base({ egfr: 44.9 })).status).toBe('refer'));
  it.each([[999.9, 'eligible'], [1000, 'refer']])('applies Pre-ESRD UPCR boundary %s', (upcr, status) => expect(evaluateCkdEligibility(base({ egfr: 75, upcr })).status).toBe(status));
});
