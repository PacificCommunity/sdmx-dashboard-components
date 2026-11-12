// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import App from './App';

vi.mock('./components/ConfigPreview', () => ({
    default: () => React.createElement('div', { 'data-testid': 'config-preview' }),
}));

afterEach(cleanup);

describe('App', () => {
    it('shows the Try your own tab and its component', () => {
        render(
            <MemoryRouter initialEntries={['/preview']}>
                <Routes>
                    <Route path="/:active_tab" element={<App />} />
                </Routes>
            </MemoryRouter>
        );
        expect(screen.getByRole('link', { name: 'Try your own' })).toBeTruthy();
        expect(screen.getByTestId('config-preview')).toBeTruthy();
    });
});
