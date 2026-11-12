import { describe, it, expect } from 'vitest';
import { buildChartOptionFromDatasets } from './options';
import type { ParsedDataset } from '../../utils/chartHelpers';
import type { SDMXChartConfig } from '../types';

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

describe('column series order', () => {
    it('sorts series by the SDMX order when present', () => {
        expect(seriesNames(true)).toEqual(['Urban', 'Rural']);
    });

    it('falls back to the dimension value id when order is absent', () => {
        expect(seriesNames(false)).toEqual(['Rural', 'Urban']);
    });
});
