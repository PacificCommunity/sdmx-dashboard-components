import { describe, it, expect, vi, beforeEach } from 'vitest';

// records the options every parser instance receives
const calls = vi.hoisted(() => [] as Array<{ url: string; headers: Headers }>);

vi.mock('sdmx-json-parser', () => {
  class SDMXParser {
    async getDatasets(url: string, options: { headers: Headers }) {
      calls.push({ url, headers: options.headers });
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
import { dataRequestHeaders } from './requestHeaders';

beforeEach(() => {
  calls.length = 0;
});

describe('data request headers', () => {
  it('sets Accept-Language and no Accept', () => {
    const headers = dataRequestHeaders('fr');
    expect(headers.get('accept-language')).toBe('fr');
    expect(headers.has('accept')).toBe(false);
  });

  it('chart and table loads leave Accept to the parser', async () => {
    await loadDatasets({ id: 'test', data: 'https://example.org/rest/data/X,Y,1.0/all', xAxisConcept: 'TIME_PERIOD' }, 'en');
    expect(calls).toHaveLength(1);
    expect(calls[0].headers.has('accept')).toBe(false);
    expect(calls[0].headers.get('accept-language')).toBe('en');
  });

  it('expression operands leave Accept to the parser', async () => {
    const scope: Record<string, unknown> = {};
    await Promise.all(fetchDataExprOperand(
      ['https://example.org/rest/data/Z,Z,1.0/all'],
      [{ value: 2 }],
      scope,
      [],
      'en'
    ));
    expect(calls).toHaveLength(1);
    expect(calls[0].headers.has('accept')).toBe(false);
    expect(scope.x1).toEqual([1]);
  });
});
