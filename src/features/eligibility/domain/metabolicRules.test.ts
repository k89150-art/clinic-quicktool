import { describe, expect, it } from 'vitest';
import { evaluateMetabolicProgramEligibility, evaluateMetabolicSyndrome } from './metabolicRules';
import type { MetabolicInput } from './metabolicTypes';

const base = (overrides: Partial<MetabolicInput> = {}): MetabolicInput => ({
  age: 40, sex: 'male', waist: 80, bmi: 22, fastingGlucose: 90,
  sbp: 120, dbp: 80, triglycerides: 100, hdl: 50,
  glucoseMedication: false, bloodPressureMedication: false,
  triglycerideMedication: false, hdlMedication: false,
  dialysis: 'no', vpnConfirmed: false, ...overrides
});

describe('metabolic syndrome boundaries', () => {
  it.each([
    [{ sex: 'male', waist: 89.9 }, 'negative'], [{ sex: 'male', waist: 90 }, 'positive'],
    [{ sex: 'female', waist: 79.9 }, 'negative'], [{ sex: 'female', waist: 80 }, 'positive'],
    [{ bmi: 26.9 }, 'negative'], [{ bmi: 27 }, 'positive']
  ])('evaluates obesity boundary %#', (values, status) => {
    expect(evaluateMetabolicSyndrome(base(values as Partial<MetabolicInput>)).factors.obesity).toBe(status);
  });

  it.each([
    ['fastingGlucose', 99, 'glucose', 'negative'], ['fastingGlucose', 100, 'glucose', 'positive'],
    ['sbp', 129, 'bloodPressure', 'negative'], ['sbp', 130, 'bloodPressure', 'positive'],
    ['dbp', 84, 'bloodPressure', 'negative'], ['dbp', 85, 'bloodPressure', 'positive'],
    ['triglycerides', 149, 'triglycerides', 'negative'], ['triglycerides', 150, 'triglycerides', 'positive']
  ])('evaluates numeric boundary %#', (field, value, factor, status) => {
    expect(evaluateMetabolicSyndrome(base({ [field]: value })).factors[factor as keyof ReturnType<typeof evaluateMetabolicSyndrome>['factors']]).toBe(status);
  });

  it.each([
    ['male', 39.9, 'positive'], ['male', 40, 'negative'],
    ['female', 49.9, 'positive'], ['female', 50, 'negative']
  ])('evaluates HDL boundary for %s', (sex, hdl, status) => {
    expect(evaluateMetabolicSyndrome(base({ sex: sex as 'male' | 'female', hdl })).factors.hdl).toBe(status);
  });

  it('counts obesity only once when both waist and BMI are positive', () => {
    const result = evaluateMetabolicSyndrome(base({ waist: 95, bmi: 30 }));
    expect(result.positiveCount).toBe(1);
  });
});

describe('metabolic 3/5 and program eligibility', () => {
  it('returns eligible for 3 positive factors', () => expect(evaluateMetabolicSyndrome(base({ waist: 95, fastingGlucose: 105, sbp: 135 })).status).toBe('eligible'));
  it('returns not eligible when three are definitively negative', () => expect(evaluateMetabolicSyndrome(base({ waist: 95, fastingGlucose: 105 })).status).toBe('not-eligible'));
  it('returns insufficient when unknown factors can still reach three', () => expect(evaluateMetabolicSyndrome(base({ waist: 95, fastingGlucose: 105, sbp: null, dbp: null, triglycerides: null })).status).toBe('insufficient-data'));
  it('returns not eligible when unknown factors cannot reach three', () => expect(evaluateMetabolicSyndrome(base({ waist: 95, fastingGlucose: 90, sbp: 120, dbp: 80, triglycerides: 100, hdl: null })).status).toBe('not-eligible'));

  it.each([[19, 'not-eligible'], [20, 'eligible'], [64, 'eligible'], [65, 'not-eligible']])('applies age %i boundary', (age, status) => {
    expect(evaluateMetabolicProgramEligibility(base({ age, waist: 95, fastingGlucose: 105, sbp: 135 })).status).toBe(status);
  });

  it('excludes dialysis', () => expect(evaluateMetabolicProgramEligibility(base({ dialysis: 'yes', waist: 95, fastingGlucose: 105, sbp: 135 })).status).toBe('not-eligible'));
});
