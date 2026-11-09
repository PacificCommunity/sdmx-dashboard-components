// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, fireEvent, waitFor, cleanup, screen } from '@testing-library/react';
import ConfigPreview from './ConfigPreview';

vi.mock('../../lib', () => ({
    SDMXChart: (props: {
        config: {
            id?: string;
            extraOptions?: { tooltip?: { formatter?: unknown } };
        };
    }) => {
        const formatter = props.config.extraOptions?.tooltip?.formatter;
        return React.createElement('div', {
            'data-testid': 'chart',
            'data-id': props.config.id,
            'data-formatter-type': typeof formatter,
            'data-formatter-result': typeof formatter === 'function'
                ? (formatter as (params: unknown) => string)({
                    name: 'Fiji',
                    value: 12,
                    marker: '',
                    data: { TIME_PERIOD: '2020' },
                })
                : '',
        });
    },
}));

afterEach(cleanup);

const baseConfig = {
    id: 'demo',
    type: 'line',
    xAxisConcept: 'TIME_PERIOD',
    data: 'https://example.org/data',
};

const valid = JSON.stringify(baseConfig);

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

    it('compiles a function-source tooltip formatter', async () => {
        render(<ConfigPreview />);
        paste(JSON.stringify({
            ...baseConfig,
            extraOptions: {
                tooltip: {
                    formatter: 'function (p) { return p.name + "!"; }',
                },
            },
        }));
        await waitFor(() => expect(screen.queryByTestId('chart')).toBeTruthy());
        const chart = screen.getByTestId('chart');
        expect(chart.getAttribute('data-formatter-type')).toBe('function');
        expect(chart.getAttribute('data-formatter-result')).toBe('Fiji!');
    });

    it('leaves a tooltip template string as a string', async () => {
        render(<ConfigPreview />);
        paste(JSON.stringify({
            ...baseConfig,
            extraOptions: {
                tooltip: {
                    formatter: '{b}: {c}',
                },
            },
        }));
        await waitFor(() => expect(screen.queryByTestId('chart')).toBeTruthy());
        expect(screen.getByTestId('chart').getAttribute('data-formatter-type')).toBe('string');
    });
});
