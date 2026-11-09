// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import Table from '../table';
import Value from '../value';
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

    it('underlines linked subtitles in the table and the value by default', async () => {
        const subtitle = { text: 'Source', link: 'https://example.org/source', style: 'italic' };

        stub();
        const table = render(<Table config={{ ...config(), type: 'table', subtitle }} language="en" />);
        const tableLink = await table.findByRole('link');
        expect(tableLink.textContent).toBe('Source');
        expect((tableLink as HTMLElement).style.textDecoration).toBe('underline');
        const tableSubtitle = tableLink.closest('h4') as HTMLElement;
        expect(tableSubtitle.style.fontStyle).toBe('italic');
        table.unmount();

        stub();
        const value = render(<Value config={{ ...config(), type: 'value', subtitle }} language="en" />);
        const valueLink = await value.findByRole('link');
        expect(valueLink.textContent).toBe('Source');
        expect((valueLink as HTMLElement).style.textDecoration).toBe('underline');
        const valueSubtitle = valueLink.closest('h4') as HTMLElement;
        expect(valueSubtitle.style.fontStyle).toBe('italic');
    });
});
