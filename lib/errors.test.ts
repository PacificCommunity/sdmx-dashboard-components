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
