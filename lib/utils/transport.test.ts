import { describe, it, expect, vi } from 'vitest';
import { createTransport, FetchTelemetry } from './transport';

const okResponse = (body: string, status = 200) => new Response(body, { status });

describe('createTransport', () => {
    it('deduplicates identical in-flight URLs into one network request', async () => {
        let resolveFetch: (r: Response) => void;
        const base = vi.fn(() => new Promise<Response>((resolve) => { resolveFetch = resolve; }));
        const telemetry: FetchTelemetry[] = [];
        const transport = createTransport(base, (t) => telemetry.push(t));

        const first = transport('https://sdmx.example/data/A');
        const second = transport('https://sdmx.example/data/A');
        resolveFetch!(okResponse('payload'));

        const [r1, r2] = await Promise.all([first, second]);
        expect(base).toHaveBeenCalledTimes(1);
        expect(await r1.text()).toBe('payload');
        expect(await r2.text()).toBe('payload');
        // one network emission, one deduplicated hit, no double counting
        expect(telemetry.filter((t) => !t.fromCache)).toHaveLength(1);
        expect(telemetry.filter((t) => t.fromCache)).toHaveLength(1);
        expect(telemetry[0].host).toBe('sdmx.example');
    });

    it('serves later calls from the cache for the transport lifetime', async () => {
        const base = vi.fn(async () => okResponse('payload'));
        const telemetry: FetchTelemetry[] = [];
        const transport = createTransport(base, (t) => telemetry.push(t));

        await transport('https://sdmx.example/data/A');
        const again = await transport('https://sdmx.example/data/A');
        expect(base).toHaveBeenCalledTimes(1);
        expect(await again.text()).toBe('payload');
        expect(telemetry[1].fromCache).toBe(true);
    });

    it('retries once on a 5xx and reports the retry', async () => {
        const base = vi.fn()
            .mockResolvedValueOnce(okResponse('unavailable', 503))
            .mockResolvedValueOnce(okResponse('payload'));
        const telemetry: FetchTelemetry[] = [];
        const transport = createTransport(base, (t) => telemetry.push(t));

        const response = await transport('https://sdmx.example/data/A');
        expect(base).toHaveBeenCalledTimes(2);
        expect(response.status).toBe(200);
        expect(await response.text()).toBe('payload');
        expect(telemetry[0]).toMatchObject({ status: 200, retried: true, fromCache: false });
    });

    it('retries once on a network error', async () => {
        const base = vi.fn()
            .mockRejectedValueOnce(new TypeError('fetch failed'))
            .mockResolvedValueOnce(okResponse('payload'));
        const transport = createTransport(base);

        const response = await transport('https://sdmx.example/data/A');
        expect(base).toHaveBeenCalledTimes(2);
        expect(await response.text()).toBe('payload');
    });

    it('does not retry 4xx responses', async () => {
        const base = vi.fn(async () => okResponse('nope', 404));
        const transport = createTransport(base);

        const response = await transport('https://sdmx.example/data/A');
        expect(base).toHaveBeenCalledTimes(1);
        expect(response.status).toBe(404);
    });

    it('does not cache failures and reports them as network-error', async () => {
        const base = vi.fn()
            .mockRejectedValueOnce(new TypeError('fetch failed'))
            .mockRejectedValueOnce(new TypeError('fetch failed'))
            .mockResolvedValueOnce(okResponse('payload'));
        const telemetry: FetchTelemetry[] = [];
        const transport = createTransport(base, (t) => telemetry.push(t));

        await expect(transport('https://sdmx.example/data/A')).rejects.toThrow('fetch failed');
        expect(telemetry[0].status).toBe('network-error');

        const response = await transport('https://sdmx.example/data/A');
        expect(await response.text()).toBe('payload');
    });

    it('keys the cache by Accept header so negotiation retries are not replayed', async () => {
        // mirrors the parser's negotiation: same URL, different Accept per attempt.
        // Keying on URL alone would replay the first (406) to the second.
        const base = vi.fn(async (_url: string, init?: RequestInit) => {
            const accept = new Headers(init?.headers || {}).get('accept');
            return accept ? okResponse('json-payload', 200) : okResponse('<err/>', 406);
        });
        const transport = createTransport(base);

        const bare = await transport('https://sdmx.example/data/ECB'); // no Accept -> 406
        const withAccept = await transport('https://sdmx.example/data/ECB', { headers: { Accept: 'application/vnd.sdmx.data+json;version=1.0.0' } });

        expect(base).toHaveBeenCalledTimes(2);            // not deduped across different Accept
        expect(bare.status).toBe(406);
        expect(withAccept.status).toBe(200);
        expect(await withAccept.text()).toBe('json-payload');
    });

    it('does not cache non-2xx responses (a later identical call re-fetches)', async () => {
        const base = vi.fn()
            .mockResolvedValueOnce(okResponse('<err/>', 406))
            .mockResolvedValueOnce(okResponse('payload', 200));
        const transport = createTransport(base);

        const first = await transport('https://sdmx.example/data/A');
        expect(first.status).toBe(406);
        const second = await transport('https://sdmx.example/data/A'); // same key, but 406 wasn't cached
        expect(base).toHaveBeenCalledTimes(2);
        expect(second.status).toBe(200);
    });

    it('returns an existing transport unchanged instead of stacking', () => {
        const inner = createTransport(vi.fn());
        const outer = createTransport(inner, vi.fn());
        expect(outer).toBe(inner);
    });
});
