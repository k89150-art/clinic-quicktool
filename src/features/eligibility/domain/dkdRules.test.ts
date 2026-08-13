import { describe, expect, it } from 'vitest';
import { evaluateDkdEligibility } from './dkdRules';
import type { ClinicalAdvisory, EligibilityResult, EligibilityStatus } from './eligibilityTypes';

const result = (status: EligibilityStatus, advisories: ClinicalAdvisory[] = []): EligibilityResult => ({
  status,
  reasons: [],
  missingFields: [],
  advisories
});

const preEsrd: ClinicalAdvisory = {
  code: 'PRE_ESRD', severity: 'important', message: 'CKD：建議評估 Pre-ESRD'
};

describe('DKD eligibility', () => {
  it('is eligible when DM and CKD are eligible', () => expect(evaluateDkdEligibility(result('eligible'), result('eligible')).status).toBe('eligible'));
  it('is not eligible when either prerequisite is not eligible', () => expect(evaluateDkdEligibility(result('not-eligible'), result('eligible')).status).toBe('not-eligible'));
  it('is insufficient when a prerequisite is unknown', () => expect(evaluateDkdEligibility(result('eligible'), result('insufficient-data')).status).toBe('insufficient-data'));

  it.each([
    ['eligible', 'refer'],
    ['refer', 'eligible'],
    ['insufficient-data', 'refer']
  ] as const)('keeps refer precedence for %s + %s', (dmStatus, ckdStatus) => {
    expect(evaluateDkdEligibility(result(dmStatus), result(ckdStatus, [preEsrd])).status).toBe('refer');
  });

  it('keeps not-eligible status but preserves the CKD Pre-ESRD advisory', () => {
    const dkd = evaluateDkdEligibility(result('not-eligible'), result('refer', [preEsrd]));
    expect(dkd.status).toBe('not-eligible');
    expect(dkd.advisories).toContainEqual(preEsrd);
  });

  it('preserves advisories when DKD itself is refer', () => {
    expect(evaluateDkdEligibility(result('eligible'), result('refer', [preEsrd])).advisories).toContainEqual(preEsrd);
  });
});
