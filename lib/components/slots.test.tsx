// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import Chart from './chart';
import Table from './table';
import Value from './value';
import Dashboard from './dashboard';
import type { SDMXChartConfig, SDMXDashboardConfig } from './types';
import { SDMXRenderError } from '../errors';

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

const config = (): SDMXChartConfig => ({
    id: 'slot-chart',
    type: 'line',
    xAxisConcept: 'TIME_PERIOD',
    data: 'https://example.org/rest/data/X,Y,1.0/all'
});

// 2.0 response with zero observations: the visual raises ERR_EMPTY
const emptyResponse = () => ({
    data: {
        structures: [
            {
                name: 'Test flow',
                names: { en: 'Test flow' },
                dimensions: {
                    dataSet: [],
                    series: [],
                    observation: [
                        { id: 'TIME_PERIOD', name: 'Time', keyPosition: 0, values: [] }
                    ]
                },
                attributes: { dataSet: [], dimensionGroup: [], series: [], observation: [] }
            }
        ],
        dataSets: [{ action: 'Information', observations: {} }]
    }
});

const stubPendingFetch = () => vi.stubGlobal('fetch', vi.fn(() => new Promise(() => { /* keep pending */ })));
const stubFailingFetch = () => vi.stubGlobal('fetch', vi.fn(async () => {
    throw new TypeError('fetch failed');
}));
const stubEmptyFetch = () => vi.stubGlobal('fetch', vi.fn(async () => ({
    status: 200,
    text: async () => JSON.stringify(emptyResponse())
})));

const loadingSlot = (visualId: string) => <div data-testid="custom-loading">{`spinner for ${visualId}`}</div>;
const emptySlot = (visualId: string) => <div data-testid="custom-empty">{`no data for ${visualId}`}</div>;
const errorSlot = (error: SDMXRenderError) => <div data-testid="custom-error">{error.code}</div>;

describe('render slots on the chart', () => {
    it('renderLoading replaces the built-in loading state', () => {
        stubPendingFetch();
        render(<Chart config={config()} language="en" renderLoading={loadingSlot} />);
        expect(screen.getByTestId('custom-loading').textContent).toBe('spinner for slot-chart');
        expect(screen.queryByText('Loading...')).toBeNull();
    });

    it('renderError replaces the built-in alert and receives the typed error', async () => {
        stubFailingFetch();
        let received: SDMXRenderError | undefined;
        render(
            <Chart
                config={config()}
                language="en"
                renderError={(error) => {
                    received = error;
                    return errorSlot(error);
                }}
            />
        );
        const custom = await screen.findByTestId('custom-error');
        expect(custom.textContent).toBe('ERR_FETCH');
        expect(received?.visualId).toBe('slot-chart');
        expect(screen.queryByRole('alert')).toBeNull();
    });

    it('renderEmpty takes precedence over renderError for empty results', async () => {
        stubEmptyFetch();
        render(<Chart config={config()} language="en" renderEmpty={emptySlot} renderError={errorSlot} />);
        const custom = await screen.findByTestId('custom-empty');
        expect(custom.textContent).toBe('no data for slot-chart');
        expect(screen.queryByTestId('custom-error')).toBeNull();
    });

    it('renderError receives ERR_EMPTY when no renderEmpty is given', async () => {
        stubEmptyFetch();
        render(<Chart config={config()} language="en" renderError={errorSlot} />);
        expect((await screen.findByTestId('custom-error')).textContent).toBe('ERR_EMPTY');
    });

    it('defaults keep the built-in loading text and alert when no slot is given', async () => {
        stubFailingFetch();
        render(<Chart config={config()} language="en" />);
        expect(screen.getByText('Loading...')).toBeTruthy();
        const alert = await screen.findByRole('alert');
        expect(alert.getAttribute('data-error-code')).toBe('ERR_FETCH');
    });
});

describe('render slots on the table and the value', () => {
    it('the table uses renderLoading and renderError', async () => {
        stubFailingFetch();
        render(<Table config={{ ...config(), type: 'table' }} language="en" renderLoading={loadingSlot} renderError={errorSlot} />);
        expect(screen.getByTestId('custom-loading')).toBeTruthy();
        expect((await screen.findByTestId('custom-error')).textContent).toBe('ERR_FETCH');
        expect(screen.queryByRole('alert')).toBeNull();
    });

    it('the value uses renderLoading and renderEmpty', async () => {
        stubEmptyFetch();
        render(<Value config={{ ...config(), type: 'value' }} language="en" renderLoading={loadingSlot} renderEmpty={emptySlot} />);
        expect(screen.getByTestId('custom-loading')).toBeTruthy();
        expect((await screen.findByTestId('custom-empty')).textContent).toBe('no data for slot-chart');
    });
});

describe('render slots on the dashboard', () => {
    it('threads the slots through every cell', async () => {
        stubFailingFetch();
        const dashboardConfig: SDMXDashboardConfig = {
            id: 'slots-dashboard',
            rows: [{ columns: [config(), { ...config(), id: 'slot-value', type: 'value' }] }],
        };
        render(<Dashboard config={dashboardConfig} renderError={(error) => <div data-testid={`err-${error.visualId}`}>{error.code}</div>} />);
        expect((await screen.findByTestId('err-slot-chart')).textContent).toBe('ERR_FETCH');
        expect((await screen.findByTestId('err-slot-value')).textContent).toBe('ERR_FETCH');
        expect(screen.queryByRole('alert')).toBeNull();
    });
});
