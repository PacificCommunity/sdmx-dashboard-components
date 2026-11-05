// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, waitFor, cleanup } from '@testing-library/react';
import Chart from './index';
import Table from '../table';
import type { SDMXChartConfig } from '../types';

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

const response = () => ({
    data: {
        structures: [
            {
                name: 'Test flow',
                names: { en: 'Test flow' },
                dimensions: {
                    dataSet: [] as unknown[],
                    series: [] as unknown[],
                    observation: [
                        { id: 'TIME_PERIOD', name: 'Time', keyPosition: 0, values: [{ id: '2020', name: '2020' }] },
                        { id: 'GEO_PICT', name: 'Country', keyPosition: 1, values: [{ id: 'FJ', name: 'Fiji' }] }
                    ]
                },
                attributes: {
                    dataSet: [] as unknown[],
                    dimensionGroup: [] as unknown[],
                    series: [] as unknown[],
                    observation: [] as unknown[]
                }
            }
        ],
        dataSets: [{ action: 'Information', observations: { '0:0': [100] } }]
    }
});

const stub = () => vi.stubGlobal('fetch', vi.fn(async () => ({
    status: 200,
    text: async () => JSON.stringify(response())
})));

const config = (extra: Partial<SDMXChartConfig> = {}): SDMXChartConfig => ({
    id: 'decoration',
    type: 'line',
    xAxisConcept: 'TIME_PERIOD',
    legend: { concept: 'GEO_PICT' },
    data: 'https://example.org/rest/data/X,Y,1.0/all',
    ...extra
});

describe('text decoration', () => {
    it('underlines a chart title and subtitle on the SVG text', async () => {
        stub();
        const { container } = render(
            <Chart
                config={config({
                    title: { text: 'Linked title', link: 'https://example.org/a', decoration: 'underline' },
                    subtitle: { text: 'Source', link: 'https://example.org/b', decoration: 'underline' }
                })}
                language="en"
            />
        );
        await waitFor(() => expect(container.querySelector('svg')).toBeTruthy());
        const texts = Array.from(container.querySelectorAll('text'));
        const title = texts.find((node) => node.textContent === 'Linked title');
        const subtitle = texts.find((node) => node.textContent === 'Source');
        expect(title?.style.textDecoration).toBe('underline');
        expect(subtitle?.style.textDecoration).toBe('underline');
    });

    it('applies the decoration to a table title', async () => {
        stub();
        const { findByRole } = render(
            <Table
                config={{ ...config(), type: 'table', title: { text: 'Linked title', link: 'https://example.org/a', decoration: 'underline' } }}
                language="en"
            />
        );
        const title = await findByRole('heading', { level: 2 });
        expect((title as HTMLElement).style.textDecoration).toBe('underline');
    });
});
