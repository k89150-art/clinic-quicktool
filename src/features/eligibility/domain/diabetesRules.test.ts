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
});
