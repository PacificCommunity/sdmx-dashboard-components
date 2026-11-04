import type { SDMXFetcher } from '../components/types';

/**
 * Options for an SDMX data request through the parser. Only the language is
 * set as a header: the parser adds format=jsondata and negotiates the
 * SDMX-JSON dialect itself. A fixed SDMX `Accept` header defeats that
 * negotiation and is rejected by some providers (ECB and BIS answer 406 to
 * `version=2.0.0`, IMF answers 500). `fetcher` is the parser's hook for the
 * transport; parsers without it fall back to the global fetch.
 */
export const dataRequestOptions = (language: string, fetcher?: SDMXFetcher): { headers: Headers, fetcher?: SDMXFetcher } => ({
  headers: new Headers({ 'Accept-Language': language }),
  ...(fetcher ? { fetcher } : {}),
});
