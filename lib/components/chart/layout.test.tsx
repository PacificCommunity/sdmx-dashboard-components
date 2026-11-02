// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, waitFor, cleanup } from '@testing-library/react';
import type { EChartsType } from 'echarts/core';
import type { EChartsOption } from 'echarts';
import Chart from './index';
import { echarts } from './register';
import { CARTESIAN_GRID_INSETS, GRID_CONTAINS_LABELS } from '../../utils/chartHelpers';
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

const renderChart = async (config: Partial<SDMXChartConfig>) => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ status: 200, text: async () => JSON.stringify(multiSeriesResponse()) })));
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
        expect(grid).toMatchObject(GRID_CONTAINS_LABELS);
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
        expect(draw(GRID_CONTAINS_LABELS)).toEqual(draw({ containLabel: true }));
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
