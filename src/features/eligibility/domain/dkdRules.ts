import type { EligibilityResult, EligibilityStatus } from './eligibilityTypes';

export function evaluateDkdEligibility(dmStatus: EligibilityStatus, ckdStatus: EligibilityStatus): EligibilityResult {
  if (dmStatus === 'not-eligible' || ckdStatus === 'not-eligible') {
    return { status: 'not-eligible', reasons: ['DM 或 CKD 有一項明確不符合'], missingFields: [] };
  }
  if (dmStatus === 'refer' || ckdStatus === 'refer') {
    return { status: 'refer', reasons: ['應先完成轉介／其他方案評估'], missingFields: [] };
  }
  if (dmStatus === 'insufficient-data' || ckdStatus === 'insufficient-data') {
    return { status: 'insufficient-data', reasons: ['待 DM 與 CKD 判斷完成'], missingFields: ['DM 或 CKD 資料'] };
  }
  return { status: 'eligible', reasons: ['DM 與 CKD 收案條件皆符合'], missingFields: [] };
}
