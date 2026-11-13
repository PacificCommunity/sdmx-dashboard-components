import { describe, it, expect } from 'vitest';
import type { EChartsOption } from 'echarts';
import { buildChartOptionFromDatasets } from './options';
import type { ParsedDataset } from '../../utils/chartHelpers';
import type { SDMXChartConfig } from '../types';

const config: SDMXChartConfig = {
    id: 'rates',
    type: 'line',
    xAxisConcept: 'TIME_PERIOD',
    legend: { concept: 'SERIES' },
    data: 'https://example.org/rest/data/X,Y,1.0/all'
};

// one series over the given periods; FREQ is a dimension unless freq is null
const dataset = (periods: string[], freq: string | null): ParsedDataset => {
    const dimensions = [
        { id: 'SERIES', name: 'Series', keyPosition: 1, values: [{ id: 'DFR', name: 'Deposit facility' }] },
        { id: 'TIME_PERIOD', name: 'Time', keyPosition: 2, values: periods.map((p) => ({ id: p, name: p })) },
    ];
    if (freq !== null) {
        dimensions.unshift({ id: 'FREQ', name: 'Frequency', keyPosition: 0, values: [{ id: freq, name: freq }] });
    }
    return {
        datasetIndex: 0,
        dimensions,
        data: periods.map((period, index) => ({
            ...(freq !== null ? { FREQ: freq } : {}),
            SERIES: 'Deposit facility',
            TIME_PERIOD: period,
            value: index + 1,
        })),
    };
};

type TimeAxis = { type: string, axisLabel?: { formatter?: string, hideOverlap?: boolean } };
type LineSeries = { data: Array<[unknown, unknown]> };

const build = (periods: string[], freq: string | null) => {
    const option = buildChartOptionFromDatasets(config, 'en', [dataset(periods, freq)]).option;
    const xAxis = option.xAxis as unknown as TimeAxis;
    const series = option.series as unknown as LineSeries[];
    return { xAxis, points: series[0].data };
};

describe('line chart time axis', () => {
    it.each([
        ['D', ['2024-01-02', '2024-01-03']],
        ['B', ['2024-01-02', '2024-01-03']],
        ['W', ['2024-W01', '2024-W02']],
    ])('labels %s periods with dates', (freq, periods) => {
        const { xAxis, points } = build(periods, freq);
        expect(xAxis.type).toBe('time');
        expect(xAxis.axisLabel?.formatter).toBe('{yyyy}-{MM}-{dd}');
        // every period is plotted at a timestamp, not as a raw string
        expect(points.every(([x]) => typeof x === 'number')).toBe(true);
    });

    it.each([
        ['A', ['2022', '2023'], '{yyyy}'],
        ['Q', ['2023-Q1', '2023-Q2'], '{MMM} {yyyy}'],
        ['M', ['2023-01', '2023-02'], '{MMM} {yyyy}'],
        ['S', ['2023-S1', '2023-S2'], '{MMM} {yyyy}'],
    ])('labels %s periods as before', (freq, periods, formatter) => {
        expect(build(periods, freq).xAxis.axisLabel?.formatter).toBe(formatter);
    });

    it('plots weekly and semester periods at their first day', () => {
        expect(build(['2024-W05'], 'W').points[0][0]).toBe(Date.UTC(2024, 0, 29));
        expect(build(['2024-S2'], 'S').points[0][0]).toBe(Date.UTC(2024, 6, 1));
    });

    it('orders periods within a year chronologically', () => {
        const { points } = build(['2024-W10', '2024-W02', '2024-W05'], 'W');
        expect(points.map(([x]) => x)).toEqual([
            Date.UTC(2024, 0, 8),
            Date.UTC(2024, 0, 29),
            Date.UTC(2024, 2, 4),
        ]);
    });

    it('renders without a FREQ dimension, reading the frequency from the periods', () => {
        expect(build(['2024-01-02', '2024-01-03'], null).xAxis.axisLabel?.formatter).toBe('{yyyy}-{MM}-{dd}');
        expect(build(['2022', '2023'], null).xAxis.axisLabel?.formatter).toBe('{yyyy}');
    });

    it('leaves the labels to ECharts for an unknown frequency', () => {
        const { xAxis } = build(['2024-01-02', '2024-01-03'], 'H');
        expect(xAxis.type).toBe('time');
        expect(xAxis.axisLabel?.formatter).toBeUndefined();
    });

    it.each([
        ['D', ['2026-06-10', '2026-10-27']],
        ['B', ['2026-06-10', '2026-10-27']],
        ['M', ['2024-11', '2025-12']],
        ['A', ['2000', '2025']],
        ['H', ['2024-01-02', '2024-01-03']],
    ])('hides overlapping %s labels, such as boundary ticks next to regular ones', (freq, periods) => {
        expect(build(periods, freq).xAxis.axisLabel?.hideOverlap).toBe(true);
    });
});

