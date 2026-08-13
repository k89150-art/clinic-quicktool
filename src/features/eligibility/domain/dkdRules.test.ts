import { describe, expect, it } from 'vitest';
import { evaluateDkdEligibility } from './dkdRules';

describe('DKD eligibility', () => {
  it('is eligible when DM and CKD are eligible', () => expect(evaluateDkdEligibility('eligible', 'eligible').status).toBe('eligible'));
  it('is not eligible when either prerequisite is not eligible', () => expect(evaluateDkdEligibility('not-eligible', 'eligible').status).toBe('not-eligible'));
  it('is insufficient when a prerequisite is unknown', () => expect(evaluateDkdEligibility('eligible', 'insufficient-data').status).toBe('insufficient-data'));
});
