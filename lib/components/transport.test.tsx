// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, waitFor, cleanup } from '@testing-library/react';
import type { SDMXDashboardConfig } from './types';
import type { FetchTelemetry } from '../utils/transport';

// Parser stand-in that honours options.fetcher the way sdmx-json-parser
// does since the pluggable-fetcher change; the published 0.3.x still calls
// the global fetch, which would bypass the transport under test.
vi.mock('sdmx-json-parser', () => {
    class SDMXParser {
        async getDatasets(api: string, options: RequestInit & { fetcher?: typeof fetch } = {}) {
            const { fetcher, ...init } = options;
            const response = await (fetcher || fetch)(api, init);
            await response.text();
            return {};
        }
        getData() {
            return [
                { FREQ: 'Annual', TIME_PERIOD: '2020', GEO_PICT: 'Fiji', value: 100 },
                { FREQ: 'Annual', TIME_PERIOD: '2021', GEO_PICT: 'Fiji', value: 110 }
            ];
        }
        getDimensions() {
            return [
                { id: 'FREQ', name: 'Frequency', keyPosition: 0, values: [{ id: 'A', name: 'Annual' }] },
                { id: 'TIME_PERIOD', name: 'Time', keyPosition: 1, values: [{ id: '2020', name: '2020' }, { id: '2021', name: '2021' }] },
                { id: 'GEO_PICT', name: 'Country', keyPosition: 2, values: [{ id: 'FJ', name: 'Fiji' }] }
            ];
        }
        getActiveDimensions() {
            return this.getDimensions().filter((d) => d.values.length > 1);
        }
        getAttributes() {
            return [];
        }
        getName() {
            return 'Test flow';
        }
    }
    return { SDMXParser };
});

import Dashboard from './dashboard';
import Chart from './chart';
import Value from './value';

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('dashboard transport', () => {
    it('two visuals with the same data URL produce one network request, observable via telemetry', async () => {
        const baseFetch = vi.fn(async () => new Response('{}', { status: 200 }));
        vi.stubGlobal('fetch', baseFetch);
        const telemetry: FetchTelemetry[] = [];

        const sharedUrl = 'https://sdmx.example/rest/data/SHARED,DF,1.0/all';
        const config = {
            id: 'dash-transport',
            rows: [
                {
                    columns: [
                        { id: 'vis-a', type: 'line', xAxisConcept: 'TIME_PERIOD', legend: { concept: 'GEO_PICT' }, data: sharedUrl },
                        { id: 'vis-b', type: 'line', xAxisConcept: 'TIME_PERIOD', legend: { concept: 'GEO_PICT' }, data: sharedUrl }
                    ]
                }
            ]
        } as unknown as SDMXDashboardConfig;

        render(<Dashboard config={config} lang="en" onDataFetch={(t) => telemetry.push(t)} />);

        await waitFor(() => {
            expect(telemetry.length).toBe(2);
        });
        expect(baseFetch).toHaveBeenCalledTimes(1);
        expect(telemetry.filter((t) => !t.fromCache)).toHaveLength(1);
        expect(telemetry.filter((t) => t.fromCache)).toHaveLength(1);
        expect(telemetry.every((t) => t.url.startsWith(sharedUrl))).toBe(true);
    });
});

describe('standalone component transport', () => {
    it('a chart wraps its fetcher and reports each settled request through onDataFetch', async () => {
        const fetcher = vi.fn(async () => new Response('{}', { status: 200 }));
        const telemetry: FetchTelemetry[] = [];

        render(<Chart config={{ id: 't', type: 'line', xAxisConcept: 'TIME_PERIOD', legend: { concept: 'GEO_PICT' }, data: 'https://sdmx.example/rest/data/T,T,1.0/all' }} language="en" fetcher={fetcher} onDataFetch={(t) => telemetry.push(t)} />);

        await waitFor(() => expect(telemetry).toHaveLength(1));
        expect(fetcher).toHaveBeenCalledTimes(1);
        expect(telemetry[0]).toMatchObject({ host: 'sdmx.example', status: 200, fromCache: false, retried: false });
    });

    it('a value fetches through the dashboard-style fetcher too', async () => {
        const fetcher = vi.fn(async () => new Response('{}', { status: 200 }));

        render(<Value config={{ id: 'v', type: 'value', xAxisConcept: 'GEO_PICT', data: 'https://sdmx.example/rest/data/V,V,1.0/all' }} language="en" fetcher={fetcher} />);

        await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    });
});

