import type { SDMXVisualConfig, VisualRenderStatus } from '../components/types';
import type { SDMXRenderError } from '../errors';

// visual types whose component reports its render status; a dashboard
// waits for exactly these before firing onRenderComplete
export const REPORTING_VISUAL_TYPES: Record<SDMXVisualConfig['type'], boolean> = {
    bar: true, column: true, line: true, drilldown: true, lollipop: true, treemap: true, pie: true,
    map: true, value: true, table: true,
    note: false,
};

/**
 * Status reported when a visual fails: ERR_EMPTY settles as "empty", every
 * other code as "error"; the typed error rides along in both cases.
 */
export const failedRenderStatus = (error: SDMXRenderError, visualId: string): VisualRenderStatus => ({
    visualId,
    status: error.code === 'ERR_EMPTY' ? 'empty' : 'error',
    error,
});

/**
 * Build the stats block of a "rendered" VisualRenderStatus from the fetched
 * observation rows. Time periods sort lexicographically, which orders ISO
 * SDMX reporting periods correctly within one frequency.
 * @param data rows returned by SDMXParser.getData() (one or more datasets concatenated)
 * @param seriesCount number of series the visual draws
 */
export const computeRenderStats = (
    data: ReadonlyArray<{ TIME_PERIOD?: unknown }>,
    seriesCount: number
): NonNullable<VisualRenderStatus['stats']> => {
    const timePeriods = data
        .map((row) => row.TIME_PERIOD)
        .filter((value) => value !== undefined && value !== null)
        .map(String)
        .sort();
    const stats: NonNullable<VisualRenderStatus['stats']> = {
        observationCount: data.length,
        seriesCount
    };
    if (timePeriods.length > 0) {
        stats.timePeriodRange = [timePeriods[0], timePeriods[timePeriods.length - 1]];
    }
    return stats;
}
