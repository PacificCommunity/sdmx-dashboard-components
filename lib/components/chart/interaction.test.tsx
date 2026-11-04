// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, waitFor, cleanup } from '@testing-library/react';
import { getInstanceByDom, type EChartsType } from 'echarts/core';
import Chart from './index';
import Dashboard from '../dashboard';
import type { SDMXChartConfig, VisualInteraction } from '../types';

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

// two countries over two years: a multi-series chart
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
        dataSets: [{
            action: 'Information',
            observations: { '0:0:0': [100], '0:1:0': [110], '0:0:1': [50], '0:1:1': [52] }
        }]
    }
});

const stubFetch = () => vi.stubGlobal('fetch', vi.fn(async () => ({
    status: 200,
    text: async () => JSON.stringify(multiSeriesResponse())
})));

const chartConfig = (type: SDMXChartConfig['type']): SDMXChartConfig => ({
    id: `multi-${type}`,
    type,
    xAxisConcept: 'TIME_PERIOD',
    legend: { concept: 'GEO_PICT' },
    data: 'https://example.org/rest/data/X,Y,1.0/all'
});

type EngineInternals = {
    getModel: () => { getSeriesByName: (name: string) => Array<{ getDataParams: (index: number) => Record<string, unknown> }> },
    trigger: (event: string, params: unknown) => void,
};

// what ECharts emits when the user clicks a data item: the series' own
// event parameters, the same object its element handlers pass along
const clickPoint = (chart: EChartsType, seriesName: string, dataIndex: number) => {
    const engine = chart as unknown as EngineInternals;
    const params = engine.getModel().getSeriesByName(seriesName)[0].getDataParams(dataIndex);
    engine.trigger('click', { ...params, type: 'click' });
};

const renderChart = async (config: SDMXChartConfig, onUserInteraction?: (e: VisualInteraction) => void) => {
    stubFetch();
    let chart: EChartsType | undefined;
    render(<Chart config={config} language="en" callback={(c) => { chart = c; }} onUserInteraction={onUserInteraction} />);
    await waitFor(() => expect(chart).toBeDefined());
    return chart!;
};

describe('onUserInteraction', () => {
    it('clicking a point on a multi-series line chart yields the full dimension coordinate', async () => {
        const interactions: VisualInteraction[] = [];
        const chart = await renderChart(chartConfig('line'), (e) => interactions.push(e));

        clickPoint(chart, 'Samoa', 1);

        expect(interactions).toEqual([{
            visualId: 'multi-line',
            kind: 'point-click',
            concepts: { FREQ: 'A', TIME_PERIOD: '2021', GEO_PICT: 'WS' },
            value: 52,
            timePeriod: '2021'
        }]);
    });

    it('clicking a bar yields its coordinate from the category and series', async () => {
        const interactions: VisualInteraction[] = [];
        const chart = await renderChart(chartConfig('column'), (e) => interactions.push(e));

        clickPoint(chart, 'Fiji', 0);

        expect(interactions).toEqual([{
            visualId: 'multi-column',
            kind: 'point-click',
            concepts: { FREQ: 'A', TIME_PERIOD: '2020', GEO_PICT: 'FJ' },
            value: 100,
            timePeriod: '2020'
        }]);
    });

    it('clicking the line of a series reports a series-click with the series code', async () => {
        const interactions: VisualInteraction[] = [];
        const chart = await renderChart(chartConfig('line'), (e) => interactions.push(e));

        // the event data ECharts packs on a line with triggerEvent: 'line'
        (chart as unknown as EngineInternals).trigger('click', {
            type: 'click', componentType: 'series', seriesType: 'line', seriesName: 'Fiji', selfType: 'line'
        });

        expect(interactions).toEqual([{ visualId: 'multi-line', kind: 'series-click', concepts: { GEO_PICT: 'FJ' } }]);
    });

    it('toggling a legend item reports a legend-click with the series code', async () => {
        const interactions: VisualInteraction[] = [];
        const chart = await renderChart(chartConfig('line'), (e) => interactions.push(e));

        chart.dispatchAction({ type: 'legendToggleSelect', name: 'Samoa' });

        expect(interactions).toEqual([{ visualId: 'multi-line', kind: 'legend-click', concepts: { GEO_PICT: 'WS' } }]);
    });

    it('adds no behaviour when the callback is absent', async () => {
        const chart = await renderChart(chartConfig('line'));
        expect(() => clickPoint(chart, 'Samoa', 0)).not.toThrow();
    });

    it('the dashboard threads the callback to its charts', async () => {
        stubFetch();
        const interactions: VisualInteraction[] = [];
        const statuses: string[] = [];
        render(
            <Dashboard
                config={{ id: 'interactions', rows: [{ columns: [chartConfig('line')] }] }}
                onVisualRender={(s) => statuses.push(s.status)}
                onUserInteraction={(e) => interactions.push(e)}
            />
        );
        await waitFor(() => expect(statuses).toContain('rendered'));
        const container = document.querySelector('[_echarts_instance_]') as HTMLElement;
        // the surfer's way to the instance: the container's _echarts_instance_
        const chart = getInstanceByDom(container);
        expect(chart).toBeDefined();
        clickPoint(chart!, 'Fiji', 1);
        expect(interactions[0]?.concepts).toEqual({ FREQ: 'A', TIME_PERIOD: '2021', GEO_PICT: 'FJ' });
    });
});
