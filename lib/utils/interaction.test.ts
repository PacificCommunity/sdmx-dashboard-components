import { describe, it, expect } from 'vitest';
import { buildInteractionConcepts, buildSeriesConcepts, findInteractionRow } from './interaction';
import { parseDate } from './parseDate';

const dimensions = [
    { id: 'FREQ', values: [{ id: 'A', name: 'Annual' }] },
    { id: 'GEO_PICT', values: [{ id: 'FJ', name: 'Fiji' }, { id: 'WS', name: 'Samoa' }] },
    { id: 'INDICATOR', values: [{ id: 'POP', name: 'Population' }] },
    { id: 'TIME_PERIOD', values: [{ id: '2020', name: '2020' }, { id: '2021', name: '2021' }] }
];

const rows = [
    { FREQ: 'Annual', GEO_PICT: 'Fiji', INDICATOR: 'Population', TIME_PERIOD: '2020', value: 100 },
    { FREQ: 'Annual', GEO_PICT: 'Fiji', INDICATOR: 'Population', TIME_PERIOD: '2021', value: 110 },
    { FREQ: 'Annual', GEO_PICT: 'Samoa', INDICATOR: 'Population', TIME_PERIOD: '2020', value: 50 },
    { FREQ: 'Annual', GEO_PICT: 'Samoa', INDICATOR: 'Population', TIME_PERIOD: '2021', value: 52 },
];

describe('buildInteractionConcepts', () => {
    it('maps every dimension of the row back to its code', () => {
        const row = { FREQ: 'Annual', GEO_PICT: 'Samoa', INDICATOR: 'Population', TIME_PERIOD: '2021', value: 42, y: 42 };
        expect(buildInteractionConcepts(row, dimensions)).toEqual({
            FREQ: 'A',
            GEO_PICT: 'WS',
            INDICATOR: 'POP',
            TIME_PERIOD: '2021'
        });
    });

    it('keeps the raw value when no code matches and skips absent dimensions', () => {
        const row = { GEO_PICT: 'Unknown place', TIME_PERIOD: '2021' };
        expect(buildInteractionConcepts(row, dimensions)).toEqual({
            GEO_PICT: 'Unknown place',
            TIME_PERIOD: '2021'
        });
    });
});

describe('buildSeriesConcepts', () => {
    it('finds the dimension whose value name matches the series name', () => {
        expect(buildSeriesConcepts('Samoa', dimensions)).toEqual({ GEO_PICT: 'WS' });
    });

    it('returns an empty map for an unmatched series name', () => {
        expect(buildSeriesConcepts('Total economy', dimensions)).toEqual({});
    });
});

describe('findInteractionRow', () => {
    it('finds a time-axis point by series name and timestamp', () => {
        expect(findInteractionRow(rows, dimensions, { seriesName: 'Samoa', time: parseDate('2021')!, value: 52 }))
            .toBe(rows[3]);
    });

    it('finds a category point by series and category names', () => {
        expect(findInteractionRow(rows, dimensions, { seriesName: 'Population', name: 'Fiji', timePeriod: '2021' }))
            .toBe(rows[1]);
    });

    it('skips a property that matches no row instead of ruling every row out', () => {
        expect(findInteractionRow(rows, dimensions, { seriesName: 'Samoa (renamed)', name: 'Samoa', value: 50 }))
            .toBe(rows[2]);
    });

    it('returns undefined when nothing identifies the point', () => {
        expect(findInteractionRow(rows, dimensions, { seriesName: 'Nowhere' })).toBeUndefined();
    });
});
