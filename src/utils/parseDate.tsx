
/**
 * Parse Date to a UTC date
 * @param dateStr 
 */
export const parseDate = (dateStr: string) => {
    // test dateStr format
    // if format like '2023-M02' convert to '2023-02-01'
    if (dateStr.match(/^\d{4}-[Mm]\d{2}$/)) {
        return Date.UTC(parseInt(dateStr.split('-')[0]), parseInt(dateStr.split('-')[1].replace(/[Mm]/, '')) - 1, 1)
    }
    // if format like '2023' convert to '2023-01-01'
    if (dateStr.match(/^\d{4}$/)) {
        return Date.UTC(parseInt(dateStr), 0, 1)
    }
    // if format like '2023-02' convert to '2023-02-01'
    if (dateStr.match(/^\d{4}-\d{2}$/)) {
        return Date.UTC(parseInt(dateStr.split('-')[0]), parseInt(dateStr.split('-')[1]) - 1, 1)
    }
    // if format like '2023-02-01' convert to '2023-02-01'
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return Date.UTC(parseInt(dateStr.split('-')[0]), parseInt(dateStr.split('-')[1]) - 1, parseInt(dateStr.split('-')[2]))
    }
    // if format like '2023-Q2' convert to '2023-04-01'
    if (dateStr.match(/^\d{4}-[Qq]\d$/)) {
        return Date.UTC(parseInt(dateStr.split('-')[0]), (parseInt(dateStr.split('-')[1].replace(/[Qq]/, '')) - 1) * 3, 1)
    }
}