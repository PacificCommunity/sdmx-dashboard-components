// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import type { SDMXVisualConfig } from '../types';

// Parser stand-in that honours options.fetcher the way sdmx-json-parser
// 0.4.1 does (0.4.0 calls the global fetch, bypassing the transport); the
// response body is the observation value
vi.mock('sdmx-json-parser', () => {
    class SDMXParser {
        value = 0;
        async getDatasets(api: string, options: RequestInit & { fetcher?: typeof fetch } = {}) {
            const { fetcher, ...init } = options;
            const response = await (fetcher || fetch)(api, init);
            this.value = Number(await response.text());
        }
        getData() {
            return [{ TIME_PERIOD: '2021', GEO_PICT: 'Fiji', value: this.value }];
        }
        getDimensions() {
            return [
                { id: 'TIME_PERIOD', name: 'Time', values: [{ id: '2021', name: '2021' }] },
                { id: 'GEO_PICT', name: 'Country', values: [{ id: 'FJ', name: 'Fiji' }] }
            ];
        }
        getAttributes(): unknown[] {
            return [];
        }
    }
    return { SDMXParser };
});

import Value from './index';

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

const stubFetchByFlow = () => {
    const fetchMock = vi.fn(async (url: string) => new Response(url.includes('/B,B,') ? '222' : '111', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
};

const kpi = (data: string, title = 'KPI'): SDMXVisualConfig => ({
    id: 'kpi',
    type: 'value',
    xAxisConcept: 'GEO_PICT',
    title: { text: title },
    data
});

describe('value refetch', () => {
    it('refetches and shows the new number when its data URL changes', async () => {
        const fetchMock = stubFetchByFlow();

        const { rerender } = render(<Value config={kpi('https://example.org/rest/data/A,A,1.0/all')} language="en" />);
        await screen.findByText('111');

        rerender(<Value config={kpi('https://example.org/rest/data/B,B,1.0/all')} language="en" />);
        await screen.findByText('222');
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('refetches when the language changes', async () => {
        const fetchMock = stubFetchByFlow();

        const { rerender } = render(<Value config={kpi('https://example.org/rest/data/A,A,1.0/all')} language="en" />);
        await screen.findByText('111');

        rerender(<Value config={kpi('https://example.org/rest/data/A,A,1.0/all')} language="fr" />);
        await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    });

    it('re-renders a title change from the cache, without a new request', async () => {
        const fetchMock = stubFetchByFlow();

        const { rerender } = render(<Value config={kpi('https://example.org/rest/data/A,A,1.0/all')} language="en" />);
        await screen.findByText('111');

        rerender(<Value config={kpi('https://example.org/rest/data/A,A,1.0/all', 'Renamed')} language="en" />);
        await screen.findByText('Renamed');
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});
