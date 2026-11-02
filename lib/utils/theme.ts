import type { EChartsOption } from 'echarts';
import type { SDMXTheme } from '../components/types';

/**
 * Locale used for number formatting: the theme's numberFormat.locale when
 * set, otherwise the component language.
 */
export const resolveNumberLocale = (theme: SDMXTheme | undefined, language: string): string =>
    theme?.numberFormat?.locale || language;

/**
 * ECharts options derived from a theme. They are merged under the built
 * chart option, so everything the chart sets itself (per-series colours
 * from a colorPalette, title fonts from the title config) and extraOptions
 * win, and the active ECharts theme (dark mode included) supplies whatever
 * the theme leaves unset.
 */
export const themeChartOptions = (theme: SDMXTheme | undefined): EChartsOption => {
    const options: EChartsOption = {};
    if (!theme) {
        return options;
    }
    if (theme.palette && theme.palette.length > 0) {
        options.color = theme.palette;
    }
    if (theme.fontFamily?.data) {
        options.textStyle = { fontFamily: theme.fontFamily.data };
    }
    if (theme.fontFamily?.display) {
        options.title = {
            textStyle: { fontFamily: theme.fontFamily.display },
            subtextStyle: { fontFamily: theme.fontFamily.display },
        };
    }
    return options;
};
