/**
 * Helpers translating chart interaction targets back into SDMX dimension
 * coordinates. Data rows map dimension ids to value names (that is what the
 * parser exposes); consumers need codes to reconstruct queries, so the
 * dimension structures are used to translate names back to codes. When a
 * name has no matching code the name itself is kept, which holds for
 * TIME_PERIOD values.
 */
import { parseDate } from './parseDate';

export type InteractionDimension = {
    id: string,
    values?: Array<{ id: string | number, name: string }>,
};

export type InteractionRow = Record<string, unknown>;

/**
 * Dimension coordinates of a single observation row.
 * @param row a data row as returned by SDMXParser.getData()
 * @param dimensions dimension structures from SDMXParser.getDimensions()
 */
export const buildInteractionConcepts = (row: InteractionRow, dimensions: InteractionDimension[]): Record<string, string> => {
    const concepts: Record<string, string> = {};
    dimensions.forEach((dimension) => {
        const valueName = row?.[dimension.id];
        if (valueName === undefined || valueName === null) {
            return;
        }
        const code = dimension.values?.find((value) => value.name === valueName)?.id;
        concepts[dimension.id] = code !== undefined ? String(code) : String(valueName);
    });
    return concepts;
};

/**
 * Dimension coordinate shared by a whole series: the dimension whose value
 * name matches the series name (the legend dimension).
 * @param seriesName name of the clicked series
 * @param dimensions dimension structures from SDMXParser.getDimensions()
 */
export const buildSeriesConcepts = (seriesName: string, dimensions: InteractionDimension[]): Record<string, string> => {
    const concepts: Record<string, string> = {};
    dimensions.forEach((dimension) => {
        const match = dimension.values?.find((value) => value.name === seriesName);
        if (match) {
            concepts[dimension.id] = String(match.id);
        }
    });
    return concepts;
};

/** What the engine tells about a clicked point. */
export type InteractionTarget = {
    seriesName?: string, // the series (legend) value name
    name?: string, // the category (x-axis or slice) value name
    time?: number, // timestamp on a time axis
    value?: unknown, // the observation value
    timePeriod?: string, // TIME_PERIOD carried by the data item, when it has one
};

/**
 * The observation row a clicked point was drawn from. Each known property of
 * the target narrows the candidates; a property that matches no row (a
 * renamed series, a derived value) is skipped rather than ruling every row
 * out. Returns undefined when nothing identified the point.
 * @param rows the data rows of the chart's datasets
 * @param dimensions dimension structures of those datasets
 * @param target what the engine reported about the click
 */
export const findInteractionRow = (
    rows: InteractionRow[],
    dimensions: InteractionDimension[],
    target: InteractionTarget
): InteractionRow | undefined => {
    const dimensionIds = dimensions.map((dimension) => dimension.id);
    const hasValueName = (row: InteractionRow, name: string) => dimensionIds.some((id) => row[id] === name);
    let candidates = rows;
    let narrowed = false;
    const narrow = (predicate: (row: InteractionRow) => boolean) => {
        const next = candidates.filter(predicate);
        if (next.length > 0) {
            candidates = next;
            narrowed = true;
        }
    };
    const { seriesName, name, time, value, timePeriod } = target;
    if (seriesName) narrow((row) => hasValueName(row, seriesName));
    if (name) narrow((row) => hasValueName(row, name));
    if (timePeriod) narrow((row) => row.TIME_PERIOD === timePeriod);
    if (time !== undefined) narrow((row) => typeof row.TIME_PERIOD === 'string' && parseDate(row.TIME_PERIOD) === time);
    if (value !== undefined && value !== null) narrow((row) => row.value === value);
    return narrowed ? candidates[0] : undefined;
};
