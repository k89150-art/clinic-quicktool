import { describe, expect, it } from 'vitest';
import { evaluateDiabetesEligibility, type DiabetesInput } from './diabetesRules';

const eligible: DiabetesInput = {
  diagnosisE08ToE13: 'yes', visitsWithin90DaysAtLeastTwo: 'yes',
  primaryDiagnosis: 'yes', closedWithinPastYear: 'no'
};

describe('diabetes eligibility', () => {
  it('is eligible when every condition is met', () => expect(evaluateDiabetesEligibility(eligible).status).toBe('eligible'));
  it('returns insufficient data for an unknown answer', () => expect(evaluateDiabetesEligibility({ ...eligible, closedWithinPastYear: 'unknown' }).status).toBe('insufficient-data'));
  it.each([
    ['diagnosisE08ToE13', 'no'], ['visitsWithin90DaysAtLeastTwo', 'no'],
    ['primaryDiagnosis', 'no'], ['closedWithinPastYear', 'yes']
  ])('rejects failed condition %s', (key, value) => {
    expect(evaluateDiabetesEligibility({ ...eligible, [key]: value }).status).toBe('not-eligible');
  });

  it('keeps a known diagnosis failure ahead of unknown visits', () => {
    const result = evaluateDiabetesEligibility({ ...eligible, diagnosisE08ToE13: 'no', visitsWithin90DaysAtLeastTwo: 'unknown' });
    expect(result.status).toBe('not-eligible');
    expect(result.missingFields).toContain('近 90 天本院就醫次數');
  });

  it('returns insufficient when visits are unknown and no known failure exists', () => {
    expect(evaluateDiabetesEligibility({ ...eligible, visitsWithin90DaysAtLeastTwo: 'unknown' }).status).toBe('insufficient-data');
  });

  it.each([
    [false, '尚未確認 VPN／收案系統資格'],
    [true, 'VPN／收案系統資格已人工確認']
  ])('uses manual VPN wording when confirmed=%s', (vpnConfirmed, wording) => {
    expect(evaluateDiabetesEligibility({ ...eligible, vpnConfirmed }).reasons).toEqual(['依目前輸入條件符合', wording]);
  });
});
