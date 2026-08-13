import type { EligibilityResult } from './eligibilityTypes';
import { clinicalFieldIssue, clinicalValue, vpnQualificationReasons } from './clinicalInputValidation';
import type { MetabolicInput, MetabolicSyndromeResult, RiskFactorStatus } from './metabolicTypes';

function measuredRisk(value: unknown, positive: (value: number) => boolean, medicated = false): RiskFactorStatus {
  if (medicated) return 'positive';
  const validated = clinicalValue(value);
  if (validated === null) return 'unknown';
  return positive(validated) ? 'positive' : 'negative';
}

export function evaluateMetabolicSyndrome(input: MetabolicInput): MetabolicSyndromeResult {
  const bmi = clinicalValue(input.bmi);
  const waist = clinicalValue(input.waist);
  const sbp = clinicalValue(input.sbp);
  const dbp = clinicalValue(input.dbp);
  const hdlValue = clinicalValue(input.hdl);

  let obesity: RiskFactorStatus = 'unknown';
  if ((bmi !== null && bmi >= 27) ||
      (input.sex === 'male' && waist !== null && waist >= 90) ||
      (input.sex === 'female' && waist !== null && waist >= 80)) {
    obesity = 'positive';
  } else if (bmi !== null && input.sex !== null && waist !== null) {
    obesity = 'negative';
  }

  let bloodPressure: RiskFactorStatus = 'unknown';
  if (input.bloodPressureMedication || (sbp !== null && sbp >= 130) || (dbp !== null && dbp >= 85)) {
    bloodPressure = 'positive';
  } else if (sbp !== null && dbp !== null) {
    bloodPressure = 'negative';
  }

  const factors = {
    obesity,
    glucose: measuredRisk(input.fastingGlucose, (value) => value >= 100, input.glucoseMedication),
    bloodPressure,
    triglycerides: measuredRisk(input.triglycerides, (value) => value >= 150, input.triglycerideMedication),
    hdl: input.hdlMedication
      ? 'positive' as const
      : input.sex === null || hdlValue === null
        ? 'unknown' as const
        : (input.sex === 'male' ? hdlValue < 40 : hdlValue < 50) ? 'positive' as const : 'negative' as const
  };

  const values = Object.values(factors);
  const positiveCount = values.filter((value) => value === 'positive').length;
  const negativeCount = values.filter((value) => value === 'negative').length;
  const unknownCount = values.filter((value) => value === 'unknown').length;
  const status = positiveCount >= 3
    ? 'eligible'
    : positiveCount + unknownCount < 3 ? 'not-eligible' : 'insufficient-data';

  const invalidFields = [
    ['腰圍', input.waist], ['BMI', input.bmi], ['空腹血糖', input.fastingGlucose],
    ['SBP', input.sbp], ['DBP', input.dbp], ['TG', input.triglycerides], ['HDL', input.hdl]
  ]
    .map(([field, value]) => clinicalFieldIssue(String(field), value))
    .filter((issue): issue is string => issue?.includes('數值無效') ?? false);

  return {
    status,
    reasons: [`五項因子中：${positiveCount} 項符合、${negativeCount} 項不符合`],
    missingFields: unknownCount ? [...invalidFields, '尚有未完成的危險因子'] : [],
    advisories: [],
    positiveCount,
    negativeCount,
    unknownCount,
    factors
  };
}

export function evaluateMetabolicProgramEligibility(input: MetabolicInput): EligibilityResult {
  const syndrome = evaluateMetabolicSyndrome(input);
  const age = clinicalValue(input.age);
  const reasons: string[] = [];
  const missingFields: string[] = [];

  if (age !== null && (age < 20 || age > 64)) reasons.push('年齡不在 20–64 歲收案範圍');
  if (input.dialysis === 'yes') reasons.push('目前接受透析治療');
  if (syndrome.status === 'not-eligible') reasons.push('未達代謝症候群三項判定');

  const ageIssue = clinicalFieldIssue('年齡', input.age);
  if (ageIssue) missingFields.push(ageIssue);
  if (input.dialysis === 'unknown') missingFields.push('透析狀態');
  if (syndrome.status === 'insufficient-data') missingFields.push(...syndrome.missingFields);

  if (reasons.length) return { status: 'not-eligible', reasons, missingFields, advisories: [] };
  if (missingFields.length) return { status: 'insufficient-data', reasons: [], missingFields, advisories: [] };
  return {
    status: 'eligible',
    reasons: vpnQualificationReasons(input.vpnConfirmed),
    missingFields: [],
    advisories: []
  };
}
