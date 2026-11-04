import { describe, it, expect } from 'vitest';
import { parseDate, periodFrequency } from './parseDate';

const utc = (year: number, month: number, day: number) => Date.UTC(year, month - 1, day);

describe('parseDate', () => {
    it.each([
        ['2023', utc(2023, 1, 1)],
        ['2023-02', utc(2023, 2, 1)],
        ['2023-02-14', utc(2023, 2, 14)],
        ['2023-A1', utc(2023, 1, 1)],
        ['2023-S1', utc(2023, 1, 1)],
        ['2023-S2', utc(2023, 7, 1)],
        ['2023-T3', utc(2023, 9, 1)],
        ['2023-Q2', utc(2023, 4, 1)],
        ['2023-q4', utc(2023, 10, 1)],
        ['2023-M02', utc(2023, 2, 1)],
        ['2023-D032', utc(2023, 2, 1)],
    ])('parses %s', (period, expected) => {
        expect(parseDate(period)).toBe(expected);
    });

    it.each([
        // ISO weeks start on Monday; week 1 holds 4 January
        ['2024-W01', utc(2024, 1, 1)], // 1 Jan 2024 is a Monday
        ['2024-W05', utc(2024, 1, 29)],
        ['2021-W01', utc(2021, 1, 4)], // 1 Jan 2021 is a Friday, in 2020-W53
        ['2020-W53', utc(2020, 12, 28)],
        ['2026-W01', utc(2025, 12, 29)], // week 1 of 2026 starts in 2025
        ['2024-w5', utc(2024, 1, 29)],
    ])('parses the ISO week %s to its Monday', (period, expected) => {
        expect(parseDate(period)).toBe(expected);
    });

    it.each(['', 'latest', '2023-X1', '2023-02-01T00:00:00', '23-02'])('returns null for %j', (period) => {
        expect(parseDate(period)).toBeNull();
    });
});

describe('periodFrequency', () => {
    it.each([
        ['2023', 'A'],
        ['2023-02', 'M'],
        ['2023-02-14', 'D'],
        ['2023-S1', 'S'],
        ['2023-Q2', 'Q'],
        ['2023-M02', 'M'],
        ['2023-W05', 'W'],
        ['2023-w05', 'W'],
    ])('reads %s as %s', (period, frequency) => {
        expect(periodFrequency(period)).toBe(frequency);
    });

    it('returns undefined for an unrecognised period', () => {
        expect(periodFrequency('2023-02-01T10:00')).toBeUndefined();
    });
});
