import { describe, it, expect } from 'vitest';
import { validateSeriesDimensions } from './validateChartData';
import { SDMXRenderError } from '../errors';

// rows as returned by SDMXParser.getData(): one object per observation,
// dimension ids mapped to value names plus the observation value
const row = (timePeriod: string, geo: string, indicator: string, value: number) => ({
    TIME_PERIOD: timePeriod,
    GEO_PICT: geo,
    INDICATOR: indicator,
    FREQ: 'Annual',
    value
});

const dimensions = [
    { id: 'FREQ', values: [{ id: 'A', name: 'Annual' }] },
    { id: 'GEO_PICT', values: [{ id: 'FJ', name: 'Fiji' }, { id: 'WS', name: 'Samoa' }] },
    { id: 'INDICATOR', values: [{ id: 'POP', name: 'Population' }, { id: 'GDP', name: 'GDP' }] },
    { id: 'TIME_PERIOD', values: [{ id: '2020', name: '2020' }, { id: '2021', name: '2021' }] }
];

// activeDimensions as SDMXParser.getActiveDimensions() returns them: only the
// dimensions that vary in the fetched response (and the x-axis).
const active = (...ids: string[]) => dimensions.filter((dimension) => ids.includes(dimension.id));
const twoVaryingActive = active('TIME_PERIOD', 'GEO_PICT', 'INDICATOR');
const oneVaryingActive = active('TIME_PERIOD', 'GEO_PICT');

// only TIME_PERIOD varies: one country, one indicator
const singleSeriesData = [
    row('2020', 'Fiji', 'Population', 100),
    row('2021', 'Fiji', 'Population', 110)
];

// GEO_PICT and INDICATOR both vary besides TIME_PERIOD
const twoVaryingData = [
    row('2020', 'Fiji', 'Population', 100),
    row('2020', 'Samoa', 'Population', 50),
    row('2020', 'Fiji', 'GDP', 5000),
    row('2020', 'Samoa', 'GDP', 1000),
    row('2021', 'Fiji', 'Population', 110),
    row('2021', 'Samoa', 'Population', 52),
    row('2021', 'Fiji', 'GDP', 5200),
    row('2021', 'Samoa', 'GDP', 1100)
];

// exactly one dimension varies besides TIME_PERIOD
const oneVaryingData = [
    row('2020', 'Fiji', 'Population', 100),
    row('2020', 'Samoa', 'Population', 50),
    row('2021', 'Fiji', 'Population', 110),
    row('2021', 'Samoa', 'Population', 52)
];

describe('validateSeriesDimensions: ERR_NO_SERIES_DIMENSION', () => {
    const grouping = ['bar', 'column', 'lollipop'];

    it.each(grouping)('%s chart over a single-series query fails with a descriptive error', (chartType) => {
        let caught: unknown;
        try {
            validateSeriesDimensions(chartType, 'TIME_PERIOD', '', singleSeriesData, twoVaryingActive);
        } catch (e) {
            caught = e;
        }
        expect(caught).toBeInstanceOf(SDMXRenderError);
        const error = caught as SDMXRenderError;
        expect(error.code).toBe('ERR_NO_SERIES_DIMENSION');
        // the message wording is a public contract: agents self-correct from it
        expect(error.message).toBe(
            `Chart type=${chartType} with xAxis=TIME_PERIOD needs at least one other varying dimension to group bars/columns. ` +
            'Only TIME_PERIOD varies in this query. Fix: switch chart type to line or pie, ' +
            'widen the data query so a second dimension varies (e.g. remove lastNObservations or broaden the filter), ' +
            'or set legend.concept to a dimension with multiple values.'
        );
    });

    it('does not fire for line or pie charts', () => {
        expect(() => validateSeriesDimensions('line', 'TIME_PERIOD', '', singleSeriesData, twoVaryingActive)).not.toThrow();
        expect(() => validateSeriesDimensions('pie', 'TIME_PERIOD', '', singleSeriesData, twoVaryingActive)).not.toThrow();
    });

    it('does not fire when a second dimension varies', () => {
        expect(() => validateSeriesDimensions('bar', 'TIME_PERIOD', '', oneVaryingData, twoVaryingActive)).not.toThrow();
    });
});

describe('validateSeriesDimensions: ERR_AMBIGUOUS_SERIES', () => {
    it('line chart with two varying non-time dimensions and no legend.concept fails', () => {
        let caught: unknown;
        try {
            validateSeriesDimensions('line', 'TIME_PERIOD', '', twoVaryingData, twoVaryingActive);
        } catch (e) {
            caught = e;
        }
        expect(caught).toBeInstanceOf(SDMXRenderError);
        const error = caught as SDMXRenderError;
        expect(error.code).toBe('ERR_AMBIGUOUS_SERIES');
        // message names the chart type, the x-axis concept, every varying
        // dimension with its value count, and the concrete fixes
        expect(error.message).toContain('type=line');
        expect(error.message).toContain('xAxis=TIME_PERIOD');
        expect(error.message).toContain('GEO_PICT (2 values)');
        expect(error.message).toContain('INDICATOR (2 values)');
        expect(error.message).toContain('set legend.concept to one of the varying dimensions');
        expect(error.message).toContain('narrow the data query');
        expect(error.detail).toEqual({
            chartType: 'line',
            xAxisConcept: 'TIME_PERIOD',
            varyingDimensions: [
                { id: 'GEO_PICT', valueCount: 2 },
                { id: 'INDICATOR', valueCount: 2 }
            ]
        });
    });

    it('is disambiguated by legend.concept', () => {
        expect(() => validateSeriesDimensions('line', 'TIME_PERIOD', 'INDICATOR', twoVaryingData, twoVaryingActive)).not.toThrow();
    });

    it('does not fire with a single varying dimension', () => {
        expect(() => validateSeriesDimensions('line', 'TIME_PERIOD', '', oneVaryingData, twoVaryingActive)).not.toThrow();
    });
});

describe('validateSeriesDimensions: active dimensions', () => {
    it('ignores a dimension that varies in the rows but is not active', () => {
        // INDICATOR varies in twoVaryingData, but the parser did not report it
        // active; the validator must use the parser's candidate set.
        expect(() => validateSeriesDimensions('line', 'TIME_PERIOD', '', twoVaryingData, oneVaryingActive)).not.toThrow();
    });

    it('returns early when there are no active dimensions', () => {
        expect(() => validateSeriesDimensions('bar', 'TIME_PERIOD', '', singleSeriesData, [])).not.toThrow();
    });
});

describe('validateSeriesDimensions: guards', () => {
    it('skips validation for MULTI x-axis, missing x-axis, and empty data', () => {
        expect(() => validateSeriesDimensions('bar', 'MULTI', '', singleSeriesData, twoVaryingActive)).not.toThrow();
        expect(() => validateSeriesDimensions('bar', '', '', singleSeriesData, twoVaryingActive)).not.toThrow();
        expect(() => validateSeriesDimensions('bar', 'TIME_PERIOD', '', [], twoVaryingActive)).not.toThrow();
    });
});