describe('line series order', () => {
    const seriesDataset = (withOrder: boolean): ParsedDataset => ({
        datasetIndex: 0,
        dimensions: [
            {
                id: 'SERIES',
                name: 'Series',
                keyPosition: 1,
                values: [
                    { id: 'A', name: 'Alpha', ...(withOrder ? { order: 2 } : {}) },
                    { id: 'Z', name: 'Zeta', ...(withOrder ? { order: 1 } : {}) }
                ]
            },
            {
                id: 'TIME_PERIOD',
                name: 'Time',
                keyPosition: 2,
                values: [{ id: '2020', name: '2020' }]
            }
        ],
        data: [
            { SERIES: 'Alpha', TIME_PERIOD: '2020', value: 1 },
            { SERIES: 'Zeta', TIME_PERIOD: '2020', value: 2 }
        ]
    });

    const seriesNames = (withOrder: boolean) => {
        const option = buildChartOptionFromDatasets(config, 'en', [seriesDataset(withOrder)]).option;
        return (option.series as unknown as Array<{ name: string }>).map((series) => series.name);
    };

    it('sorts series by the SDMX order when present', () => {
        expect(seriesNames(true)).toEqual(['Zeta', 'Alpha']);
    });

    it('falls back to the series name when order is absent', () => {
        expect(seriesNames(false)).toEqual(['Alpha', 'Zeta']);
    });
});

type HoverSeries = {
    name?: string;
    emphasis?: { focus?: string, scale?: boolean, lineStyle?: { width?: number | string }, disabled?: boolean };
    blur?: {
        lineStyle?: { opacity?: number },
        itemStyle?: { opacity?: number },
        label?: { opacity?: number },
    };
};

const hoverStates = (option: EChartsOption) =>
    option.series as unknown as HoverSeries[];

const twoSeriesDataset = (): ParsedDataset => ({
    datasetIndex: 0,
    dimensions: [
        {
            id: 'SERIES',
            name: 'Series',
            keyPosition: 1,
            values: [{ id: 'A', name: 'Alpha' }, { id: 'Z', name: 'Zeta' }],
        },
        {
            id: 'TIME_PERIOD',
            name: 'Time',
            keyPosition: 2,
            values: [{ id: '2020', name: '2020' }],
        },
    ],
    data: [
        { SERIES: 'Alpha', TIME_PERIOD: '2020', value: 1 },
        { SERIES: 'Zeta', TIME_PERIOD: '2020', value: 2 },
    ],
});

const expectHoverStates = (series: HoverSeries) => {
    expect(series.emphasis?.focus).toBe('series');
    expect(series.emphasis?.scale).toBe(false);
    expect(series.emphasis?.lineStyle?.width).toBe('bolder');
    expect(series.blur?.lineStyle?.opacity).toBe(0.2);
    expect(series.blur?.itemStyle?.opacity).toBe(0.2);
    expect(series.blur?.label?.opacity).toBe(0.2);
};

describe('line hover focus', () => {
    it('fades the other series when a line is hovered', () => {
        const option = buildChartOptionFromDatasets(config, 'en', [dataset(['2022', '2023'], 'A')]).option;
        expectHoverStates(hoverStates(option)[0]);
    });

    it('applies the same states to every series', () => {
        const option = buildChartOptionFromDatasets(config, 'en', [twoSeriesDataset()]).option;
        const series = hoverStates(option);
        expect(series).toHaveLength(2);
        series.forEach(expectHoverStates);
    });

    it('fades data labels with their line', () => {
        const option = buildChartOptionFromDatasets({ ...config, labels: true }, 'en', [twoSeriesDataset()]).option;
        hoverStates(option).forEach((series) => {
            expect(series.blur?.label?.opacity).toBe(0.2);
        });
    });

    it('leaves a column chart alone', () => {
        const option = buildChartOptionFromDatasets({ ...config, type: 'column' }, 'en', [twoSeriesDataset()]).option;
        hoverStates(option).forEach((series) => {
            expect(series.emphasis?.focus).toBeUndefined();
            expect(series.blur).toBeUndefined();
        });
    });
});
