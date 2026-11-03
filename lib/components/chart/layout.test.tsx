// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, onTestFinished } from 'vitest';
import React from 'react';
import { render, waitFor, cleanup } from '@testing-library/react';
import type { EChartsType } from 'echarts/core';
import type { EChartsOption } from 'echarts';
import Chart from './index';
import { echarts } from './register';
import { platformApi, setPlatformAPI } from 'zrender/lib/core/platform';
import { CARTESIAN_GRID_INSETS, GRID_CONTAINS_AXIS_TEXT, applyYAxisTitleLayout } from '../../utils/chartHelpers';
import type { SDMXChartConfig } from '../types';

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

const multiSeriesResponse = () => ({
    data: {
        structures: [
            {
                name: 'Test flow',
                names: { en: 'Test flow' },
                dimensions: {
                    dataSet: [],
                    series: [],
                    observation: [
                        { id: 'FREQ', name: 'Frequency', keyPosition: 0, values: [{ id: 'A', name: 'Annual' }] },
                        { id: 'TIME_PERIOD', name: 'Time', keyPosition: 1, values: [{ id: '2020', name: '2020' }, { id: '2021', name: '2021' }] },
                        { id: 'GEO_PICT', name: 'Country', keyPosition: 2, values: [{ id: 'FJ', name: 'Fiji' }, { id: 'WS', name: 'Samoa' }] }
                    ]
                },
                attributes: { dataSet: [], dimensionGroup: [], series: [], observation: [] }
            }
        ],
        dataSets: [{ action: 'Information', observations: { '0:0:0': [100], '0:1:0': [110], '0:0:1': [50], '0:1:1': [52] } }]
    }
});

type RenderedOption = {
    grid: Array<Record<string, unknown>>,
    legend: Array<{ top?: number }>,
};

type ChartInternals = {
    getModel: () => { getComponent: (type: string, index?: number) => unknown },
    getViewOfComponentModel: (model: unknown) => { group: { y?: number, getBoundingRect: () => { y: number, height: number } } },
};

const componentBox = (chart: EChartsType, type: string) => {
    const internals = chart as unknown as ChartInternals;
    const { group } = internals.getViewOfComponentModel(internals.getModel().getComponent(type, 0));
    const rect = group.getBoundingRect();
    const top = (group.y ?? 0) + rect.y;
    return { top, bottom: top + rect.height };
};

const gridRect = (chart: EChartsType) => {
    const grid = (chart as unknown as ChartInternals).getModel().getComponent('grid', 0) as {
        coordinateSystem: { getRect: () => { x: number, y: number, width: number, height: number } }
    };
    const { x, y, width, height } = grid.coordinateSystem.getRect();
    return { x, y, width, height };
};

const renderChart = async (config: Partial<SDMXChartConfig>, response: object = multiSeriesResponse()) => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ status: 200, text: async () => JSON.stringify(response) })));
    let chart: EChartsType | undefined;
    render(
        <Chart
            config={{
                id: 'layout',
                type: 'column',
                xAxisConcept: 'TIME_PERIOD',
                legend: { concept: 'GEO_PICT' },
                data: 'https://example.org/rest/data/X,Y,1.0/all',
                ...config,
            } as SDMXChartConfig}
            language="en"
            callback={(c) => { chart = c; }}
        />
    );
    await waitFor(() => expect(chart).toBeDefined());
    return chart!;
};

describe('grid label containment', () => {
    it('lays out like the legacy containLabel without the deprecation log', async () => {
        const log = vi.spyOn(console, 'log');
        const chart = await renderChart({});
        const grid = (chart.getOption() as unknown as RenderedOption).grid[0];
        expect(grid.containLabel).toBeFalsy();
        expect(grid).toMatchObject(GRID_CONTAINS_AXIS_TEXT);
        expect(log.mock.calls.flat().join(' ')).not.toContain('containLabel');
    });

    it('places the grid where ECharts 6 put a containLabel grid', () => {
        const base: EChartsOption = {
            xAxis: { type: 'category', data: ['a long category label', 'another long one'] },
            yAxis: { type: 'value' },
            series: [{ type: 'bar', data: [123456, 7890] }],
        };
        const draw = (grid: Record<string, unknown>) => {
            const container = document.createElement('div');
            const chart = echarts.init(container, undefined, { width: 600, height: 400 });
            chart.setOption({ ...base, grid: { ...grid, ...CARTESIAN_GRID_INSETS } });
            const rect = gridRect(chart);
            chart.dispose();
            return rect;
        };
        vi.spyOn(console, 'log').mockImplementation(() => { });
        expect(draw(GRID_CONTAINS_AXIS_TEXT)).toEqual(draw({ containLabel: true }));
    });
});

type TextElement = {
    style?: { text?: unknown },
    getBoundingRect: () => { clone: () => { applyTransform: (m: unknown) => void, x: number, y: number, width: number, height: number } },
    updateTransform?: () => void,
    transform?: unknown,
};

