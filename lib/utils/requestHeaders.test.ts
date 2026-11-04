import { describe, it, expect, vi, beforeEach } from 'vitest';

// records the options every parser instance receives
const calls = vi.hoisted(() => [] as Array<{ url: string; headers: Headers; fetcher?: unknown }>);

vi.mock('sdmx-json-parser', () => {
  class SDMXParser {
    async getDatasets(url: string, options: { headers: Headers; fetcher?: unknown }) {
      calls.push({ url, headers: options.headers, fetcher: options.fetcher });
    }
    getData() {
      return [{ TIME_PERIOD: '2020', value: 1 }];
    }
    getDimensions() {
      return [];
    }
    getActiveDimensions() {
      return [];
    }
    getAttributes() {
      return [];
    }
  }
  return { SDMXParser };
});

import { loadDatasets } from '../components/chart/options';
import { fetchDataExprOperand } from './parseDataExpr';
import { dataRequestOptions } from './requestHeaders';

beforeEach(() => {
  calls.length = 0;
});

describe('data request headers', () => {
  it('sets Accept-Language and no Accept', () => {
    const { headers, fetcher } = dataRequestOptions('fr');
    expect(headers.get('accept-language')).toBe('fr');
    expect(headers.has('accept')).toBe(false);
    expect(fetcher).toBeUndefined();
  });

  it('chart and table loads leave Accept to the parser and pass the fetcher', async () => {
    const fetcher = vi.fn();
    await loadDatasets({ id: 'v', data: 'https://example.org/rest/data/X,Y,1.0/all', xAxisConcept: 'TIME_PERIOD' }, 'en', fetcher);
    expect(calls).toHaveLength(1);
    expect(calls[0].headers.has('accept')).toBe(false);
    expect(calls[0].headers.get('accept-language')).toBe('en');
    expect(calls[0].fetcher).toBe(fetcher);
  });

  it('expression operands leave Accept to the parser', async () => {
    const scope: Record<string, unknown> = {};
    await Promise.all(fetchDataExprOperand(
      ['https://example.org/rest/data/Z,Z,1.0/all'],
      [{ value: 2 }],
      scope,
      [],
      'en',
      fetch
    ));
    expect(calls).toHaveLength(1);
    expect(calls[0].headers.has('accept')).toBe(false);
    expect(calls[0].fetcher).toBe(fetch);
    expect(scope.x1).toEqual([1]);
  });
});
