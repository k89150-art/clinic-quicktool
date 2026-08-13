import { addDays, differenceInCalendarDays, startOfDay } from 'date-fns';
import type { DispenseResult, InitialSchedule } from './prescriptionTypes';

export const DISPENSE_INTERVAL_DAYS = 28;

export function calculateInitialSchedule(firstDate: Date): InitialSchedule {
  const first = startOfDay(firstDate);
  return {
    firstDate: first,
    secondDate: addDays(first, DISPENSE_INTERVAL_DAYS),
    thirdDate: addDays(first, DISPENSE_INTERVAL_DAYS * 2)
  };
}

export function calculateActualDispense(scheduledDate: Date, actualDate: Date): DispenseResult {
  const scheduled = startOfDay(scheduledDate);
  const actual = startOfDay(actualDate);
  const signedDifference = differenceInCalendarDays(actual, scheduled);
  const status = signedDifference < 0 ? 'early' : signedDifference > 0 ? 'late' : 'on-time';
  const nextDispenseDate = addDays(status === 'late' ? actual : scheduled, DISPENSE_INTERVAL_DAYS);

  return {
    scheduledDate: scheduled,
    actualDate: actual,
    differenceDays: Math.abs(signedDifference),
    status,
    nextDispenseDate
  };
}
