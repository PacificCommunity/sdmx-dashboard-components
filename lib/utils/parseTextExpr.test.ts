import { describe, expect, it } from 'vitest';
import { parseTextExpr } from './parseTextExpr';
import type { SDMXDimension } from '../components/types';

// Shape taken from a live SDMX-JSON structure (DF_IMTS), trimmed to the fields
// parseTextExpr reads. Time-period values carry start/end; other dimensions do not.
const timeDimension: SDMXDimension = {
  id: 'TIME_PERIOD',
  name: 'Time period',
  keyPosition: 8,
  roles: ['TIME_PERIOD'],
  values: [
    { id: '2024-01', name: '2024-01', start: '2024-01-01T00:00:00', end: '2024-01-31T23:59:59' },
    { id: '2024-02', name: '2024-02', start: '2024-02-01T00:00:00', end: '2024-02-29T23:59:59' },
    { id: '2024-03', name: '2024-03', start: '2024-03-01T00:00:00', end: '2024-03-31T23:59:59' },
  ],
};

const sexDimension: SDMXDimension = {
  id: 'SEX',
  name: 'Sex',
  keyPosition: 3,
  values: [
    { id: 'M', name: 'Male' },
    { id: 'F', name: 'Female' },
  ],
};

const singleValueDimension: SDMXDimension = {
  id: 'FREQ',
  name: 'Frequency',
  keyPosition: 0,
  values: [{ id: 'M', name: 'Monthly' }],
};

// Locale-dependent on purpose: assert the month names the same way the
// implementation formats them, so the test tracks range selection, not Intl.
const monthYear = (iso: string) =>
  `${new Date(iso).toLocaleString('default', { month: 'short' })} ${new Date(iso).getFullYear()}`;

describe('parseTextExpr', () => {
  it('renders a time-period range from the first and last value', () => {
    expect(parseTextExpr('Status in employment {$TIME_PERIOD}', [timeDimension])).toBe(
      `Status in employment ${monthYear('2024-01-01T00:00:00')} - ${monthYear('2024-03-01T00:00:00')}`
    );
  });

  it('renders the single value of a one-value dimension', () => {
    expect(parseTextExpr('Frequency: {$FREQ}', [singleValueDimension])).toBe('Frequency: Monthly');
  });

  it('renders a comma separated list of ids when the expression omits the $ prefix', () => {
    expect(parseTextExpr('{SEX}', [sexDimension])).toBe('M, F');
  });

  it('leaves an unknown dimension expression untouched and warns', () => {
    expect(parseTextExpr('{NOPE}', [sexDimension])).toBe('{NOPE}');
  });
});
