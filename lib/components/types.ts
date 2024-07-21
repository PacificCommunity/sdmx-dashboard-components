export type SDMXTextConfig = {
    size?: string, // size of the text as in font-size css property
    weight?: string, // weight of the text as in font-weight css property
    align?: "center" | "left" | "right", // alignment of the text as in text-align css property
    color?: string, // color of the text
    font?: string, // font of the text
    style?: string, // style of the text as in font-style css property
    text: string | {
        [keyof: string]: string // translations of the text in different languages
    }
}


export type SDMXVisualConfig = {
    id: string, // unique identifier
    colSize?: number, // size of the visualization in columns (when integrated in a dashboard)
    type: "line" | "bar" | "pie" | "column" | "value" | "drilldown" | "note" | "map", // type of the visualization (available types: line, bar, pie, column, value, drilldown, note, map) |
    colorScheme?: string, // color scheme used for maps (available values: Blues, BrBg, Greens, Greys, Oranges, PRGn, PiYG, PuOr, Purples, RdGy, RdYlBu, RdYlGn, Reds, Spectral, Turbo, Viridis)
    title?: SDMXTextConfig, // title of the visualization
    subtitle?: SDMXTextConfig, // subtitle of the visualization
    note?: SDMXTextConfig, // note of the visualization
    frame?: boolean, // indicates whether or not the cell should have a border
    unit?: {
        text: string, // text of the unit
        location?: "prefix" | "suffix" | "under" // location of the unit
    },
    decimals?: number | string, // number of decimals to display
    legend?: {
        concept?: string, // SDMX concept of the legend
        location?:"top" | "bottom" | "left" | "right" | "none", // location of the legend
    },
    labels?: boolean, // indicates whether or not the labels should be displayed
    xAxisConcept: string, // SDMX concept of the x-axis,
    yAxisConcept: string, // SDMX concept of the y-axis,
    download?: boolean, // indicates whether or not the visualization should be downloadable
    dataLink?: string, // link to the data,
    metadataLink?: string, // link to the metadata,
    data: string | Array<string>, // data to be displayed
}


export type SDMXDashboardConfig = {
    id: string, // unique identifier
    rows: Array<{
        colums: Array<SDMXVisualConfig>
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