import { useMemo } from 'react';
import type { SDMXFetcher } from '../components/types';
import { useLatest } from './useLatest';

// fired once per settled request, including deduplicated cache hits
export type FetchTelemetry = {
    url: string,
    host: string,
    status: number | "network-error",
    durationMs: number,
    fromCache: boolean,
    retried: boolean
}

type SettledExchange = {
    status: number,
    statusText: string,
    contentType: string | null,
    body: string,
    retried: boolean
}

// transports created here; passing one to createTransport returns it as is
const transports = new WeakSet<SDMXFetcher>();
const RETRY_BACKOFF_MS = 300;

const hostOf = (url: string): string => {
    try {
        return new URL(url).host;
    } catch {
        return '';
    }
}

// Dedup/cache key. It MUST include the negotiated headers, not just the URL:
// the parser retries the same URL with different `Accept` headers to find the
// dialect a provider serves (e.g. ECB needs bare format=jsondata, BIS needs
// Accept v1.0). Keying on URL alone would replay the first attempt's response
// to every retry and defeat that negotiation. Accept-Language is included too
// because it changes the response language.
const requestKey = (url: string, init?: RequestInit): string => {
    const headers = new Headers(init?.headers || {});
    return [url, headers.get('accept') || '', headers.get('accept-language') || ''].join('\n');
}

const wait = (ms: number): Promise<void> => {
    const { promise, resolve } = Promise.withResolvers<void>();
    setTimeout(resolve, ms);
    return promise;
}

/**
 * Wrap a fetcher with the behaviours SDMX endpoint instability calls for:
 *
 *  - identical in-flight requests (same URL + Accept + Accept-Language) share
 *    one network request, and successful (2xx) responses are cached for the
 *    lifetime of the transport (the dashboard creates one transport per
 *    rendered config, so a config change invalidates). Non-2xx responses are
 *    not cached, so the parser's Accept-header negotiation is not defeated;
 *  - network errors and 5xx responses are retried once after a short
 *    backoff; 4xx responses fail immediately;
 *  - every settled request is reported through onDataFetch, cache hits
 *    with fromCache true and no double counting of the network exchange.
 *
 * Passing an existing transport returns it unchanged, so component-level
 * wrapping does not stack on a dashboard-level transport.
 */
export const createTransport = (
    baseFetcher?: SDMXFetcher,
    onDataFetch?: (telemetry: FetchTelemetry) => void
): SDMXFetcher => {
    if (baseFetcher && transports.has(baseFetcher)) {
        return baseFetcher;
    }
    const exchanges = new Map<string, Promise<SettledExchange>>();

    const runExchange = async (url: string, init?: RequestInit): Promise<SettledExchange> => {
        // resolved per call: the global fetch may be replaced after creation
        const doFetch: SDMXFetcher = baseFetcher || ((input, requestInit) => fetch(input, requestInit));
        let retried = false;
        let response: Response;
        try {
            response = await doFetch(url, init);
        } catch {
            retried = true;
            await wait(RETRY_BACKOFF_MS);
            response = await doFetch(url, init);
        }
        if (response.status >= 500 && !retried) {
            retried = true;
            await wait(RETRY_BACKOFF_MS);
            response = await doFetch(url, init);
        }
        const body = await response.text();
        return {
            status: response.status,
            statusText: response.statusText,
            contentType: response.headers?.get?.('content-type') ?? null,
            body,
            retried
        };
    }

    const transport: SDMXFetcher = async (url, init) => {
        const startedAt = Date.now();
        const key = requestKey(url, init);
        const inFlight = exchanges.get(key);
        const fromCache = inFlight !== undefined;
        const exchange = inFlight ?? runExchange(url, init);
        if (!fromCache) {
            exchanges.set(key, exchange);
        }
        let settled: SettledExchange;
        try {
            settled = await exchange;
        } catch (error) {
            // failures are not cached: a later caller gets a fresh attempt
            exchanges.delete(key);
            onDataFetch?.({
                url,
                host: hostOf(url),
                status: 'network-error',
                durationMs: Date.now() - startedAt,
                fromCache,
                retried: !fromCache
            });
            throw error;
        }
        // only 2xx responses are cached; a non-2xx (e.g. a 406 from a
        // negotiation probe, or a transient 4xx) must not be replayed to a
        // later request that may use a different Accept and succeed
        if (settled.status < 200 || settled.status >= 300) {
            exchanges.delete(key);
        }
        onDataFetch?.({
            url,
            host: hostOf(url),
            status: settled.status,
            durationMs: Date.now() - startedAt,
            fromCache,
            retried: fromCache ? false : settled.retried
        });
        return new Response(settled.body, {
            status: settled.status,
            statusText: settled.statusText,
            headers: settled.contentType ? { 'content-type': settled.contentType } : undefined
        });
    }
    transports.add(transport);
    return transport;
}

/**
 * The transport a component fetches through: a fresh one, with its own cache,
 * whenever `key` (the component's data request) changes; the dashboard's
 * transport when the fetcher is one. The fetcher and onDataFetch are read
 * through refs: an inline fetcher (a new function every parent render) does
 * not discard the cache or refetch, and a replaced one serves the next request.
 */
export const useTransport = (
    fetcher: SDMXFetcher | undefined,
    onDataFetch: ((telemetry: FetchTelemetry) => void) | undefined,
    key: string
): SDMXFetcher => {
    const fetcherRef = useLatest(fetcher);
    const onDataFetchRef = useLatest(onDataFetch);
    const sharedTransport = fetcher && transports.has(fetcher) ? fetcher : undefined;
    return useMemo(
        () => sharedTransport ?? createTransport(
            (url, init) => (fetcherRef.current ?? fetch)(url, init),
            (telemetry) => onDataFetchRef.current?.(telemetry)
        ),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [sharedTransport, key]
    );
}
