import { addDays, differenceInCalendarDays, isValid, startOfDay } from 'date-fns';
import type { DispenseStatus } from './prescriptionTypes';
import { DISPENSE_INTERVAL_DAYS } from './prescriptionRules';

export const LAB_BEFORE_VISIT_DAYS = 7;

export type PrescriptionVisitMode = 'new' | 'second-dispense' | 'third-dispense';

export interface PrescriptionTimeline {
  lastVisitDate: Date;
  scheduledSecondDate: Date;
  scheduledThirdDate: Date;
  labDate: Date;
  followUpDate: Date;
}

export interface DispenseComparison {
  scheduledDate: Date;
  actualDate: Date;
  differenceDays: number;
  status: DispenseStatus;
}

export interface SecondDispenseInput {
  lastVisitDate: Date | null;
  actualSecondDate: Date | null;
}

export interface ThirdDispenseInput {
  actualThirdDate: Date | null;
  lastVisitDate?: Date | null;
}

export interface ThirdDispenseResult {
  actualThirdDate: Date;
  followUpDate: Date;
  labDate: Date;
  originalSecondDate: Date | null;
  originalThirdDate: Date | null;
  originalFollowUpDate: Date | null;
  differenceFromOriginalDays: number | null;
}

export interface DispensePlan {
  timeline: PrescriptionTimeline;
  dispense: DispenseComparison;
}

function safeDate(value: Date | null | undefined): Date | null {
  return value instanceof Date && isValid(value) ? startOfDay(value) : null;
}

function compareDispense(scheduledDate: Date, actualDate: Date): DispenseComparison {
  const signedDifference = differenceInCalendarDays(actualDate, scheduledDate);
  return {
    scheduledDate,
    actualDate,
    differenceDays: Math.abs(signedDifference),
    status: signedDifference < 0 ? 'early' : signedDifference > 0 ? 'late' : 'on-time'
  };
}

function completeTimeline(lastVisitDate: Date, scheduledSecondDate: Date, scheduledThirdDate: Date, followUpBase: Date): PrescriptionTimeline {
  const followUpDate = addDays(followUpBase, DISPENSE_INTERVAL_DAYS);
  return {
    lastVisitDate,
    scheduledSecondDate,
    scheduledThirdDate,
    followUpDate,
    labDate: addDays(followUpDate, -LAB_BEFORE_VISIT_DAYS)
  };
}

export function calculateInitialPrescriptionPlan(lastVisitDate: Date | null): PrescriptionTimeline | null {
  const visit = safeDate(lastVisitDate);
  if (!visit) return null;
  const second = addDays(visit, DISPENSE_INTERVAL_DAYS);
  const third = addDays(second, DISPENSE_INTERVAL_DAYS);
  return completeTimeline(visit, second, third, third);
}

export function calculateSecondDispensePlan(input: SecondDispenseInput): DispensePlan | null {
  const visit = safeDate(input.lastVisitDate);
  const actualSecond = safeDate(input.actualSecondDate);
  if (!visit || !actualSecond) return null;

  const scheduledSecond = addDays(visit, DISPENSE_INTERVAL_DAYS);
  const dispense = compareDispense(scheduledSecond, actualSecond);
  const thirdBase = dispense.status === 'late' ? actualSecond : scheduledSecond;
  const scheduledThird = addDays(thirdBase, DISPENSE_INTERVAL_DAYS);

  return {
    dispense,
    timeline: completeTimeline(visit, scheduledSecond, scheduledThird, scheduledThird)
  };
}

export function calculateThirdDispensePlan(input: ThirdDispenseInput): ThirdDispenseResult | null {
  const actualThird = safeDate(input.actualThirdDate);
  if (!actualThird) return null;

  const visit = safeDate(input.lastVisitDate);
  const followUpDate = addDays(actualThird, DISPENSE_INTERVAL_DAYS);
  const originalSecondDate = visit ? addDays(visit, DISPENSE_INTERVAL_DAYS) : null;
  const originalThirdDate = visit ? addDays(visit, DISPENSE_INTERVAL_DAYS * 2) : null;

  return {
    actualThirdDate: actualThird,
    followUpDate,
    labDate: addDays(followUpDate, -LAB_BEFORE_VISIT_DAYS),
    originalSecondDate,
    originalThirdDate,
    originalFollowUpDate: visit ? addDays(visit, DISPENSE_INTERVAL_DAYS * 3) : null,
    differenceFromOriginalDays: originalThirdDate
      ? differenceInCalendarDays(actualThird, originalThirdDate)
      : null
  };
}
