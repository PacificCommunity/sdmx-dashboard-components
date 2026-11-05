import { describe, expect, it } from 'vitest';
import { getLatestValue, isNonEmptyValue, selectLatestRootRow } from './chartHelpers';
import type { SDMXDimension, SDMXObservation } from '../components/types';

const timeDimension: SDMXDimension = {
  id: 'TIME_PERIOD',
  name: 'Time period',
  keyPosition: 2,
  values: [
    { id: '2020', name: '2020' },
    { id: '2021', name: '2021' },
    { id: '2022', name: '2022' },
  ],
};

const row = (age: string, period: string, value: number | null): SDMXObservation => ({
  AGE: age,
  TIME_PERIOD: period,
  value,
});

describe('selectLatestRootRow', () => {
  it('returns the latest non-empty preferred row when the Total value is usable', () => {
    const rows = [
      row('Total', '2020', 100),
      row('Total', '2021', 110),
      row('15-19', '2022', 42),
    ];

    expect(
      selectLatestRootRow(rows, timeDimension, {
        preferredDimension: 'AGE',
        preferredValue: 'Total',
      })
    ).toEqual(row('Total', '2021', 110));
  });

  it('returns undefined when preferred rows exist but none has a usable value', () => {
    const rows = [
      row('Total', '2020', null),
      row('Total', '2021', null),
      row('15-19', '2021', 42),
      row('20-24', '2022', 58),
    ];

    expect(
      selectLatestRootRow(rows, timeDimension, {
        preferredDimension: 'AGE',
        preferredValue: 'Total',
      })
    ).toBeUndefined();
  });

  it('falls back to the latest row when the dataset has no preferred rows', () => {
    const rows = [row('Male', '2021', 42), row('Female', '2022', 58)];

    expect(
      selectLatestRootRow(rows, timeDimension, {
        preferredDimension: 'SEX',
        preferredValue: 'Total',
      })
    ).toEqual(row('Female', '2022', 58));
  });
});

describe('getLatestValue', () => {
  it('keeps the first row for each distinct dimension value, in order', () => {
    const rows = [
      row('Total', '2020', 100),
      row('Total', '2021', 110),
      row('15-19', '2020', 42),
      row('15-19', '2021', 48),
    ];

    expect(getLatestValue(rows, 'AGE')).toEqual([
      row('Total', '2020', 100),
      row('15-19', '2020', 42),
    ]);
  });
});

describe('isNonEmptyValue', () => {
  it('rejects null, empty strings and NaN but keeps zero', () => {
    expect(isNonEmptyValue(null)).toBe(false);
    expect(isNonEmptyValue(undefined)).toBe(false);
    expect(isNonEmptyValue('')).toBe(false);
    expect(isNonEmptyValue(Number.NaN)).toBe(false);
    expect(isNonEmptyValue(0)).toBe(true);
    expect(isNonEmptyValue('Total')).toBe(true);
  });
});
