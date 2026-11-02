// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, cleanup, within } from '@testing-library/react';
import { getInstanceByDom, type EChartsType } from 'echarts/core';
import Chart from './index';
import Table from '../table';
import Dashboard from '../dashboard';
import type { SDMXChartConfig, SDMXTheme } from '../types';

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
        dataSets: [{ action: 'Information', observations: { '0:0:0': [1000.5], '0:1:0': [110], '0:0:1': [50], '0:1:1': [52] } }]
    }
});

const stub = () => vi.stubGlobal('fetch', vi.fn(async () => ({ status: 200, text: async () => JSON.stringify(multiSeriesResponse()) })));

const config = (extra: Partial<SDMXChartConfig> = {}): SDMXChartConfig => ({
    id: 'themed',
    type: 'line',
    title: { text: 'Population by country' },
    xAxisConcept: 'TIME_PERIOD',
    legend: { concept: 'GEO_PICT' },
    data: 'https://example.org/rest/data/X,Y,1.0/all',
    ...extra,
});

type RenderedOption = {
    color: string[],
    backgroundColor?: unknown,
    textStyle?: { fontFamily?: string },
    title: Array<{ textStyle?: { fontFamily?: string } }>,
    series: Array<{ name: string, itemStyle?: { color?: string } }>,
};

const renderChart = async (element: React.ReactElement): Promise<{ chart: EChartsType, option: RenderedOption }> => {
    stub();
    render(element);
    // drawn once the chart has series
    await waitFor(() => {
        const container = document.querySelector('[_echarts_instance_]') as HTMLElement | null;
        const drawn = container ? getInstanceByDom(container)?.getOption() as unknown as RenderedOption | undefined : undefined;
        expect(drawn?.series?.length).toBeGreaterThan(0);
    });
    const chart = getInstanceByDom(document.querySelector('[_echarts_instance_]') as HTMLElement)!;
    return { chart, option: chart.getOption() as unknown as RenderedOption };
};

const theme: SDMXTheme = {
    palette: ['#aa0000', '#00aa00'],
    fontFamily: { display: 'Georgia', data: 'Inter' },
};

describe('SDMXTheme on the chart', () => {
    it('applies the palette and fonts', async () => {
        const { option } = await renderChart(<Chart config={config()} language="en" theme={theme} />);
        expect(option.color).toEqual(['#aa0000', '#00aa00']);
        expect(option.textStyle?.fontFamily).toBe('Inter');
        expect(option.title[0].textStyle?.fontFamily).toBe('Georgia');
    });

    it('lets a per-visual colorPalette override the theme palette', async () => {
        const { option } = await renderChart(
            <Chart config={config({ colorPalette: { GEO_PICT: { FJ: '#123456', WS: '#654321' } } })} language="en" theme={theme} />
        );
        const colors = Object.fromEntries(option.series.map((s) => [s.name, s.itemStyle?.color]));
        expect(colors).toEqual({ Fiji: '#123456', Samoa: '#654321' });
    });

    it('keeps dark mode under an SDMXTheme', async () => {
        const light = await renderChart(<Chart config={config()} language="en" theme={theme} />);
        const lightBackground = light.option.backgroundColor;
        cleanup();

        const dark = await renderChart(
            <div data-bs-theme="dark"><Chart config={config()} language="en" theme={theme} /></div>
        );
        await waitFor(() => {
            const option = getInstanceByDom(document.querySelector('[_echarts_instance_]') as HTMLElement)!.getOption() as unknown as RenderedOption;
            expect(option.backgroundColor).not.toEqual(lightBackground);
            expect(option.color).toEqual(['#aa0000', '#00aa00']);
        });
        expect(dark.chart).toBeDefined();
    });

    it('still accepts a registered ECharts theme name', async () => {
        const { option } = await renderChart(<Chart config={config()} language="en" theme="dark" />);
        expect(option.color).not.toEqual(['#aa0000', '#00aa00']);
    });

    it('the dashboard threads the theme to its charts', async () => {
        const { option } = await renderChart(
            <Dashboard config={{ id: 'themed-dashboard', rows: [{ columns: [config()] }] }} theme={theme} />
        );
        expect(option.color).toEqual(['#aa0000', '#00aa00']);
    });
});

describe('number locale', () => {
    it('formats the chart\'s data table and the table visual with the theme locale', async () => {
        await renderChart(<Chart config={config()} language="en" theme={{ numberFormat: { locale: 'de-DE' } }} />);
        const table = screen.getByRole('table');
        expect(within(table).getByText('1.000,5')).toBeTruthy();
        cleanup();

        stub();
        render(<Table config={{ ...config(), type: 'table' }} language="en" theme={{ numberFormat: { locale: 'de-DE' } }} />);
        expect(await screen.findByText('1.000,5')).toBeTruthy();
    });
});

describe('hidden data table', () => {
    it('renders every observation under the chart, visually hidden', async () => {
        await renderChart(<Chart config={config()} language="en" />);
        const table = screen.getByRole('table');
        expect(within(table).getByText('Population by country')).toBeTruthy();
        const headers = within(table).getAllByRole('columnheader').map((h) => h.textContent);
        expect(headers).toEqual(['TIME_PERIOD', 'Fiji', 'Samoa']);
        const row2020 = within(table).getByText('2020').closest('tr')!;
        expect(within(row2020).getAllByRole('cell').map((c) => c.textContent)).toEqual(['1,000.5', '50']);
        const row2021 = within(table).getByText('2021').closest('tr')!;
        expect(within(row2021).getAllByRole('cell').map((c) => c.textContent)).toEqual(['110', '52']);
        const wrapper = table.parentElement!;
        expect(wrapper.style.position).toBe('absolute');
        expect(wrapper.style.width).toBe('1px');
    });
});