// the drawn box of the text element showing `text`, in canvas pixels
const textBox = (chart: EChartsType, text: string) => {
    const zr = chart.getZr() as unknown as { storage: { getDisplayList: (update: boolean) => TextElement[] } };
    const element = zr.storage.getDisplayList(true).find((el) => el.style?.text === text);
    if (!element) throw new Error(`no text element "${text}"`);
    const rect = element.getBoundingRect().clone();
    element.updateTransform?.();
    if (element.transform) rect.applyTransform(element.transform);
    return { left: rect.x, right: rect.x + rect.width, top: rect.y, bottom: rect.y + rect.height };
};

const largeValueResponse = () => {
    const response = multiSeriesResponse();
    response.data.dataSets[0].observations = { '0:0:0': [1234567], '0:1:0': [1100000], '0:0:1': [50], '0:1:1': [52] };
    return response;
};

describe('axis names inside the canvas', () => {
    const TITLE = 'Rate (% per annum)';

    it('keeps a rotated y axis name between the left edge and wide tick labels', async () => {
        const chart = await renderChart(
            { yAxisTitle: TITLE, extraOptions: { yAxis: { axisLabel: { formatter: (v: number) => v.toLocaleString('en') } } } },
            largeValueResponse()
        );
        const name = textBox(chart, TITLE);
        const label = textBox(chart, '1,200,000');
        expect(name.left).toBeGreaterThanOrEqual(0);
        expect(name.right).toBeLessThanOrEqual(label.left);
        expect(label.right).toBeLessThanOrEqual(gridRect(chart).x);
    });

    it('keeps both names of a horizontal bar chart inside the canvas', async () => {
        const chart = await renderChart({ type: 'bar', xAxisTitle: 'Reporting year', yAxisTitle: TITLE }, largeValueResponse());
        const yName = textBox(chart, 'Reporting year');
        const xName = textBox(chart, TITLE);
        const plot = gridRect(chart);
        expect(yName.left).toBeGreaterThanOrEqual(0);
        expect(yName.right).toBeLessThan(plot.x);
        expect(xName.top).toBeGreaterThan(plot.y + plot.height);
        expect(xName.bottom).toBeLessThanOrEqual(chart.getHeight());
    });

    it('grows the left inset with the name gap and the name font size', () => {
        // the canvas mock measures every font alike; size text by its font
        // so the name's line height follows nameTextStyle.fontSize. zrender
        // keeps one measuring context across tests, so swap its measurer
        const originalMeasure = platformApi.measureText;
        setPlatformAPI({
            measureText: (text: string, font?: string) => {
                const size = Number(/(\d+(?:\.\d+)?)px/.exec(font ?? '')?.[1] ?? 12);
                return { width: text.length * size * 0.6 };
            },
        });
        onTestFinished(() => setPlatformAPI({ measureText: originalMeasure }));
        const draw = (yAxis: Record<string, unknown>) => {
            const container = document.createElement('div');
            const chart = echarts.init(container, undefined, { width: 600, height: 400 });
            const option = {
                grid: { ...GRID_CONTAINS_AXIS_TEXT, ...CARTESIAN_GRID_INSETS },
                xAxis: { type: 'category', data: ['2020', '2021'] },
                yAxis: { type: 'value', name: TITLE, ...yAxis },
                series: [{ type: 'line', data: [1234567, 1100000] }],
                animation: false,
            };
            applyYAxisTitleLayout(option);
            chart.setOption(option as EChartsOption);
            const result = { plotLeft: gridRect(chart).x, nameLeft: textBox(chart, TITLE).left };
            chart.dispose();
            return result;
        };
        const base = draw({});
        const wideGap = draw({ nameGap: 120 });
        const bigFont = draw({ nameGap: 120, nameTextStyle: { fontSize: 31 } });
        expect(wideGap.plotLeft).toBeGreaterThan(base.plotLeft);
        expect(bigFont.plotLeft).toBeGreaterThan(wideGap.plotLeft);
        [base, wideGap, bigFont].forEach(({ nameLeft }) => expect(nameLeft).toBeGreaterThanOrEqual(0));
    });
});

describe('top legend and title', () => {
    it('moves a top legend below the title and the plot below both', async () => {
        const chart = await renderChart({ title: { text: 'Population by country' }, legend: { concept: 'GEO_PICT', location: 'top' } });
        const title = componentBox(chart, 'title');
        const legend = componentBox(chart, 'legend');
        expect(title.bottom).toBeGreaterThan(0);
        expect(legend.top).toBeGreaterThanOrEqual(title.bottom);
        expect(gridRect(chart).y).toBeGreaterThan(legend.bottom);
    });

    it('keeps a top legend at the top when there is no title', async () => {
        const chart = await renderChart({ legend: { concept: 'GEO_PICT', location: 'top' } });
        expect((chart.getOption() as unknown as RenderedOption).legend[0].top).toBe(0);
    });

    it('leaves a legend that extraOptions position alone', async () => {
        const chart = await renderChart({
            title: { text: 'Population by country' },
            legend: { concept: 'GEO_PICT', location: 'top' },
            extraOptions: { legend: { top: 4 } },
        });
        expect((chart.getOption() as unknown as RenderedOption).legend[0].top).toBe(4);
    });
});
