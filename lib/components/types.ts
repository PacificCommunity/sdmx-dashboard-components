import type { EChartsOption } from 'echarts';
import type { ReactNode } from 'react';

/**
 * One value of an SDMX dimension.
 *
 * Mirrors the `dimensions.*[].values[]` shape of an SDMX-JSON structure, which
 * is what `SDMXParser.getDimensions()` returns. `sdmx-json-parser` ships no
 * type declarations, so this is a hand-written model of its output — see
 * `SDMXDimension` for the caveat about optional fields.
 */
export type SDMXDimensionValue = {
    id: string, // machine value, e.g. "2024-01" or "NR"
    name: string, // human-readable label, e.g. "Monthly"
    names?: { [language: string]: string }, // localised labels keyed by language code
    order?: number, // display order, present when the source provides one
    start?: string, // ISO date-time; time-period dimensions only
    end?: string, // ISO date-time; time-period dimensions only
    annotations?: number[], // indexes into the structure's annotation list
}

/**
 * An SDMX dimension as returned by `SDMXParser.getDimensions()`.
 *
 * The parser concatenates the dataset, series and observation dimension lists,
 * so a single array can mix all three kinds. `name` and `keyPosition` are
 * present for every dimension the parser returns today; they are declared
 * required to keep call sites honest, and should be relaxed only with evidence
 * from a source that omits them.
 */
export type SDMXDimension = {
    id: string, // concept id, e.g. "TIME_PERIOD"
    name: string, // human-readable concept name, e.g. "Time period"
    names?: { [language: string]: string }, // localised concept names
    keyPosition: number, // position of this dimension in the observation key
    roles?: string[], // SDMX role ids, e.g. ["FREQ"]
    values: SDMXDimensionValue[],
}

/**
 * One value of an SDMX attribute, as returned by
 * `SDMXParser.getAttributes()`. Same shape as a dimension value minus
 * `start`/`end`.
 */
export type SDMXAttributeValue = {
    id: string, // machine value, e.g. "USD"
    name: string, // human-readable label, e.g. "US dollar"
    names?: { [language: string]: string }, // localised labels
    order?: number, // display order, when the source provides one
    annotations?: number[], // indexes into the structure's annotation list
}

/**
 * An SDMX attribute as returned by `SDMXParser.getAttributes()`.
 *
 * The parser concatenates the dataset, series and observation attribute lists,
 * and a source may declare an attribute with no values (the response simply
 * omits it), so `values` can be empty — always guard `values[0]`.
 */
export type SDMXAttribute = {
    id: string, // concept id, e.g. "UNIT_MEASURE"
    name: string, // human-readable concept name
    names?: { [language: string]: string }, // localised concept names
    roles?: string[], // SDMX role ids
    relationship?: { dimensions?: string[] }, // dimensions this attribute is attached to
    values: SDMXAttributeValue[],
}

/**
 * One row of `SDMXParser.getData()`: a flat record of the observation value
 * plus every dimension and attribute name for that observation, keyed by
 * concept id.
 *
 * Keys are concept ids (`TIME_PERIOD`, `GEO_PICT`, `UNIT_MEASURE`, …), so the
 * record is open by nature. Dimension and attribute entries are always the
 * `name` of the matching value — strings — while `value` is the numeric
 * OBS_VALUE. Read a dimension with a narrow, not a cast.
 */
export type SDMXObservation = {
    value: number | null, // OBS_VALUE; null when the source reports no value
    [concept: string]: string | number | null,
}

export type SDMXTextConfig = {
    size?: string, // size of the text as in font-size css property
    weight?: string, // weight of the text as in font-weight css property
    align?: "center" | "left" | "right", // alignment of the text as in text-align css property
    color?: string, // color of the text
    font?: string, // font of the text
    style?: string, // style of the text as in font-style css property
    text: string | {
        [keyof: string]: string // translations of the text in different languages
    },
    link?: string, // optional link for the text
    target?: "self" | "blank" // target for the link, defaults to "blank"
}

