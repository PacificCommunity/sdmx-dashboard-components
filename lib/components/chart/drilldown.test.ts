import { describe, it, expect } from 'vitest';
import { buildChartOptionFromDatasets } from './options';
import type { BuiltChart, ParsedDataset } from '../../utils/chartHelpers';
import type { SDMXChartConfig } from '../types';

type RootSeries = {
    name: string;
    data: Array<{ name: string, value: number | null, drilldownId?: string }>;
};

type ChildOption = {
    xAxis: { data: string[] };
    series: Array<{
        type: string;
        name: string;
        itemStyle?: { color?: string };
        data: Array<{ name: string, value: number | null, itemStyle?: { color?: string } }>;
    }>;
};

const dimensions = (
    drilldownConcept: string,
    drilldownValues: string[],
    legendValues: string[]
) => {
    const dims = [
        {
            id: 'GEO_PICT',
            name: 'Country',
            keyPosition: 0,
            values: [{ id: 'FJ', name: 'Fiji' }, { id: 'WS', name: 'Samoa' }]
        },
        {
            id: 'SEX',
            name: 'Sex',
            keyPosition: 1,
            values: legendValues.map((name) => ({ id: name, name }))
        },
        {
            id: drilldownConcept,
            name: drilldownConcept,
            keyPosition: 2,
            values: drilldownValues.map((name) => ({ id: name, name }))
        }
    ];
    if (drilldownConcept === 'TIME_PERIOD') {
        dims[2].values = drilldownValues.map((name) => ({ id: name, name, start: name })) as typeof dims[2]['values'];
    }
    return dims;
};

const timeConfig: SDMXChartConfig = {
    id: 'drilldown-time',
    type: 'drilldown',
    xAxisConcept: 'GEO_PICT',
    legend: { concept: 'SEX' },
    drilldown: { xAxisConcept: 'TIME_PERIOD' },
    data: 'https://example.org/rest/data/X,Y,1.0/all'
};

const ageConfig: SDMXChartConfig = {
    ...timeConfig,
    id: 'drilldown-age',
    drilldown: { xAxisConcept: 'AGE' }
};

// Fiji and Samoa, two sexes, two periods; periods differ in coverage between
// the sexes when `uneven` is set.
const timeDataset = (uneven = false): ParsedDataset => {
    const periods = uneven ? ['2020', '2021'] : ['2020', '2021'];
    const data: ParsedDataset['data'] = [];
    ['Fiji', 'Samoa'].forEach((country, countryIndex) => {
        ['F', 'M'].forEach((sex) => {
            periods.forEach((period, periodIndex) => {
                if (uneven && sex === 'M' && period === '2020') return;
                data.push({
                    GEO_PICT: country,
                    SEX: sex,
                    TIME_PERIOD: period,
                    value: (countryIndex + 1) * 100 + (sex === 'M' ? 10 : 0) + periodIndex
                });
            });
        });
    });
    return {
        datasetIndex: 0,
        dimensions: dimensions('TIME_PERIOD', periods, ['F', 'M']),
        data
    };
};

// No TIME_PERIOD dimension: the drilldown over AGE uses each series' Total row
// as the root and shows the non-Total breakdown in the child.
const ageDataset = (): ParsedDataset => {
    const data: ParsedDataset['data'] = [];
    ['Fiji', 'Samoa'].forEach((country, countryIndex) => {
        ['F', 'M'].forEach((sex) => {
            [
                { AGE: 'Total', share: 100 },
                { AGE: '0-14', share: 30 },
                { AGE: '15+', share: 70 }
            ].forEach(({ AGE, share }) => {
                data.push({
                    GEO_PICT: country,
                    SEX: sex,
                    AGE,
                    value: (countryIndex + 1) * share + (sex === 'M' ? 10 : 0)
                });
            });
        });
    });
    return {
        datasetIndex: 0,
        dimensions: dimensions('AGE', ['Total', '0-14', '15+'], ['F', 'M']),
        data
    };
};

const childFor = (built: BuiltChart, category: string) => {
    const rootSeries = built.option.series as unknown as RootSeries[];
    const ids = new Set<string>();
    rootSeries.forEach((series) => {
        const point = series.data.find((entry) => entry.name === category);
        if (point?.drilldownId) ids.add(point.drilldownId);
    });
    const [id] = Array.from(ids);
    return { ids: Array.from(ids), child: built.drilldown?.options?.[id] as unknown as ChildOption | undefined };
};

describe('drilldown with several legend series', () => {
    it('opens one child chart per category that carries every legend series', () => {
        const built = buildChartOptionFromDatasets(timeConfig, 'en', [timeDataset()]);
        const { ids, child } = childFor(built, 'Fiji');

        expect(ids).toHaveLength(1);
        expect(child?.series.map((series) => series.name)).toEqual(['F', 'M']);
        expect(child?.series.every((series) => series.type === 'line')).toBe(true);
        expect(child?.xAxis.data).toEqual(['2020', '2021']);
        expect(child?.series.map((series) => series.data.map((point) => point.value))).toEqual([
            [100, 101],
            [110, 111]
        ]);
    });

    it('fills periods a series does not cover with null', () => {
        const built = buildChartOptionFromDatasets(timeConfig, 'en', [timeDataset(true)]);
        const { child } = childFor(built, 'Fiji');

        expect(child?.xAxis.data).toEqual(['2020', '2021']);
        expect(child?.series.map((series) => series.data.map((point) => point.value))).toEqual([
            [100, 101],
            [null, 111]
        ]);
    });

    it('colours each series by the legend palette instead of by period', () => {
        const config: SDMXChartConfig = {
            ...timeConfig,
            colorPalette: {
                SEX: { F: '#111111', M: '#222222' },
                TIME_PERIOD: { '2020': '#444444', '2021': '#555555' }
            }
        };
        const { child } = childFor(buildChartOptionFromDatasets(config, 'en', [timeDataset()]), 'Fiji');

        expect(child?.series.map((series) => series.itemStyle?.color)).toEqual(['#111111', '#222222']);
        expect(child?.series.every((series) => series.data.every((point) => point.itemStyle === undefined))).toBe(true);
    });

    it('carries every legend series into a non-time drilldown too', () => {
        const built = buildChartOptionFromDatasets(ageConfig, 'en', [ageDataset()]);
        const { ids, child } = childFor(built, 'Fiji');

        expect(ids).toHaveLength(1);
        expect(child?.series.map((series) => series.name)).toEqual(['F', 'M']);
        expect(child?.series.every((series) => series.type === 'bar')).toBe(true);
        expect(child?.xAxis.data).toEqual(['0-14', '15+']);
        expect(child?.series.map((series) => series.data.map((point) => point.value))).toEqual([
            [30, 70],
            [40, 80]
        ]);
    });
});
