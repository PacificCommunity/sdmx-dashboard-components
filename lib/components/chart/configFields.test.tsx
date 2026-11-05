// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, waitFor, cleanup } from '@testing-library/react';
import type { EChartsType } from 'echarts/core';
import Chart from './index';
import type { SDMXChartConfig } from '../types';

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

const multiSeriesResponse = () => ({
    data: {
        structures: [
            {
                name: 'Test flow',
                names: { en: 'Test flow' },
                dimensions: {
                    dataSet: [] as unknown[],
                    series: [] as unknown[],
                    observation: [
                        { id: 'FREQ', name: 'Frequency', keyPosition: 0, values: [{ id: 'A', name: 'Annual' }] },
                        { id: 'TIME_PERIOD', name: 'Time', keyPosition: 1, values: [{ id: '2020', name: '2020' }, { id: '2021', name: '2021' }] },
                        { id: 'GEO_PICT', name: 'Country', keyPosition: 2, values: [{ id: 'FJ', name: 'Fiji' }, { id: 'WS', name: 'Samoa' }] }
                    ]
                },
                attributes: { dataSet: [] as unknown[], dimensionGroup: [] as unknown[], series: [] as unknown[], observation: [] as unknown[] }
            }
        ],
        dataSets: [{
            action: 'Information',
            observations: { '0:0:0': [100], '0:1:0': [110], '0:0:1': [50], '0:1:1': [52] }
        }]
    }
});

type AxisOption = { type?: string, name?: string, nameLocation?: string };
type RenderedOption = { xAxis: AxisOption[], yAxis: AxisOption[], toolbox: Array<{ show?: boolean }> };

const renderOption = async (config: Partial<SDMXChartConfig>, language = 'en'): Promise<RenderedOption> => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
        status: 200,
        text: async () => JSON.stringify(multiSeriesResponse())
    })));
    let chart: EChartsType | undefined;
    render(
        <Chart
            config={{
                id: 'fields',
                type: 'line',
                xAxisConcept: 'TIME_PERIOD',
                legend: { concept: 'GEO_PICT' },
                data: 'https://example.org/rest/data/X,Y,1.0/all',
                ...config,
            }}
            language={language}
            callback={(c) => { chart = c; }}
        />
    );
    await waitFor(() => expect(chart).toBeDefined());
    return chart!.getOption() as unknown as RenderedOption;
};

describe('semantic axis titles', () => {
    it('names the x and value axes without replacing the time axis', async () => {
        const option = await renderOption({
            xAxisTitle: 'Reporting year',
            yAxisTitle: { en: 'Population', fr: 'Population (fr)' },
        });
        expect(option.xAxis[0].name).toBe('Reporting year');
        expect(option.xAxis[0].nameLocation).toBe('middle');
        expect(option.xAxis[0].type).toBe('time');
        expect(option.yAxis[0].name).toBe('Population');
        // laid out along the axis by applyYAxisTitleLayout
        expect(option.yAxis[0].nameLocation).toBe('middle');
    });

    it('resolves the title in the component language', async () => {
        const option = await renderOption({ yAxisTitle: { en: 'Population', fr: 'Population (fr)' } }, 'fr');
        expect(option.yAxis[0].name).toBe('Population (fr)');
    });

    it('swaps the axes of a horizontal bar chart', async () => {
        const option = await renderOption({
            type: 'bar',
            xAxisTitle: 'Year',
            yAxisTitle: 'People',
        });
        expect(option.yAxis[0].type).toBe('category');
        expect(option.yAxis[0].name).toBe('Year');
        expect(option.xAxis[0].type).toBe('value');
        expect(option.xAxis[0].name).toBe('People');
    });

    it('leaves the axes unnamed when not configured, and extraOptions still override', async () => {
        const untitled = await renderOption({});
        expect(untitled.xAxis[0].name ?? '').toBe('');
        expect(untitled.yAxis[0].name ?? '').toBe('');
        cleanup();

        const overridden = await renderOption({
            yAxisTitle: 'Population',
            extraOptions: { yAxis: { name: 'From extraOptions' } },
        });
        expect(overridden.yAxis[0].name).toBe('From extraOptions');
    });
});

describe('download flag', () => {
    it('shows the save-as-image toolbox by default', async () => {
        const option = await renderOption({});
        expect(option.toolbox[0].show).toBe(true);
    });

    it('hides the toolbox for download: false', async () => {
        const option = await renderOption({ download: false });
        expect(option.toolbox[0].show).toBe(false);
    });
});