export type SDMXColorPalette = {
    [keyof: string]: { // SDMX dimension concept
        [keyof: string]: string // key value of dimension and value is a HEX color code
    }
}


export type SDMXVisualConfig = {
    id: string, // unique identifier
    colSize?: number, // size of the visualization in columns (when integrated in a dashboard)
    type: "line" | "bar" | "pie" | "column" | "lollipop" | "treemap" | "value" | "drilldown" | "note" | "map" | "table", // type of the visualization (available types: line, bar, pie, column, lollipop, treemap, value, drilldown, note, map, table) |
    title?: SDMXTextConfig, // title of the visualization
    subtitle?: SDMXTextConfig, // subtitle of the visualization
    note?: SDMXTextConfig, // note of the visualization
    frame?: boolean, // indicates whether or not the cell should have a border
    unit?: {
        text: string, // text of the unit
        location?: "prefix" | "suffix" | "under" // location of the unit
    },
    adaptiveTextSize?: boolean, // indicates whether or not the text size should be adaptive
    decimals?: number | string, // number of decimals to display
    labels?: boolean, // indicates whether or not the labels should be displayed
    download?: boolean, // indicates whether or not the visualization should be downloadable
    dataLink?: string, // link to the data,
    metadataLink?: string, // link to the metadata,
    xAxisConcept: string, // SDMX concept of the x-axis
    data: string | Array<string>, // data to be displayed
    sortByValue?: "asc" | "desc", // sort data by value (asc or desc)
}

export type SDMXChartConfig = {
    legend?: {
        concept?: string, // SDMX concept of the legend
        location?:"top" | "bottom" | "left" | "right" | "none", // location of the legend
    },
    drilldown?: {
        xAxisConcept: string, // SDMX concept of the x-axis
        legend?: {
            concept?: string, // SDMX concept of the legend
            location?:"top" | "bottom" | "left" | "right" | "none", // location of the legend
        },
    },
    colorPalette?: SDMXColorPalette, // color palette used for the visualization`
    extraOptions?: EChartsOption // extra options for the visualization (native ECharts option)
} & SDMXVisualConfig

export type SDMXTableCellTooltipParams = {
    name: string, // row category
    seriesName: string, // value column header, including the unit suffix
    value: unknown, // raw value; null for N/A
    data: { TIME_PERIOD?: string }, // chart-shaped data object
    marker: string, // colored-dot HTML, empty when no palette color resolves
    color?: string, // resolved hex color, when available
}

export type SDMXTableTooltipConfig = {
    enabled?: boolean, // default true
    formatter?: (params: SDMXTableCellTooltipParams) => string | ReactNode, // strings are sanitized: dataset text is escaped, only simple formatting tags survive
}

export type SDMXTableConfig = {
    categoryLabel?: string, // header of the first column; defaults to "Category"
    tooltip?: SDMXTableTooltipConfig, // value-cell tooltip
} & SDMXChartConfig

export type SDMXMapConfig = {
    colorScheme: string, // SDMX concept of the color
    legend?: {
        concept?: string, // SDMX concept of the legend
        location?:"top" | "bottom" | "left" | "right" | "none", // location of the legend
    },
    extraOptions?: Record<string, unknown> // reserved for OpenLayers options; the map renderer does not read this yet
} & SDMXVisualConfig


export type SDMXDashboardConfig = {
    id: string, // unique identifier
    rows: Array<{
        columns: Array<SDMXVisualConfig>
    }>,
    languages?: Array<string>, // languages available for the dashboard
    colCount?: number, // number of columns in the dashboard
    header?: {
        title: SDMXTextConfig, // title of the header
        subtitle: SDMXTextConfig, // subtitle of the header
    },
    footer?: {
        title: SDMXTextConfig, // title of the header
        subtitle: SDMXTextConfig, // subtitle of the header
    }
}
