import { describe, expect, it } from 'vitest';
import { clinicalFieldIssue, clinicalValue, validateClinicalNumber } from './clinicalInputValidation';

describe('domain clinical number validation', () => {
  it.each([null, undefined, ''])('marks missing values: %s', (value) => {
    expect(validateClinicalNumber(value).kind).toBe('missing');
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, '12', 'abc'])('rejects invalid clinical values: %s', (value) => {
    expect(validateClinicalNumber(value).kind).toBe('invalid');
    expect(clinicalValue(value)).toBeNull();
  });

  it.each([0, 1, 1000000])('accepts finite non-negative values without an upper threshold: %s', (value) => {
    expect(validateClinicalNumber(value)).toEqual({ kind: 'valid', value });
  });

  it('distinguishes invalid data from missing data in field issues', () => {
    expect(clinicalFieldIssue('eGFR', null)).toBe('eGFR');
    expect(clinicalFieldIssue('eGFR', Number.NaN)).toBe('eGFR（數值無效）');
  });
});
