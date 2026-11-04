import { describe, it, expect } from 'vitest';
import { SDMXRenderError, toSDMXRenderError } from './errors';

describe('toSDMXRenderError', () => {
    it('stamps the visual id on SDMXRenderError instances and passes them through', () => {
        const original = new SDMXRenderError('ERR_AMBIGUOUS_SERIES', 'msg');
        const result = toSDMXRenderError(original, 'vis-1');
        expect(result).toBe(original);
        expect(result.visualId).toBe('vis-1');
    });

    it('keeps an already stamped visual id', () => {
        const original = new SDMXRenderError('ERR_EMPTY', 'msg', { visualId: 'inner' });
        expect(toSDMXRenderError(original, 'outer').visualId).toBe('inner');
    });

    it.each([
        // parser non-2xx, wrapped by the parser as Error(err)
        'Error: Error while fetching data please provide valid api url',
        // network failures across runtimes
        'TypeError: fetch failed',
        'TypeError: Failed to fetch',
        'TypeError: NetworkError when attempting to fetch resource.',
    ])('classifies "%s" as ERR_FETCH', (message) => {
        const result = toSDMXRenderError(new Error(message), 'vis-1');
        expect(result.code).toBe('ERR_FETCH');
        expect(result.visualId).toBe('vis-1');
    });

    it.each([
        'SyntaxError: Unexpected token < in JSON at position 0',
        'SyntaxError: Unexpected end of JSON input',
        '"[object Object]" is not valid JSON',
        // parser reader crash on an unexpected response shape
        "TypeError: Cannot read properties of undefined (reading '0')",
        'Error: Name not found',
        'Error: Dimensions not found',
    ])('classifies "%s" as ERR_PARSE', (message) => {
        expect(toSDMXRenderError(new Error(message), 'vis-1').code).toBe('ERR_PARSE');
    });

    it('classifies the parser empty-observations message as ERR_EMPTY', () => {
        const result = toSDMXRenderError(new Error('Error: Series not found and observations empty'), 'vis-1');
        expect(result.code).toBe('ERR_EMPTY');
    });

    it('classifies the parser NO_RECORDS error as ERR_EMPTY with the zero-observations message', () => {
        const original = Object.assign(new Error('No records found for the requested query'), { code: 'NO_RECORDS' });
        const result = toSDMXRenderError(original, 'vis-1');
        expect(result.code).toBe('ERR_EMPTY');
        expect(result.visualId).toBe('vis-1');
        expect(result.message).toContain('The data query for visual vis-1 returned zero observations.');
        expect(result.cause).toBe(original);
    });

    it.each([
        'No records found',
        // re-wrapped by the parser as Error(err): the code is lost
        'Error: No records found (HTTP 404 NoRecordsFound)',
    ])('classifies "%s" as ERR_EMPTY by message', (message) => {
        expect(toSDMXRenderError(new Error(message), 'vis-1').code).toBe('ERR_EMPTY');
    });

    it('keeps a 404 without the no-records signature as ERR_FETCH', () => {
        const result = toSDMXRenderError(new Error('Error: Error while fetching data please provide valid api url'), 'vis-1');
        expect(result.code).toBe('ERR_FETCH');
    });

    it('falls back to ERR_ENGINE and keeps the original as cause', () => {
        const original = new Error('something exploded in the renderer');
        const result = toSDMXRenderError(original, 'vis-1');
        expect(result.code).toBe('ERR_ENGINE');
        expect(result.cause).toBe(original);
    });

    it('handles non-Error throwables', () => {
        const result = toSDMXRenderError('plain string failure', 'vis-1');
        expect(result).toBeInstanceOf(SDMXRenderError);
        expect(result.message).toBe('plain string failure');
    });
});
