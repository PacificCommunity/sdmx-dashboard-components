export type SDMXRenderErrorCode =
    | "ERR_FETCH" // data URL unreachable or non-2xx
    | "ERR_PARSE" // response is not parseable SDMX-JSON
    | "ERR_EMPTY" // query returned zero observations
    | "ERR_NO_SERIES_DIMENSION" // chart type needs a grouping dimension but only the x-axis varies
    | "ERR_AMBIGUOUS_SERIES" // two or more non-x-axis dimensions vary and no legend.concept disambiguates
    | "ERR_CONCEPT_NOT_FOUND" // xAxisConcept / legend.concept not in the structure
    | "ERR_ENGINE"; // anything escaping the charting engine

/**
 * Typed error for failures detected while preparing or rendering a visual.
 * The message is part of the public contract: consumers (including AI agents
 * driving the library) read it to correct their dashboard config, so tests
 * assert on its content.
 */
export class SDMXRenderError extends Error {
    code: SDMXRenderErrorCode;
    visualId?: string;
    detail?: Record<string, unknown>;
    declare cause?: unknown;

    constructor(
        code: SDMXRenderErrorCode,
        message: string,
        options?: { visualId?: string, detail?: Record<string, unknown>, cause?: unknown }
    ) {
        super(message);
        this.name = "SDMXRenderError";
        this.code = code;
        this.visualId = options?.visualId;
        this.detail = options?.detail;
        if (options?.cause !== undefined) {
            this.cause = options.cause;
        }
    }
}

// signatures of errors raised by sdmx-json-parser and the fetch layer; the
// parser wraps causes with `throw new Error(err)`, so only the message text
// is available for classification
const FETCH_SIGNATURES = [
    /while fetching data/i, // parser's non-2xx message
    /fetch failed/i, // undici/browser network failure
    /networkerror/i, // firefox network failure
    /failed to fetch/i // chrome network failure
];
const PARSE_SIGNATURES = [
    /unexpected token/i, // JSON.parse
    /unexpected end of json/i, // JSON.parse on a truncated body
    /is not valid json/i, // JSON.parse (node)
    /json parse error/i,
    /cannot read properties of undefined/i, // structure shape mismatch in the parser readers
    /\bnot found\b.*$/i // parser readers: "Name not found", "Dimensions not found", ...
];
const EMPTY_SIGNATURES = [
    /observations empty/i // parser: "Series not found and observations empty"
];

// the parser answers an HTTP 404 whose body reports no records (.Stat Suite
// "NoRecordsFound") with code NO_RECORDS; a re-wrap by `new Error(err)` drops
// the code and prefixes the message, hence the message signature as well
const NO_RECORDS_SIGNATURE = /^(?:\w*Error: )*No records found/;
const isNoRecords = (error: unknown, message: string): boolean =>
    (typeof error === "object" && error !== null && "code" in error && error.code === "NO_RECORDS")
    || NO_RECORDS_SIGNATURE.test(message);

/**
 * Normalise any error escaping a visual's data pipeline into an
 * SDMXRenderError with a stable code and the originating visual id.
 * SDMXRenderError instances pass through with the visual id stamped;
 * everything else is classified by message signature, with ERR_ENGINE as
 * the fallback for errors of unknown origin. The original error is kept as
 * `cause`.
 */
export const toSDMXRenderError = (error: unknown, visualId: string): SDMXRenderError => {
    if (error instanceof SDMXRenderError) {
        error.visualId = error.visualId || visualId;
        return error;
    }
    const message = error instanceof Error ? error.message : String(error);
    // a query without records is an empty result, not a failed fetch: report
    // it exactly as a 200 response with zero observations
    if (isNoRecords(error, message)) return emptyDataError(visualId, undefined, error);
    let code: SDMXRenderErrorCode = "ERR_ENGINE";
    if (FETCH_SIGNATURES.some((signature) => signature.test(message))) {
        code = "ERR_FETCH";
    } else if (EMPTY_SIGNATURES.some((signature) => signature.test(message))) {
        code = "ERR_EMPTY";
    } else if (PARSE_SIGNATURES.some((signature) => signature.test(message))) {
        code = "ERR_PARSE";
    }
    return new SDMXRenderError(code, message, { visualId, cause: error });
}

/**
 * The query behind a visual returned no observations. Raised by every
 * component, so the message stays identical across chart, table, value and map.
 */
export const emptyDataError = (visualId: string, url: unknown, cause?: unknown): SDMXRenderError =>
    new SDMXRenderError(
        'ERR_EMPTY',
        `The data query for visual ${visualId} returned zero observations. Fix: widen the data query (e.g. broaden the filter or the period) or check that the dataflow contains data for the requested slice.`,
        { visualId, detail: { url }, cause }
    );

/**
 * The charting engine threw while drawing a visual (setOption or a later
 * re-render). The original exception is kept as `cause`.
 */
export const engineError = (visualId: string, cause: unknown): SDMXRenderError =>
    new SDMXRenderError(
        'ERR_ENGINE',
        `The charting engine failed while rendering visual ${visualId}. Fix: check that observation values are numeric and that extraOptions, if set, are valid for the chart type.`,
        { visualId, cause }
    );
