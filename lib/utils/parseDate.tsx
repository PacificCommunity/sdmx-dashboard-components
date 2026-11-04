const DAY_MS = 24 * 60 * 60 * 1000;

// Monday of ISO 8601 week 1: the week holding the year's first Thursday,
// which always contains 4 January
const isoWeekOneMonday = (year: number): number => {
    const jan4 = Date.UTC(year, 0, 4);
    const isoWeekday = new Date(jan4).getUTCDay() || 7; // Monday 1 … Sunday 7
    return jan4 - (isoWeekday - 1) * DAY_MS;
}

/**
 * Parse an SDMX time period to the UTC timestamp of its first day.
 *
 * Calendar forms: `2023`, `2023-02`, `2023-02-01`. SDMX reporting periods:
 * `2023-A1` (year), `2023-S2` (semester), `2023-T2` (trimester, four
 * months), `2023-Q2` (quarter), `2023-M02` (month), `2023-W05` (ISO week,
 * its Monday) and `2023-D032` (day of the year). Business-day (`B`) series
 * use calendar dates. Returns null for anything else.
 * @param dateStr
 * @returns {Number | null}
 */
export const parseDate = (dateStr: string): number | null => {
    // '2023', '2023-02', '2023-02-01'
    const calendar = dateStr.match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/);
    if (calendar) {
        const [, year, month, day] = calendar;
        return Date.UTC(parseInt(year), month ? parseInt(month) - 1 : 0, day ? parseInt(day) : 1);
    }
    // reporting periods: '2023-S2', '2023-Q2', '2023-M02', '2023-W05', ...
    const reporting = dateStr.match(/^(\d{4})-([ASTQMWD])(\d{1,3})$/i);
    if (!reporting) {
        return null;
    }
    const year = parseInt(reporting[1]);
    const period = parseInt(reporting[3]);
    switch (reporting[2].toUpperCase()) {
        case 'A':
            return Date.UTC(year, 0, 1);
        case 'S':
            return Date.UTC(year, (period - 1) * 6, 1);
        case 'T':
            return Date.UTC(year, (period - 1) * 4, 1);
        case 'Q':
            return Date.UTC(year, (period - 1) * 3, 1);
        case 'M':
            return Date.UTC(year, period - 1, 1);
        case 'W':
            return isoWeekOneMonday(year) + (period - 1) * 7 * DAY_MS;
        case 'D':
            return Date.UTC(year, 0, period);
        default:
            return null;
    }
}

/**
 * SDMX frequency code of a time period string, as its format implies:
 * `A`, `M` or `D` for calendar forms, the period letter for reporting
 * periods (`2023-Q2` is `Q`). Used when a dataflow has no FREQ dimension.
 */
export const periodFrequency = (dateStr: string): string | undefined => {
    if (/^\d{4}$/.test(dateStr)) return 'A';
    if (/^\d{4}-\d{2}$/.test(dateStr)) return 'M';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return 'D';
    return dateStr.match(/^\d{4}-([ASTQMWD])\d{1,3}$/i)?.[1].toUpperCase();
}
