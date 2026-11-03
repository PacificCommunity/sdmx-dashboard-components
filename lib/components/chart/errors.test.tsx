// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import Chart from './index';
import type { SDMXChartConfig, VisualRenderStatus } from '../types';

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

// SDMX-JSON 2.0 response where only TIME_PERIOD varies: two annual
// observations for one country
const singleSeriesResponse = () => ({
    data: {
        structures: [
            {
                name: 'Test flow',
                names: { en: 'Test flow' },
                dimensions: {
                    dataSet: [],
                    series: [],
                    observation: [
                        { id: 'TIME_PERIOD', name: 'Time', keyPosition: 0, values: [{ id: '2020', name: '2020' }, { id: '2021', name: '2021' }] },
                        { id: 'GEO_PICT', name: 'Country', keyPosition: 1, values: [{ id: 'FJ', name: 'Fiji' }] }
                    ]
                },
                attributes: { dataSet: [], dimensionGroup: [], series: [], observation: [] }
            }
        ],
        dataSets: [{ action: 'Information', observations: { '0:0': [100], '1:0': [110] } }]
    }
});

const barConfig = (): SDMXChartConfig => ({
    id: 'test-bar',
    type: 'bar',
    xAxisConcept: 'TIME_PERIOD',
    data: 'https://example.org/rest/data/X,Y,1.0/all?dimensionAtObservation=AllDimensions'
});

const stubFetchWith = (body: object) => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
        status: 200,
        text: async () => JSON.stringify(body)
    })));
};

describe('chart error surfacing', () => {
    it('renders ERR_FETCH when the data URL is unreachable', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => {
            throw new TypeError('fetch failed');
        }));

        render(<Chart config={barConfig()} language="en" />);

        const alert = await screen.findByRole('alert');
        expect(alert.getAttribute('data-error-code')).toBe('ERR_FETCH');
    });

    it('renders ERR_CONCEPT_NOT_FOUND naming the available concepts for a wrong xAxisConcept', async () => {
        stubFetchWith(singleSeriesResponse());

        render(<Chart config={{ ...barConfig(), xAxisConcept: 'REF_AREA' }} language="en" />);

        const alert = await screen.findByRole('alert');
        expect(alert.getAttribute('data-error-code')).toBe('ERR_CONCEPT_NOT_FOUND');
        expect(alert.textContent).toContain('REF_AREA not found');
        expect(alert.textContent).toContain('TIME_PERIOD');
        expect(alert.textContent).toContain('GEO_PICT');
    });

    it('renders ERR_CONCEPT_NOT_FOUND for a wrong legend.concept', async () => {
        stubFetchWith(singleSeriesResponse());

        render(<Chart config={{ ...barConfig(), type: 'line', legend: { concept: 'SEX' } }} language="en" />);

        const alert = await screen.findByRole('alert');
        expect(alert.getAttribute('data-error-code')).toBe('ERR_CONCEPT_NOT_FOUND');
        expect(alert.textContent).toContain('legendConcept SEX not found in the dataflow. Available concepts: TIME_PERIOD, GEO_PICT.');
    });

    it('renders ERR_EMPTY when the query returns zero observations', async () => {
        const empty = singleSeriesResponse();
        empty.data.dataSets[0].observations = {};
        stubFetchWith(empty);

        render(<Chart config={barConfig()} language="en" />);

        const alert = await screen.findByRole('alert');
        expect(alert.getAttribute('data-error-code')).toBe('ERR_EMPTY');
        expect(alert.textContent).toContain('The data query for visual test-bar returned zero observations.');
    });

    it('reports status "empty" with ERR_EMPTY when the parser finds no records', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => {
            throw Object.assign(new Error('No records found'), { code: 'NO_RECORDS' });
        }));
        const statuses: VisualRenderStatus[] = [];

        render(<Chart config={barConfig()} language="en" onVisualRender={(s) => statuses.push(s)} />);

        const alert = await screen.findByRole('alert');
        expect(alert.getAttribute('data-error-code')).toBe('ERR_EMPTY');
        await waitFor(() => expect(statuses.map((s) => s.status)).toContain('empty'));
        const empty = statuses.find((s) => s.status === 'empty');
        expect(empty?.visualId).toBe('test-bar');
        expect(empty?.error?.code).toBe('ERR_EMPTY');
    });

    it('renders ERR_ENGINE when the charting engine throws', async () => {
        stubFetchWith(singleSeriesResponse());
        const config: SDMXChartConfig = {
            ...barConfig(),
            type: 'line',
            // ECharts calls axis label formatters while laying out setOption
            extraOptions: { yAxis: { axisLabel: { formatter: () => { throw new Error('formatter exploded'); } } } }
        };

        render(<Chart config={config} language="en" />);

        const alert = await screen.findByRole('alert');
        expect(alert.getAttribute('data-error-code')).toBe('ERR_ENGINE');
        expect(alert.textContent).toContain('The charting engine failed while rendering visual test-bar.');
    });

    it('shows a failure in a compact panel instead of the chart height', async () => {
        stubFetchWith(singleSeriesResponse());

        const { container } = render(<Chart config={{ ...barConfig(), xAxisConcept: 'REF_AREA' }} language="en" />);

        const alert = await screen.findByRole('alert');
        // the panel is in the flow, sized by its message, not laid over the chart box
        expect(alert.className).not.toContain('position-absolute');
        expect(alert.style.minHeight).toBe('120px');
        expect(alert.style.height).toBe('');
        // the 400px chart box is kept at its size but takes no room
        const chartBox = container.querySelector<HTMLElement>('div[style*="height: 400px"]');
        expect(chartBox?.parentElement?.style.height).toBe('0px');
        expect(chartBox?.parentElement?.style.overflow).toBe('hidden');
    });

    it('gives a rendered chart its full height', async () => {
        stubFetchWith(singleSeriesResponse());
        const statuses: string[] = [];

        const { container } = render(<Chart config={{ ...barConfig(), type: 'line' }} language="en" onVisualRender={(s) => statuses.push(s.status)} />);

        await waitFor(() => expect(statuses).toContain('rendered'));
        const chartBox = container.querySelector<HTMLElement>('div[style*="height: 400px"]');
        expect(chartBox).not.toBeNull();
        expect(chartBox?.parentElement?.style.height).toBe('');
    });
});
