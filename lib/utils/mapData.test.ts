import { describe, it, expect } from 'vitest';
import { buildGeoLookup, findGeoRow, isMapValue, normaliseMapValue } from './mapData';

const dimensions = [
    {
        id: 'GEO_PICT',
        values: [
            { id: 'FJ', name: 'Fiji' },
            { id: 'WS', name: 'Samoa' },
            { id: 'TO', name: 'Tonga' },
            { id: 'NU', name: 'Niue' },
        ],
    },
];

const data = [
    { GEO_PICT: 'Fiji', value: 200 },
    { GEO_PICT: 'Samoa', value: 0 },
    { GEO_PICT: 'Tonga', value: 50 },
];

describe('normaliseMapValue', () => {
    it('places a value at (v - min) / (max - min)', () => {
        expect(normaliseMapValue(100, 100, 200)).toBe(0);
        expect(normaliseMapValue(150, 100, 200)).toBe(0.5);
        expect(normaliseMapValue(200, 100, 200)).toBe(1);
        // the old (v - min) / max put 150 at 0.25 on a 100..200 range
        expect(normaliseMapValue(150, 100, 200)).not.toBe(0.25);
    });

    it('handles negative ranges and clamps out-of-range values', () => {
        expect(normaliseMapValue(-5, -10, 10)).toBe(0.25);
        expect(normaliseMapValue(20, -10, 10)).toBe(1);
        expect(normaliseMapValue(-20, -10, 10)).toBe(0);
    });

    it('puts every value at the top of the scale when they are all equal', () => {
        expect(normaliseMapValue(7, 7, 7)).toBe(1);
    });
});

describe('isMapValue', () => {
    it('counts zero as a value to fill', () => {
        expect(isMapValue(0)).toBe(true);
        expect(isMapValue('0')).toBe(true);
    });

    it('rejects missing and non-numeric values', () => {
        expect(isMapValue(null)).toBe(false);
        expect(isMapValue(undefined)).toBe(false);
        expect(isMapValue('')).toBe(false);
        expect(isMapValue('n/a')).toBe(false);
    });
});

describe('buildGeoLookup', () => {
    it('keys rows by code and by label, with the range of their values, zero included', () => {
        const lookup = buildGeoLookup(data, dimensions, 'GEO_PICT');
        expect(lookup.byCode.WS).toMatchObject({ GEO_PICT: 'Samoa', value: 0, name: 'Samoa' });
        expect(lookup.byLabel.Fiji).toMatchObject({ value: 200 });
        expect(lookup.byCode.NU).toBeUndefined();
        expect(lookup).toMatchObject({ min: 0, max: 200, hasValues: true });
    });

    it('reports no values when nothing joins', () => {
        expect(buildGeoLookup([], dimensions, 'GEO_PICT')).toMatchObject({ min: 0, max: 0, hasValues: false });
    });
});

describe('findGeoRow', () => {
    const lookup = buildGeoLookup(data, dimensions, 'GEO_PICT');

    it('joins a feature by code', () => {
        expect(findGeoRow(lookup, 'TO')?.value).toBe(50);
    });

    it('converts an ISO 3166 alpha-3 key to its alpha-2 code', () => {
        expect(findGeoRow(lookup, 'FJI')?.value).toBe(200);
    });

    it('falls back to the label when no code matches', () => {
        expect(findGeoRow(lookup, 'Samoa')?.value).toBe(0);
    });

    it('prefers the code over a label that happens to match', () => {
        // a dimension where one code equals another value's label
        const tricky = buildGeoLookup(
            [{ GEO: 'AB', value: 1 }, { GEO: 'Other', value: 2 }],
            [{ id: 'GEO', values: [{ id: 'X1', name: 'AB' }, { id: 'AB', name: 'Other' }] }],
            'GEO'
        );
        expect(findGeoRow(tricky, 'AB')?.value).toBe(2);
    });

    it('returns null for a missing key or an unknown feature', () => {
        expect(findGeoRow(lookup, undefined)).toBeNull();
        expect(findGeoRow(lookup, 'XX')).toBeNull();
    });
});
