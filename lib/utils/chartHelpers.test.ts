import { describe, expect, it } from 'vitest';
import { selectLatestRootRow } from './chartHelpers';

const timeDimension = {
  id: 'TIME_PERIOD',
  values: [{ name: '2020' }, { name: '2021' }, { name: '2022' }],
};

const row = (age: string, period: string, value: unknown) => ({
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
      row('Total', '2021', ''),
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
