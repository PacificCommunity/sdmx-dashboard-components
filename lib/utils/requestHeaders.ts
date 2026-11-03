/**
 * Headers for an SDMX data request. Only the language is set: the parser
 * adds format=jsondata and negotiates the SDMX-JSON dialect itself. A fixed
 * SDMX `Accept` header defeats that negotiation and is rejected by some
 * providers (ECB and BIS answer 406 to `version=2.0.0`, IMF answers 500).
 */
export const dataRequestHeaders = (language: string): Headers =>
  new Headers({ 'Accept-Language': language });
