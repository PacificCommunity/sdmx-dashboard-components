import { describe, expect, it } from 'vitest';
import { selectLatestRootRow, sortTimePeriodValues } from './chartHelpers';

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
