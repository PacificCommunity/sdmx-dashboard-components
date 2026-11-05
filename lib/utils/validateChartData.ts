import { SDMXRenderError } from '../errors';
import type { SDMXObservation } from '../components/types';
import { getLatestTimePeriodRow, isNonEmptyValue } from './chartHelpers';

// chart types whose series are built by grouping observations on a second
// dimension: legend.concept names it, or else it must be one that varies
const GROUPING_CHART_TYPES: Record<string, true> = { bar: true, column: true, lollipop: true };

type VaryingDimension = {
    id: string,
    valueCount: number
}

// the parts of SDMXParser.getData() rows and getActiveDimensions() entries read here
type ObservationRow = SDMXObservation;
type ActiveDimension = { id: string, values?: ReadonlyArray<{ name?: unknown }> } | undefined;

type SlotCollision = {
    dimensions: VaryingDimension[], // dimensions that differ within the slot
    category: string, // the slot's x value
    period?: string, // the period drawn, when only the latest one is
    count: number // observations drawn for the slot
};

/**
 * The first series/category slot whose drawn observations still differ in a
 * dimension besides the x axis, the legend and TIME_PERIOD. Mirrors the
 * column-like builder, with its own period selection so the two cannot
 * disagree: observations without a value are skipped and, unless
 * TIME_PERIOD is the x axis or the legend, only the period
 * getLatestTimePeriodRow picks for the slot is drawn.
 */
const findSlotCollision = (
    data: ReadonlyArray<ObservationRow>,
    varying: ReadonlyArray<VaryingDimension>,
    xAxisConcept: string,
    legendConcept: string,
    timeDimension: ActiveDimension
): SlotCollision | undefined => {
    const candidates = varying.filter((dimension) => dimension.id !== legendConcept && dimension.id !== 'TIME_PERIOD');
    if (candidates.length === 0) {
        return undefined;
    }
    const latestOnly = xAxisConcept !== 'TIME_PERIOD' && legendConcept !== 'TIME_PERIOD';
    const slots = new Map<string, ObservationRow[]>();
    data.forEach((row) => {
        if (!isNonEmptyValue(row.value)) return;
        const key = `${String(row[legendConcept])}\u0000${String(row[xAxisConcept])}`;
        const rows = slots.get(key);
        if (rows) rows.push(row);
        else slots.set(key, [row]);
    });
    for (const rows of slots.values()) {
        const latest = latestOnly ? getLatestTimePeriodRow(rows, timeDimension) : undefined;
        const period = latest ? String(latest.TIME_PERIOD) : undefined;
        const drawn = period === undefined ? rows : rows.filter((row) => String(row.TIME_PERIOD) === period);
        if (drawn.length < 2) continue;
        const differing = candidates.filter((dimension) => new Set(drawn.map((row) => row[dimension.id])).size > 1);
        if (differing.length > 0) {
            return { dimensions: differing, category: String(drawn[0][xAxisConcept]), period, count: drawn.length };
        }
    }
    return undefined;
};

/**
 * Validate that the fetched data can be shaped into unambiguous series for
 * the requested chart type. Throws an SDMXRenderError instead of letting the
 * chart render a blank panel (grouping chart with nothing to group on), a
 * misleading "see-saw" line (several dimensions merged into one series), or
 * bars that each keep one observation of a dimension nothing groups on.
 *
 * The candidate dimensions come from SDMXParser.getActiveDimensions(): the
 * parser already knows which dimensions vary in the response. The counts are
 * taken from the fetched rows because those are the values the builders
 * actually group on.
 *
 * The error messages are a public contract: agents and UIs read them to fix
 * the dashboard config.
 * @param chartType chart type from the visual config
 * @param xAxisConcept dimension id displayed on the x-axis (after defaults are applied)
 * @param legendConcept dimension id from legend.concept, empty when not configured
 * @param data rows returned by SDMXParser.getData()
 * @param activeDimensions dimensions returned by SDMXParser.getActiveDimensions()
 */
