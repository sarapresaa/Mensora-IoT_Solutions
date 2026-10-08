import { TranslationService } from '../../services/translation.service';

function uniqPreserveOrder<T>(items: T[]): T[] {
  const seen = new Set<T>();
  const result: T[] = [];
  for (const item of items) {
    if (!seen.has(item)) {
      seen.add(item);
      result.push(item);
    }
  }
  return result;
}

export function parseWeekdays(value: unknown): number[] {
  if (value === null || value === undefined) return [];

  const parseOne = (v: unknown): number | null => {
    if (typeof v === 'number' && Number.isFinite(v)) return Math.trunc(v);
    if (typeof v === 'string') {
      const n = Number.parseInt(v.trim(), 10);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };

  let raw: unknown[] = [];

  if (Array.isArray(value)) {
    raw = value;
  } else if (typeof value === 'number') {
    raw = [value];
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) raw = parsed;
        else raw = [trimmed];
      } catch {
        raw = trimmed.split(',');
      }
    } else {
      raw = trimmed.split(',');
    }
  } else {
    raw = [value];
  }

  const days = raw
    .map(parseOne)
    .filter((d): d is number => d !== null)
    .filter((d) => d >= 0 && d <= 6);

  return uniqPreserveOrder(days);
}

export function formatWeekdays(value: unknown, translate: TranslationService): string {
  const days = parseWeekdays(value);
  if (days.length === 0) return '';

  const weekdayMap: Record<number, string> = {
    0: translate.t('sunday'),
    1: translate.t('monday'),
    2: translate.t('tuesday'),
    3: translate.t('wednesday'),
    4: translate.t('thursday'),
    5: translate.t('friday'),
    6: translate.t('saturday')
  };

  const labels = days.map((d) => weekdayMap[d]).filter(Boolean);
  if (labels.length === 0) return '';

  return `${translate.t('repetition')} ${labels.join(', ')}`;
}