describe('inline fetcher identity', () => {
    const chartConfig = { id: 'inline', type: 'line', xAxisConcept: 'TIME_PERIOD', legend: { concept: 'GEO_PICT' }, data: 'https://sdmx.example/rest/data/I,I,1.0/all' } as const;
    // long enough for a refetch loop to show up in the call count
    const settle = (): Promise<void> => {
        const { promise, resolve } = Promise.withResolvers<void>();
        setTimeout(resolve, 200);
        return promise;
    };

    // a parent that re-renders on every status report and passes a new
    // inline fetcher each time: a transport keyed on the fetcher's identity
    // would refetch on every render and loop
    const StatusTrackingParent = ({ base }: { base: (url: string, init?: RequestInit) => Promise<Response> }) => {
        const [statuses, setStatuses] = React.useState<string[]>([]);
        return (
            <div data-statuses={statuses.join(',')}>
                <Chart
                    config={chartConfig}
                    language="en"
                    fetcher={(url, init) => base(url, init)}
                    onVisualRender={(status) => setStatuses((previous) => [...previous, status.status])}
                />
            </div>
        );
    };

    it('a standalone chart re-rendered with a new inline fetcher fetches once and does not loop', async () => {
        const base = vi.fn(async () => new Response('{}', { status: 200 }));

        render(<StatusTrackingParent base={base} />);

        await waitFor(() => expect(base).toHaveBeenCalledTimes(1));
        await settle();
        expect(base).toHaveBeenCalledTimes(1);
    });

    it('a dashboard re-rendered with a new inline fetcher does not refetch', async () => {
        const base = vi.fn(async () => new Response('{}', { status: 200 }));
        const config = { id: 'dash-inline', rows: [{ columns: [chartConfig] }] } as unknown as SDMXDashboardConfig;

        const { rerender } = render(<Dashboard config={config} lang="en" fetcher={(url, init) => base(url, init)} />);
        await waitFor(() => expect(base).toHaveBeenCalledTimes(1));

        rerender(<Dashboard config={config} lang="en" fetcher={(url, init) => base(url, init)} />);
        rerender(<Dashboard config={config} lang="en" fetcher={(url, init) => base(url, init)} />);
        await settle();
        expect(base).toHaveBeenCalledTimes(1);
    });

    it('a replaced fetcher is used by the next request of a standalone chart', async () => {
        const first = vi.fn(async () => new Response('{}', { status: 200 }));
        const second = vi.fn(async () => new Response('{}', { status: 200 }));

        const { rerender } = render(<Chart config={chartConfig} language="en" fetcher={first} />);
        await waitFor(() => expect(first).toHaveBeenCalledTimes(1));

        rerender(<Chart config={{ ...chartConfig, data: 'https://sdmx.example/rest/data/I,I,1.0/A..' }} language="en" fetcher={second} />);
        await waitFor(() => expect(second).toHaveBeenCalledTimes(1));
        expect(first).toHaveBeenCalledTimes(1);
    });

    // a language change refetches in the same commit that swaps the fetcher:
    // the visuals' requests must already see the new one
    it('a replaced fetcher is used by the next request of a dashboard', async () => {
        const first = vi.fn(async () => new Response('{}', { status: 200 }));
        const second = vi.fn(async () => new Response('{}', { status: 200 }));
        const config = { id: 'dash-replace', rows: [{ columns: [chartConfig] }] } as unknown as SDMXDashboardConfig;

        const { rerender } = render(<Dashboard config={config} lang="en" fetcher={first} />);
        await waitFor(() => expect(first).toHaveBeenCalledTimes(1));

        rerender(<Dashboard config={config} lang="fr" fetcher={second} />);
        await waitFor(() => expect(second).toHaveBeenCalledTimes(1));
        expect(first).toHaveBeenCalledTimes(1);
    });
});
