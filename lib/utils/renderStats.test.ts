import { describe, it, expect } from 'vitest';
import { computeRenderStats } from './renderStats';

describe('computeRenderStats', () => {
    it('counts observations and series and ranges TIME_PERIOD', () => {
        const data = [
            { TIME_PERIOD: '2021', GEO_PICT: 'Fiji', value: 1 },
            { TIME_PERIOD: '2019', GEO_PICT: 'Fiji', value: 2 },
            { TIME_PERIOD: '2020', GEO_PICT: 'Samoa', value: 3 }
        ];
        expect(computeRenderStats(data, 2)).toEqual({
            observationCount: 3,
            seriesCount: 2,
            timePeriodRange: ['2019', '2021']
        });
    });

    it('omits the time range when rows carry no TIME_PERIOD', () => {
        const data = [{ GEO_PICT: 'Fiji', value: 1 }];
        expect(computeRenderStats(data, 1)).toEqual({
            observationCount: 1,
            seriesCount: 1
        });
    });
});
