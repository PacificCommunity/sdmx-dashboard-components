// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import Dashboard from './dashboard';
import type { SDMXDashboardConfig, SDMXVisualConfig } from './types';

afterEach(() => {
    cleanup();
});

// note cells need no data, so the dashboard renders without any fetch
const note = (id: string, text: string) => ({ id, type: 'note', note: { text } }) as unknown as SDMXVisualConfig;

describe('rows[].colums deprecated alias', () => {
    it('renders cells declared under the misspelled `colums` key', async () => {
        const config: SDMXDashboardConfig = {
            id: 'dash-alias',
            rows: [{ colums: [note('note-1', 'Hello from colums')] }]
        };

        render(<Dashboard config={config} lang="en" />);

        await waitFor(() => {
            expect(screen.getByText('Hello from colums')).toBeTruthy();
        });
    });

    it('renders cells declared under the correct `columns` key', async () => {
        const config: SDMXDashboardConfig = {
            id: 'dash-correct',
            rows: [{ columns: [note('note-2', 'Hello from columns')] }]
        };

        render(<Dashboard config={config} lang="en" />);

        await waitFor(() => {
            expect(screen.getByText('Hello from columns')).toBeTruthy();
        });
    });

    it('renders a row with neither key as empty', async () => {
        const config: SDMXDashboardConfig = {
            id: 'dash-empty-row',
            rows: [{}, { columns: [note('note-3', 'After an empty row')] }]
        };

        render(<Dashboard config={config} lang="en" />);

        await waitFor(() => {
            expect(screen.getByText('After an empty row')).toBeTruthy();
        });
    });
});
