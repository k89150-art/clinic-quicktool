import type { ClinicalAdvisory, EligibilityResult } from './eligibilityTypes';

function mergeAdvisories(...groups: ClinicalAdvisory[][]): ClinicalAdvisory[] {
  const byCode = new Map<string, ClinicalAdvisory>();
  groups.flat().forEach((advisory) => byCode.set(advisory.code, advisory));
  return [...byCode.values()];
}

export function evaluateDkdEligibility(dm: EligibilityResult, ckd: EligibilityResult): EligibilityResult {
  const advisories = mergeAdvisories(dm.advisories, ckd.advisories);

  if (dm.status === 'not-eligible' || ckd.status === 'not-eligible') {
    return { status: 'not-eligible', reasons: ['DM 或 CKD 未符合收案條件'], missingFields: [], advisories };
  }
  if (dm.status === 'refer' || ckd.status === 'refer') {
    return { status: 'refer', reasons: ['應先完成轉介／其他方案評估'], missingFields: [], advisories };
  }
  if (dm.status === 'insufficient-data' || ckd.status === 'insufficient-data') {
    return { status: 'insufficient-data', reasons: ['需先完成 DM 與 CKD 判斷'], missingFields: ['DM 或 CKD 資料'], advisories };
  }
  return { status: 'eligible', reasons: ['DM 與 CKD 收案條件皆符合'], missingFields: [], advisories };
}
