import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildChartOptionFromDatasets, loadDatasets } from './options';
import type { SDMXChartConfig } from '../types';

afterEach(() => {
    vi.unstubAllGlobals();
});

// tiles per country; INDICATOR and TIME_PERIOD hold a single value
const countriesResponse = (withOtherDimensions = true) => ({
    data: {
        structures: [
            {
                name: 'Test flow',
                names: { en: 'Test flow' },
                dimensions: {
                    dataSet: [],
                    series: [],
                    observation: [
                        { id: 'GEO_PICT', name: 'Country', keyPosition: 0, values: [{ id: 'FJ', name: 'Fiji' }, { id: 'WS', name: 'Samoa' }] },
                        ...(withOtherDimensions ? [
                            { id: 'INDICATOR', name: 'Indicator', keyPosition: 1, values: [{ id: 'POP', name: 'Population' }] },
                            { id: 'TIME_PERIOD', name: 'Time', keyPosition: 2, values: [{ id: '2021', name: '2021' }] },
                        ] : []),
                    ]
                },
                attributes: { dataSet: [], dimensionGroup: [], series: [], observation: [] }
            }
        ],
        dataSets: [{
            action: 'Information',
            observations: withOtherDimensions ? { '0:0:0': [900000], '1:0:0': [200000] } : { '0': [900000], '1': [200000] }
        }]
    }
});

const treemapConfig: SDMXChartConfig = {
    id: 'test-treemap',
    type: 'treemap',
    xAxisConcept: 'GEO_PICT',
    data: 'https://example.org/rest/data/X,Y,1.0/all?dimensionAtObservation=AllDimensions'
};

// the ECharts option built from the response, as the Chart component builds it
const buildFrom = async (response: object) => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ status: 200, text: async () => JSON.stringify(response) })));
    const datasets = await loadDatasets(treemapConfig.data, treemapConfig.xAxisConcept, 'en');
    return () => buildChartOptionFromDatasets(treemapConfig, 'en', datasets).option;
};

describe('treemap without legend.concept', () => {
    it('draws one tile per category from the single-valued dimension', async () => {
        const option = (await buildFrom(countriesResponse()))();
        const series = option.series as unknown as Array<{ type: string, data: Array<{ name: string, value: number }> }>;
        expect(series).toHaveLength(1);
        expect(series[0].type).toBe('treemap');
        expect(series[0].data.map(({ name, value }) => [name, value])).toEqual([['Fiji', 900000], ['Samoa', 200000]]);
    });

    it('throws a descriptive error when the dataflow has no other dimension', async () => {
        const build = await buildFrom(countriesResponse(false));
        expect(build).toThrow('needs a dimension besides GEO_PICT to group its series');
    });
});
