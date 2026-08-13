import type { EligibilityResult } from './eligibilityTypes';
import type { MetabolicInput, MetabolicSyndromeResult, RiskFactorStatus } from './metabolicTypes';

function measuredRisk(value: number | null, positive: (value: number) => boolean, medicated = false): RiskFactorStatus {
  if (medicated) return 'positive';
  if (value === null) return 'unknown';
  return positive(value) ? 'positive' : 'negative';
}

export function evaluateMetabolicSyndrome(input: MetabolicInput): MetabolicSyndromeResult {
  let obesity: RiskFactorStatus = 'unknown';
  if ((input.bmi !== null && input.bmi >= 27) ||
      (input.sex === 'male' && input.waist !== null && input.waist >= 90) ||
      (input.sex === 'female' && input.waist !== null && input.waist >= 80)) {
    obesity = 'positive';
  } else if (input.bmi !== null && input.sex !== null && input.waist !== null) {
    obesity = 'negative';
  }

  const factors = {
    obesity,
    glucose: measuredRisk(input.fastingGlucose, (v) => v >= 100, input.glucoseMedication),
    bloodPressure: input.bloodPressureMedication
      ? 'positive' as const
      : input.sbp === null || input.dbp === null
        ? 'unknown' as const
        : input.sbp >= 130 || input.dbp >= 85 ? 'positive' as const : 'negative' as const,
    triglycerides: measuredRisk(input.triglycerides, (v) => v >= 150, input.triglycerideMedication),
    hdl: input.hdlMedication
      ? 'positive' as const
      : input.sex === null || input.hdl === null
        ? 'unknown' as const
        : (input.sex === 'male' ? input.hdl < 40 : input.hdl < 50) ? 'positive' as const : 'negative' as const
  };

  const values = Object.values(factors);
  const positiveCount = values.filter((v) => v === 'positive').length;
  const negativeCount = values.filter((v) => v === 'negative').length;
  const unknownCount = values.filter((v) => v === 'unknown').length;
  const status = positiveCount >= 3
    ? 'eligible'
    : positiveCount + unknownCount < 3 ? 'not-eligible' : 'insufficient-data';

  return {
    status,
    reasons: [`五項危險因子：${positiveCount} 項符合、${negativeCount} 項不符合`],
    missingFields: unknownCount ? ['尚有未完成的危險因子'] : [],
    positiveCount,
    negativeCount,
    unknownCount,
    factors
  };
}

export function evaluateMetabolicProgramEligibility(input: MetabolicInput): EligibilityResult {
  const syndrome = evaluateMetabolicSyndrome(input);
  const missingFields: string[] = [];
  if (input.age === null) missingFields.push('年齡');
  if (input.dialysis === 'unknown') missingFields.push('透析狀態');
  if (syndrome.status === 'insufficient-data') missingFields.push(...syndrome.missingFields);
  if (missingFields.length) return { status: 'insufficient-data', reasons: [], missingFields };
  if (input.age! < 20 || input.age! > 64) return { status: 'not-eligible', reasons: ['年齡不在 20–64 歲收案範圍'], missingFields: [] };
  if (input.dialysis === 'yes') return { status: 'not-eligible', reasons: ['目前接受透析治療'], missingFields: [] };
  if (syndrome.status === 'not-eligible') return { status: 'not-eligible', reasons: ['未達代謝症候群三項判定'], missingFields: [] };
  return {
    status: 'eligible',
    reasons: [input.vpnConfirmed ? '符合目前輸入條件，且已確認系統資格' : '依目前輸入條件符合；尚未確認 VPN／收案系統資格'],
    missingFields: []
  };
}
