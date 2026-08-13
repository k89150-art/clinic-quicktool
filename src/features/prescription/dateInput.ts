import { isValid } from 'date-fns';

export function isValidLocalDate(value: Date | null): value is Date {
  return value !== null && isValid(value);
}

export function parseLocalDateInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);

  if (year < 1 || !isValid(parsed) || parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) return null;
  return parsed;
}

export function parseQuickMonthDay(value: string, year: number): Date | null {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 3 && digits.length !== 4) return null;
  const month = Number(digits.length === 3 ? digits.slice(0, 1) : digits.slice(0, 2));
  const day = Number(digits.length === 3 ? digits.slice(1) : digits.slice(2));
  return parseLocalDateInput(`${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
}

export function toDateInputValue(date: Date | null): string {
  if (!isValidLocalDate(date)) return '';
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
