// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import Dashboard from './dashboard';

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe('SDMXDashboard fetcher prop', () => {
    it('loads the config url through the provided fetcher, never through the global fetch', async () => {
        const globalFetch = vi.fn();
        vi.stubGlobal('fetch', globalFetch);

        const config = { id: 'test-dashboard', rows: [] };
        const fetcher = vi.fn(async (_url: string, _init?: RequestInit) => {
            return { json: async () => config } as Response;
        });

        render(<Dashboard url="https://original.example/config.json" fetcher={fetcher} />);

        await waitFor(() => {
            expect(fetcher).toHaveBeenCalledWith('https://original.example/config.json');
        });
        await waitFor(() => {
            expect(screen.queryByText('Loading...')).toBeNull();
        });
        expect(globalFetch).not.toHaveBeenCalled();
    });

    it('falls back to the global fetch when no fetcher is given', async () => {
        const config = { id: 'test-dashboard', rows: [] };
        const globalFetch = vi.fn(async () => {
            return { json: async () => config } as unknown as Response;
        });
        vi.stubGlobal('fetch', globalFetch);

        render(<Dashboard url="https://original.example/config.json" />);

        await waitFor(() => {
            expect(globalFetch).toHaveBeenCalledWith('https://original.example/config.json');
        });
    });
});
