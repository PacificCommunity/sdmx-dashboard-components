import { describe, it, expect } from 'vitest';
import { resolveNumberLocale, themeChartOptions } from './theme';

describe('resolveNumberLocale', () => {
    it('prefers the theme number locale over the component language', () => {
        expect(resolveNumberLocale({ numberFormat: { locale: 'fr-FR' } }, 'en')).toBe('fr-FR');
    });
    it('falls back to the component language', () => {
        expect(resolveNumberLocale(undefined, 'en')).toBe('en');
        expect(resolveNumberLocale({ palette: ['#000'] }, 'en')).toBe('en');
    });
});

describe('themeChartOptions', () => {
    it('returns an empty object for no theme', () => {
        expect(themeChartOptions(undefined)).toEqual({});
    });

    it('maps palette and fonts to ECharts options', () => {
        expect(themeChartOptions({
            palette: ['#111', '#222'],
            fontFamily: { display: 'Georgia', data: 'Inter' },
        })).toEqual({
            color: ['#111', '#222'],
            textStyle: { fontFamily: 'Inter' },
            title: { textStyle: { fontFamily: 'Georgia' }, subtextStyle: { fontFamily: 'Georgia' } },
        });
    });

    it('omits keys for unset theme fields', () => {
        expect(themeChartOptions({ palette: ['#111'], numberFormat: { locale: 'de' } })).toEqual({ color: ['#111'] });
    });
});
