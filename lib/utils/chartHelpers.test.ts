import { describe, expect, it } from 'vitest';
import { getLatestValue, isNonEmptyValue, selectLatestRootRow, sortSeriesValues, sortTimePeriodValues } from './chartHelpers';
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

describe('sortSeriesValues', () => {
  const value = (id: string, name: string, order?: number) => ({
    id,
    name,
    ...(order === undefined ? {} : { order }),
  });

  it('sorts by SDMX order, then by the value id', () => {
    const values = [value('A', 'Alpha', 2), value('Z', 'Zeta', 1), value('B', 'Beta', 1)];
    expect(sortSeriesValues(values).map((entry) => entry.id)).toEqual(['B', 'Z', 'A']);
  });

  it('falls back to the value id when order is absent', () => {
    const values = [value('B', 'Beta'), value('A', 'Alpha')];
    expect(sortSeriesValues(values).map((entry) => entry.id)).toEqual(['A', 'B']);
  });

  it('puts values without order after those with it', () => {
    const values = [value('A', 'Alpha'), value('Z', 'Zeta', 2), value('B', 'Beta', 1)];
    expect(sortSeriesValues(values).map((entry) => entry.id)).toEqual(['B', 'Z', 'A']);
  });

  it('uses the given fallback for ties', () => {
    const values = [value('A', 'Zeta', 1), value('Z', 'Alpha', 1)];
    const byName = (a: ReturnType<typeof value>, b: ReturnType<typeof value>) => a.name.localeCompare(b.name);
    expect(sortSeriesValues(values, [], byName).map((entry) => entry.id)).toEqual(['Z', 'A']);
  });

  it('prefers an ORDER annotation over the value order', () => {
    const annotations = [
      { type: 'ORDER', text: '10' },
      { type: 'ORDER', text: '20' },
    ];
    const values = [
      { id: 'A', name: 'Alpha', order: 1, annotations: [1] },
      { id: 'Z', name: 'Zeta', order: 2, annotations: [0] },
    ];
    expect(sortSeriesValues(values, annotations).map((entry) => entry.id)).toEqual(['Z', 'A']);
  });

  it('reads the ORDER text from the localized texts when text is absent', () => {
    const annotations = [
      { type: 'ORDER', texts: { en: '5' } },
      { type: 'ORDER', texts: { en: '1' } },
    ];
    const values = [
      { id: 'A', name: 'Alpha', annotations: [0] },
      { id: 'Z', name: 'Zeta', annotations: [1] },
    ];
    expect(sortSeriesValues(values, annotations).map((entry) => entry.id)).toEqual(['Z', 'A']);
  });

  it('ignores annotations that are not ORDER and falls back to the value order', () => {
    const annotations = [
      { type: 'NOTE', text: '10' },
      { type: 'ORDER', text: 'not-a-number' },
    ];
    const values = [
      { id: 'A', name: 'Alpha', order: 1, annotations: [0, 1] },
      { id: 'Z', name: 'Zeta', order: 2 },
    ];
    expect(sortSeriesValues(values, annotations).map((entry) => entry.id)).toEqual(['A', 'Z']);
  });
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

// SDMX-JSON leaves the order of dimension values unspecified, and .Stat lists
// periods as it first meets them: this is the TIME_PERIOD dimension of the
// SI_POV_DAY1 lastNObservations=1 query, as returned
const streamedTimeDimension = {
  id: 'TIME_PERIOD',
  values: ['2016', '2019', '2013', '2009', '2012', '2010', '2015'].map((year) => ({
    id: year,
    name: year,
    start: `${year}-01-01T00:00:00`,
    end: `${year}-12-31T23:59:59`,
  })),
};

describe('time periods listed out of order', () => {
  it('selects the latest period by date, not by position in the structure', () => {
    const rows = [row('All ages', '2009', 40), row('15+', '2016', 15.4)];
    expect(selectLatestRootRow(rows, streamedTimeDimension)).toEqual(row('15+', '2016', 15.4));
  });

  it('sorts periods chronologically', () => {
    const rows = [row('_T', '2016', 1), row('_T', '2009', 2), row('_T', '2019', 3), row('_T', '2013', 4)];
    expect(sortTimePeriodValues(rows, streamedTimeDimension).map((r) => r.TIME_PERIOD))
      .toEqual(['2009', '2013', '2016', '2019']);
  });

  it('falls back to the period id when values carry no start date', () => {
    const withoutStart = {
      id: 'TIME_PERIOD',
      values: ['2021-Q3', '2020-Q4', '2021-Q1'].map((period) => ({ id: period, name: period })),
    };
    const rows = [row('_T', '2021-Q1', 1), row('_T', '2021-Q3', 2), row('_T', '2020-Q4', 3)];
    expect(selectLatestRootRow(rows, withoutStart)).toEqual(row('_T', '2021-Q3', 2));
    expect(sortTimePeriodValues(rows, withoutStart).map((r) => r.TIME_PERIOD))
      .toEqual(['2020-Q4', '2021-Q1', '2021-Q3']);
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
