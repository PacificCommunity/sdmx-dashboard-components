// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, fireEvent, waitFor, cleanup, screen } from '@testing-library/react';
import ConfigPreview from './ConfigPreview';

vi.mock('../../lib', () => ({
    SDMXChart: (props: { config: { id?: string } }) =>
        React.createElement('div', { 'data-testid': 'chart', 'data-id': props.config.id }),
}));

afterEach(cleanup);

const valid = JSON.stringify({
    id: 'demo',
    type: 'line',
    xAxisConcept: 'TIME_PERIOD',
    data: 'https://example.org/data',
});

const paste = (value: string) => {
    fireEvent.change(screen.getByLabelText('Chart config JSON'), { target: { value } });
};

describe('ConfigPreview', () => {
    it('renders a pasted config', async () => {
        render(<ConfigPreview />);
        paste(valid);
        await waitFor(() => expect(screen.queryByTestId('chart')).toBeTruthy());
        expect(screen.getByTestId('chart').getAttribute('data-id')).toBe('demo');
    });

    it('shows an error for invalid JSON and keeps the last good chart', async () => {
        render(<ConfigPreview />);
        paste(valid);
        await waitFor(() => expect(screen.queryByTestId('chart')).toBeTruthy());

        paste('{');
        await waitFor(() => expect(screen.queryByRole('alert')).toBeTruthy());
        expect(screen.getByTestId('chart').getAttribute('data-id')).toBe('demo');
    });

    it('rejects JSON that is not an object', async () => {
        render(<ConfigPreview />);
        paste('[]');
        await waitFor(() => expect(screen.queryByRole('alert')).toBeTruthy());
        expect(screen.queryByTestId('chart')).toBeNull();
    });

    it('rejects an object without a string type', async () => {
        render(<ConfigPreview />);
        paste('{"id":"demo"}');
        await waitFor(() => expect(screen.queryByRole('alert')).toBeTruthy());
        expect(screen.queryByTestId('chart')).toBeNull();
    });

    it('clears the preview for empty input without an error', async () => {
        render(<ConfigPreview />);
        paste(valid);
        await waitFor(() => expect(screen.queryByTestId('chart')).toBeTruthy());

        paste('   ');
        await waitFor(() => expect(screen.queryByTestId('chart')).toBeNull());
        expect(screen.queryByRole('alert')).toBeNull();
    });

    it('loads a valid example config', async () => {
        render(<ConfigPreview />);
        fireEvent.click(screen.getByRole('button', { name: 'Load example' }));
        const textarea = screen.getByLabelText('Chart config JSON') as HTMLTextAreaElement;
        expect((JSON.parse(textarea.value) as { type?: string }).type).toBe('line');
        await waitFor(() => expect(screen.queryByTestId('chart')).toBeTruthy());
    });
});
