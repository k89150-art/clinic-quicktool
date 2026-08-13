export type DispenseStatus = 'early' | 'on-time' | 'late';

export interface InitialSchedule {
  firstDate: Date;
  secondDate: Date;
  thirdDate: Date;
}

export interface DispenseResult {
  scheduledDate: Date;
  actualDate: Date;
  differenceDays: number;
  status: DispenseStatus;
  nextDispenseDate: Date;
}