export const validateSeriesDimensions = (
    chartType: string,
    xAxisConcept: string,
    legendConcept: string,
    data: ReadonlyArray<ObservationRow>,
    activeDimensions: ReadonlyArray<ActiveDimension>
): void => {
    if (!xAxisConcept || xAxisConcept === 'MULTI' || data.length === 0 || activeDimensions.length === 0) {
        return;
    }

    const varying: VaryingDimension[] = activeDimensions
        .filter((dimension): dimension is { id: string } => Boolean(dimension))
        .filter((dimension) => dimension.id !== xAxisConcept)
        .map((dimension) => ({
            id: dimension.id,
            valueCount: new Set(
                data.map((row) => row[dimension.id]).filter((value) => value !== undefined)
            ).size
        }))
        .filter((dimension) => dimension.valueCount > 1);

    // a configured legend.concept names the series even when its dimension
    // holds a single value: that is one series, not a missing one
    const legendNamesSeries = Boolean(legendConcept) && legendConcept !== 'MULTI';
    if (GROUPING_CHART_TYPES[chartType] && varying.length === 0 && !legendNamesSeries) {
        throw new SDMXRenderError(
            'ERR_NO_SERIES_DIMENSION',
            `Chart type=${chartType} with xAxis=${xAxisConcept} needs at least one other varying dimension to group bars/columns. Only ${xAxisConcept} varies in this query. Fix: set legend.concept to the dimension that names the series (a single-valued one gives a single series), switch chart type to line or pie, or widen the data query so a second dimension varies (e.g. remove lastNObservations or broaden the filter).`,
            { detail: { chartType, xAxisConcept, varyingDimensions: [] } }
        );
    }

    // bar, column and lollipop charts draw one value per series and x
    // category. When another dimension still differs among the observations
    // of that slot, the builder keeps one and drops the rest. Only the
    // observations it would draw count: with TIME_PERIOD off the axis and the
    // legend, that is the latest period of each slot, so a query mixing codes
    // across countries or years (F for most, _T for one) is fine.
    if (GROUPING_CHART_TYPES[chartType] && legendNamesSeries) {
        const timeDimension = activeDimensions.find((dimension) => dimension?.id === 'TIME_PERIOD');
        const collision = findSlotCollision(data, varying, xAxisConcept, legendConcept, timeDimension);
        if (collision) {
            const { dimensions: differing, category, period, count } = collision;
            const differingIds = differing.map((dimension) => dimension.id).join(', ');
            const at = period !== undefined ? ` in ${period}` : '';
            throw new SDMXRenderError(
                'ERR_AMBIGUOUS_SERIES',
                `Chart type=${chartType} with xAxis=${xAxisConcept} and legend.concept=${legendConcept} draws one value per ${xAxisConcept} and ${legendConcept}, but ${differingIds} also ${differing.length === 1 ? 'varies' : 'vary'} within them: ${xAxisConcept}=${category} has ${count} observations${at}. The chart would keep one and drop the rest. Fix: narrow the data query so that ${differingIds} ${differing.length === 1 ? 'takes' : 'take'} a single value, or set legend.concept to ${differing.length === 1 ? differingIds : 'one of them and narrow the others'}.`,
                { detail: { chartType, xAxisConcept, varyingDimensions: differing } }
            );
        }
    }

    if (varying.length >= 2 && !legendConcept) {
        const varyingList = varying
            .map((dimension) => `${dimension.id} (${dimension.valueCount} values)`)
            .join(', ');
        throw new SDMXRenderError(
            'ERR_AMBIGUOUS_SERIES',
            `Chart type=${chartType} with xAxis=${xAxisConcept} has ${varying.length} other varying dimensions: ${varyingList}. Their observations would be merged into a single series, rendering an artefact instead of the data. Fix: set legend.concept to one of the varying dimensions, or narrow the data query so that only one dimension besides ${xAxisConcept} varies.`,
            { detail: { chartType, xAxisConcept, varyingDimensions: varying } }
        );
    }
}
