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

  it.each([
    [{ sbp: 140, dbp: null }, 'positive'],
    [{ sbp: null, dbp: 90 }, 'positive'],
    [{ sbp: 120, dbp: null }, 'unknown'],
    [{ sbp: null, dbp: 70 }, 'unknown'],
    [{ sbp: 120, dbp: 70 }, 'negative']
  ])('handles partial blood pressure evidence %#', (values, status) => {
    expect(evaluateMetabolicSyndrome(base(values)).factors.bloodPressure).toBe(status);
  });

  it.each([
    ['glucoseMedication', 'glucose'],
    ['bloodPressureMedication', 'bloodPressure'],
    ['triglycerideMedication', 'triglycerides'],
    ['hdlMedication', 'hdl']
  ])('treats %s as a positive path', (field, factor) => {
    const result = evaluateMetabolicSyndrome(base({ [field]: true }));
    expect(result.factors[factor as keyof typeof result.factors]).toBe('positive');
  });

  it.each([
    ['waist', 'obesity'], ['bmi', 'obesity'], ['fastingGlucose', 'glucose'],
    ['sbp', 'bloodPressure'], ['dbp', 'bloodPressure'], ['triglycerides', 'triglycerides'], ['hdl', 'hdl']
  ])('does not interpret invalid %s as a negative criterion', (field, factor) => {
    const overrides: Partial<MetabolicInput> = { [field]: -1 };
    if (field === 'waist') overrides.bmi = null;
    if (field === 'bmi') overrides.waist = null;
    if (field === 'sbp') overrides.dbp = null;
    if (field === 'dbp') overrides.sbp = null;
    const result = evaluateMetabolicSyndrome(base(overrides));
    expect(result.factors[factor as keyof typeof result.factors]).toBe('unknown');
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

  it('keeps known age exclusion ahead of unknown dialysis', () => {
    expect(evaluateMetabolicProgramEligibility(base({ age: 70, dialysis: 'unknown', waist: 95, fastingGlucose: 105, sbp: 135 })).status).toBe('not-eligible');
  });

  it('keeps known dialysis exclusion ahead of missing age', () => {
    expect(evaluateMetabolicProgramEligibility(base({ age: null, dialysis: 'yes', waist: 95, fastingGlucose: 105, sbp: 135 })).status).toBe('not-eligible');
  });

  it('treats invalid age as insufficient rather than an age-range failure', () => {
    const result = evaluateMetabolicProgramEligibility(base({ age: -1, waist: 95, fastingGlucose: 105, sbp: 135 }));
    expect(result.status).toBe('insufficient-data');
    expect(result.missingFields).toContain('年齡（數值無效）');
  });

  it.each([
    [false, '尚未確認 VPN／收案系統資格'],
    [true, 'VPN／收案系統資格已人工確認']
  ])('uses manual VPN wording when confirmed=%s', (vpnConfirmed, wording) => {
    const result = evaluateMetabolicProgramEligibility(base({ vpnConfirmed, waist: 95, fastingGlucose: 105, sbp: 135 }));
    expect(result.reasons).toEqual(['依目前輸入條件符合', wording]);
  });
});
