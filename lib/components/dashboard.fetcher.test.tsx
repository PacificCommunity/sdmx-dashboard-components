// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import Dashboard from './dashboard';
import { SDMXRenderError } from '../errors';

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

const CONFIG_URL = 'https://original.example/config.json';

describe('SDMXDashboard fetcher prop', () => {
    it('loads the config url through the provided fetcher, never through the global fetch', async () => {
        const globalFetch = vi.fn();
        vi.stubGlobal('fetch', globalFetch);

        const config = { id: 'test-dashboard', rows: [] };
        const fetcher = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify(config)));

        render(<Dashboard url={CONFIG_URL} fetcher={fetcher} />);

        await waitFor(() => {
            expect(fetcher).toHaveBeenCalledWith(CONFIG_URL);
        });
        await waitFor(() => {
            expect(screen.queryByText('Loading...')).toBeNull();
        });
        expect(globalFetch).not.toHaveBeenCalled();
    });

    it('falls back to the global fetch when no fetcher is given', async () => {
        const config = { id: 'test-dashboard', rows: [] };
        const globalFetch = vi.fn(async () => new Response(JSON.stringify(config)));
        vi.stubGlobal('fetch', globalFetch);

        render(<Dashboard url={CONFIG_URL} />);

        await waitFor(() => {
            expect(globalFetch).toHaveBeenCalledWith(CONFIG_URL);
        });
    });
});

describe('SDMXDashboard config url failures', () => {
    it('a non-2xx response is reported as ERR_FETCH naming the url and the status', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
        const fetcher = vi.fn(async () => new Response('missing', { status: 404, statusText: 'Not Found' }));

        render(<Dashboard url={CONFIG_URL} fetcher={fetcher} />);

        const alert = await screen.findByRole('alert');
        expect(alert.className).toContain('sdmx-render-error');
        expect(alert.className).toContain('text-danger');
        expect(alert.getAttribute('data-error-code')).toBe('ERR_FETCH');
        expect(alert.textContent).toContain(CONFIG_URL);
        expect(alert.textContent).toContain('HTTP 404');
        expect(screen.queryByText('Loading...')).toBeNull();
        const reported = consoleError.mock.calls[0][0] as SDMXRenderError;
        expect(reported).toBeInstanceOf(SDMXRenderError);
        expect(reported.visualId).toBeUndefined();
        expect(reported.detail).toEqual({ url: CONFIG_URL, status: 404 });
    });

    it('a body that is not JSON is reported as ERR_PARSE', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
        const fetcher = vi.fn(async () => new Response('<html>login</html>', { status: 200 }));

        render(<Dashboard url={CONFIG_URL} fetcher={fetcher} />);

        const alert = await screen.findByRole('alert');
        expect(alert.getAttribute('data-error-code')).toBe('ERR_PARSE');
        expect(alert.textContent).toContain(CONFIG_URL);
        expect((consoleError.mock.calls[0][0] as SDMXRenderError).detail).toEqual({ url: CONFIG_URL, status: 200 });
    });

    it('a network failure is reported as ERR_FETCH', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
        const fetcher = vi.fn(async () => {
            throw new TypeError('Failed to fetch');
        });

        render(<Dashboard url={CONFIG_URL} fetcher={fetcher} />);

        const alert = await screen.findByRole('alert');
        expect(alert.getAttribute('data-error-code')).toBe('ERR_FETCH');
        expect(alert.textContent).toContain(CONFIG_URL);
        expect(alert.textContent).toContain('Failed to fetch');
        expect((consoleError.mock.calls[0][0] as SDMXRenderError).detail).toEqual({ url: CONFIG_URL });
    });

    it('renders the failure through the renderError slot when given', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const fetcher = vi.fn(async () => new Response('', { status: 500 }));

        render(
            <Dashboard
                url={CONFIG_URL}
                fetcher={fetcher}
                renderError={(error) => <p data-testid="custom-error">{error.code}: {String(error.detail?.status)}</p>}
            />
        );

        expect((await screen.findByTestId('custom-error')).textContent).toBe('ERR_FETCH: 500');
        expect(screen.queryByRole('alert')).toBeNull();
    });

    it('a new url clears the error and loads the dashboard', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const goodUrl = 'https://original.example/good.json';
        const fetcher = vi.fn(async (url: string) => url === goodUrl
            ? new Response(JSON.stringify({ id: 'recovered', rows: [], header: { title: { text: 'Recovered dashboard' } } }))
            : new Response('', { status: 404 }));

        const { rerender } = render(<Dashboard url={CONFIG_URL} fetcher={fetcher} />);
        await screen.findByRole('alert');

        rerender(<Dashboard url={goodUrl} fetcher={fetcher} />);

        await screen.findByText('Recovered dashboard');
        expect(screen.queryByRole('alert')).toBeNull();
    });
});
