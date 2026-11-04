import type { EChartsOption } from 'echarts';
import type { ReactNode } from 'react';
import type { SDMXRenderError } from '../errors';
import type OLMap from 'ol/Map';
import type { FetchTelemetry } from '../utils/transport';

// drop-in replacement for the global fetch; lets consumers add
// authentication, proxying, caching, or retries to every data request
export type SDMXFetcher = (url: string, init?: RequestInit) => Promise<Response>;

// engine-neutral styling applied once, on the dashboard or a standalone
// visual, at the lowest precedence: a visual's colorPalette and config
// fields win, and the ECharts theme (light or dark) fills in the rest
export type SDMXTheme = {
    palette?: string[], // series colours in order
    fontFamily?: {
        display?: string, // titles and subtitles of charts, tables and values
        data?: string, // axes, labels, legends, tooltips, table cells and value numbers
    },
    numberFormat?: {
        locale?: string, // overrides the component language for number formatting
    },
}

// per-visual render state reported through onVisualRender/onRenderComplete;
// `stats` lets a consumer judge substantive quality ("rendered, but one
// series and two observations") without inspecting the DOM
export type VisualRenderStatus = {
    visualId: string,
    status: "loading" | "rendered" | "empty" | "error",
    error?: SDMXRenderError, // when status === "error" or "empty"
    stats?: { // when status === "rendered"
        observationCount: number,
        seriesCount: number,
        timePeriodRange?: [string, string]
    }
}

// props shared by every data visual (chart, table, value, map); the
// dashboard passes them unchanged through each cell
export type SDMXVisualProps = {
    onVisualRender?: (status: VisualRenderStatus) => void, // loading, then rendered | empty | error
    fetcher?: SDMXFetcher, // every data request goes through it (wrapped in the transport: dedup, cache, retry)
    onDataFetch?: (telemetry: FetchTelemetry) => void, // once per settled data request
    renderLoading?: (visualId: string) => ReactNode, // replaces the built-in loading state
    renderEmpty?: (visualId: string) => ReactNode, // replaces the error state when the query returned no observations (ERR_EMPTY)
    renderError?: (error: SDMXRenderError) => ReactNode, // replaces the built-in error state for every other failure
    onUserInteraction?: (interaction: VisualInteraction) => void, // clicks on chart points, series, and legend items
}

// user interaction on a rendered visual; `concepts` maps dimension id to
// code at the interaction point, enough to reconstruct the SDMX query for
// the clicked slice without any engine knowledge on the consumer side
export type VisualInteraction = {
    visualId: string,
    kind: "point-click" | "series-click" | "legend-click",
    concepts: Record<string, string>,
    value?: number, // point clicks: the observation value
    timePeriod?: string, // point clicks: the observation's TIME_PERIOD, when it has one
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
    xAxisTitle?: SDMXTextConfig['text'], // title of the xAxisConcept axis (the vertical axis of a horizontal bar chart): a string or a per-language map, with text expressions
    yAxisTitle?: SDMXTextConfig['text'], // title of the value axis (the horizontal axis of a horizontal bar chart): a string or a per-language map, with text expressions
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    extraOptions?: any // extra options for the visualization
    // background tiles: "satellite" (default, ArcGIS World Imagery), "none",
    // or an XYZ tile URL template ({z}, {x}, {y}); tiles are requested with
    // CORS so the map can be exported
    basemap?: "satellite" | "none" | (string & {}),
} & SDMXVisualConfig

// the OpenLayers map handed to a map visual's callback, with an export of
// its current view as a PNG data URL (data and basemap layers; the HTML
// legend and tooltip are not drawn)
export type SDMXMapInstance = OLMap & {
    toImage: () => Promise<string>,
}


export type SDMXDashboardRow = {
    columns?: Array<SDMXVisualConfig>, // visuals in this row
    /** @deprecated misspelling kept as an alias for one major version; use `columns` */
    colums?: Array<SDMXVisualConfig>,
}

export type SDMXDashboardConfig = {
    id: string, // unique identifier
    rows: Array<SDMXDashboardRow>,
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
