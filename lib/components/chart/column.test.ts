import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildChartOptionFromDatasets, loadDatasets } from './options';
import type { ParsedDataset } from '../../utils/chartHelpers';
import type { SDMXChartConfig } from '../types';

afterEach(() => {
    vi.unstubAllGlobals();
});

const config: SDMXChartConfig = {
    id: 'column-series-order',
    type: 'column',
    xAxisConcept: 'GEO_PICT',
    legend: { concept: 'URBANIZATION' },
    data: 'https://example.org/rest/data/X,Y,1.0/all'
};

// The source lists Urban before Rural. `order` says the same; the codes sort
// the other way (R before U).
const dataset = (withOrder: boolean): ParsedDataset => ({
    datasetIndex: 0,
    dimensions: [
        {
            id: 'GEO_PICT',
            name: 'Country',
            keyPosition: 0,
            values: [{ id: 'FJ', name: 'Fiji' }]
        },
        {
            id: 'URBANIZATION',
            name: 'Urbanization',
            keyPosition: 1,
            values: [
                { id: 'U', name: 'Urban', ...(withOrder ? { order: 1 } : {}) },
                { id: 'R', name: 'Rural', ...(withOrder ? { order: 2 } : {}) }
            ]
        }
    ],
    data: [
        { GEO_PICT: 'Fiji', URBANIZATION: 'Urban', value: 60 },
        { GEO_PICT: 'Fiji', URBANIZATION: 'Rural', value: 40 }
    ]
});

const seriesNames = (withOrder: boolean) => {
    const option = buildChartOptionFromDatasets(config, 'en', [dataset(withOrder)]).option;
    return (option.series as unknown as Array<{ name: string }>).map((series) => series.name);
};

// The dimension values' `order` contradicts the ORDER annotations on purpose:
// Urban is order 2 but annotation 10, Rural is order 1 but annotation 20.
const annotatedResponse = () => ({
    data: {
        structures: [{
            name: 'Test flow',
            names: { en: 'Test flow' },
            annotations: [
                { type: 'ORDER', text: '20' },
                { type: 'ORDER', text: '10' },
            ],
            dimensions: {
                dataSet: [] as unknown[],
                series: [] as unknown[],
                observation: [
                    {
                        id: 'GEO_PICT',
                        name: 'Country',
                        keyPosition: 0,
                        values: [{ id: 'FJ', name: 'Fiji' }]
                    },
                    {
                        id: 'URBANIZATION',
                        name: 'Urbanization',
                        keyPosition: 1,
                        values: [
                            { id: 'U', name: 'Urban', order: 2, annotations: [1] },
                            { id: 'R', name: 'Rural', order: 1, annotations: [0] }
                        ]
                    }
                ]
            },
            attributes: { dataSet: [] as unknown[], dimensionGroup: [] as unknown[], series: [] as unknown[], observation: [] as unknown[] }
        }],
        dataSets: [{
            action: 'Information',
            observations: { '0:0': [60], '0:1': [40] }
        }]
    }
});

describe('column series order', () => {
    it('sorts series by the SDMX order when present', () => {
        expect(seriesNames(true)).toEqual(['Urban', 'Rural']);
    });

    it('falls back to the dimension value id when order is absent', () => {
        expect(seriesNames(false)).toEqual(['Rural', 'Urban']);
    });

    it('prefers the ORDER annotation carried by the loaded structure', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => ({
            status: 200,
            text: async () => JSON.stringify(annotatedResponse())
        })));
        const datasets = await loadDatasets(config, 'en');
        const option = buildChartOptionFromDatasets(config, 'en', datasets).option;
        const names = (option.series as unknown as Array<{ name: string }>).map((series) => series.name);
        expect(names).toEqual(['Urban', 'Rural']);
    });
});
