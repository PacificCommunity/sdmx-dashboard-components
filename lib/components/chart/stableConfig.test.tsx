// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, waitFor, cleanup } from '@testing-library/react';
import Chart from './index';
import type { SDMXChartConfig, VisualRenderStatus } from '../types';

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

const lineResponse = () => ({
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
                        { id: 'GEO_PICT', name: 'Country', keyPosition: 2, values: [{ id: 'FJ', name: 'Fiji' }] }
                    ]
                },
                attributes: { dataSet: [] as unknown[], dimensionGroup: [] as unknown[], series: [] as unknown[], observation: [] as unknown[] }
            }
        ],
        dataSets: [{ action: 'Information', observations: { '0:0:0': [100], '0:1:0': [110] } }]
    }
});

// a parent that re-renders the chart on every tick, passing a brand-new
// inline config object each time (same content) — the loop-trigger pattern
const Harness = ({ data, rerenders }: { data: string, rerenders: number }) => {
    const [, force] = React.useState(0);
    React.useEffect(() => {
        if (rerenders > 0) {
            let n = 0;
            const id = setInterval(() => { n += 1; force(n); if (n >= rerenders) clearInterval(id); }, 5);
            return () => clearInterval(id);
        }
    }, [rerenders]);
    // NEW object literal every render
    const config: SDMXChartConfig = { id: 'loop', type: 'line', xAxisConcept: 'TIME_PERIOD', legend: { concept: 'GEO_PICT' }, data };
    return <Chart config={config} language="en" />;
};

describe('stable config key (anti-loop)', () => {
    it('does not re-fetch when re-rendered with new-but-identical config objects', async () => {
        const fetchMock = vi.fn(async () => ({ status: 200, headers: { get: (h: string) => (h.toLowerCase() === "content-type" ? "application/vnd.sdmx.data+json" : null) }, text: async () => JSON.stringify(lineResponse()) }));
        vi.stubGlobal('fetch', fetchMock);

        render(<Harness data="https://example.org/rest/data/X,Y,1.0/all" rerenders={8} />);

        // wait for the chart to settle and for the forced re-renders to elapse
        await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(0));
        await new Promise((r) => setTimeout(r, 120));
        // one fetch despite many re-renders (StrictMode is off here)
        expect(fetchMock.mock.calls.length).toBe(1);
    });

    it('re-fetches when the config content actually changes', async () => {
        const fetchMock = vi.fn(async () => ({ status: 200, headers: { get: (h: string) => (h.toLowerCase() === "content-type" ? "application/vnd.sdmx.data+json" : null) }, text: async () => JSON.stringify(lineResponse()) }));
        vi.stubGlobal('fetch', fetchMock);

        const cfg = (data: string): SDMXChartConfig => ({ id: 'c', type: 'line', xAxisConcept: 'TIME_PERIOD', legend: { concept: 'GEO_PICT' }, data });
        const { rerender } = render(<Chart config={cfg('https://example.org/rest/data/A,A,1.0/all')} language="en" />);
        await waitFor(() => expect(fetchMock.mock.calls.length).toBe(1));

        rerender(<Chart config={cfg('https://example.org/rest/data/B,B,1.0/all')} language="en" />);
        await waitFor(() => expect(fetchMock.mock.calls.length).toBe(2));
    });

    it('settles when inline config and onVisualRender update the parent state', async () => {
        const fetchMock = vi.fn(async () => ({ status: 200, headers: { get: (h: string) => (h.toLowerCase() === "content-type" ? "application/vnd.sdmx.data+json" : null) }, text: async () => JSON.stringify(lineResponse()) }));
        vi.stubGlobal('fetch', fetchMock);
        const seen: VisualRenderStatus['status'][] = [];

        // every status re-renders the parent, which passes a new config literal
        const Parent = () => {
            const [statuses, setStatuses] = React.useState<VisualRenderStatus['status'][]>([]);
            seen.splice(0, seen.length, ...statuses);
            return (
                <Chart
                    config={{ id: 'p', type: 'line', xAxisConcept: 'TIME_PERIOD', legend: { concept: 'GEO_PICT' }, data: 'https://example.org/rest/data/P,P,1.0/all' }}
                    language="en"
                    onVisualRender={(s) => setStatuses((prev) => [...prev, s.status])}
                />
            );
        };
        render(<Parent />);

        await waitFor(() => expect(seen).toContain('rendered'));
        await new Promise((r) => setTimeout(r, 100));
        expect(seen).toEqual(['loading', 'rendered']);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});
