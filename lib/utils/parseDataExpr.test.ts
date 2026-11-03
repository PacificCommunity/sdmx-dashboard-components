import { describe, it, expect } from 'vitest';
import { parseDataExpr } from './parseDataExpr';

describe('parseDataExpr', () => {
    it('keeps dataFlowUrl a string for an expression with an operator', () => {
        const [parsed] = parseDataExpr(
            'https://www.ilo.org/sdmx/rest/data/ILO,DF_EES_TEES_SEX_MJH_NB,1.0/CHL.A..SEX_T.MJH_AGGREGATE_MULTI?endPeriod=2022&lastNObservations=1 * {UNIT_MULT}'
        );

        expect(parsed.operator).toBe('expr');
        expect(parsed.exprOperand).toEqual(['{UNIT_MULT}']);
        expect(typeof parsed.dataFlowUrl).toBe('string');
        expect(parsed.dataFlowUrl).toBe(
            'https://www.ilo.org/sdmx/rest/data/ILO,DF_EES_TEES_SEX_MJH_NB,1.0/CHL.A..SEX_T.MJH_AGGREGATE_MULTI?endPeriod=2022&lastNObservations=1'
        );
    });

    it('keeps dataFlowUrl a string for a plain URL', () => {
        const [parsed] = parseDataExpr('https://example.org/rest/data/X,Y,1.0/all');

        expect(typeof parsed.dataFlowUrl).toBe('string');
        expect(parsed.operator).toBeUndefined();
    });
});
