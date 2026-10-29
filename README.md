# SDMX Dashboard React Component

Embeddable React components to create a dashboard for SDMX data.
The components are built using [Vite](https://vitejs.dev/).

This repository also embeds a demo application to showcase the components (more info [here](#development)).

<sub>Project generated thanks to this great article: [Create a Component Library Fast🚀\(using Vite's library mode\)](https://dev.to/receter/how-to-create-a-react-component-library-using-vites-library-mode-4lma)</sub>

## Usage

This library provides a set of components to build visuals for SDMX data.
Single React components are available `SDMXChart`, `SDMXMap`, `SDMXValue` and `SDMXTable` to embed SDMX visuals in your application and can also be combined in a
 `SDMXDashboard` component that generates a dashboard.
The single components are only configured via props, while the dashboard component can configured via a JSON configuration file.

More information on the syntax of the configuration can be found [here](https://github.com/PacificCommunity/sdmx-dashboard-demo/blob/main/public/doc.md)

> **1.0.0 breaking change:** the chart component now renders with Apache ECharts.
> `config.extraOptions` is a native ECharts option (options from the previous
> charting library are no longer supported), `colorPalette` accepts hex colors only
> (numeric color indexes / styled mode removed), and the `callback` prop receives
> an `echarts/core` `EChartsType` instance (the `EChartsType` type is exported).

```bash
npm install sdmx-dashboard-components
```

```javascript
import { SDMXDashboard } from 'sdmx-dashboard-components';

const App = () => {
  return (
    // SDMX dashboard component build from JSON configuration file
    <SDMXDashboard
      url='path/to/dashboard.json'
    />
    // SDMX chart component built from props
    <SDMXChart
      config={{
        data: ["https://stats-sdmx-disseminate.pacificdata.org/rest/data/SPC,DF_WBWGI,1.0/A..VA_EST?startPeriod=2010&dimensionAtObservation=AllDimensions"],
        title: {
          text: "World Bank Worldwide Governance Indicator",
        },
        subtitle: {
          text: "Voice and Accountability"
        },
        id:"wgi_va",
        type: "drilldown",
        xAxisConcept: "GEO_PICT",
        drilldown: {
          xAxisConcept:"TIME_PERIOD",
        },
        legend: {
          concept: "INDICATOR"
        },
        yAxisConcept: "OBS_VALUE"
      }}
      language='en'
    />
  );
};
```

The core `config` fields are independent of the charting library; chart-specific
tuning belongs in `extraOptions` (see below).

### Theming and native ECharts options

Charts are rendered with [Apache ECharts](https://echarts.apache.org/) 6
(`echarts@^6.1.0` is a peer dependency). Use the
`theme` prop to select an ECharts theme registered with `echarts.registerTheme`,
or pass native ECharts options through `config.extraOptions`. `extraOptions` is
merged last onto the options built from the config: object and scalar values are
merged in, and array values (including an array-valued `series`) are
concatenated and deduplicated.
`series` is special-cased: an object-valued `series` is merged into each built
series — including drilldown child series — with matching keys overridden; an
array-valued `series` is concatenated onto the built series.

```javascript
<SDMXChart
  config={{
    id: "wgi-chart",
    type: "column",
    data: ["https://stats-sdmx-disseminate.pacificdata.org/rest/data/SPC,DF_WBWGI,1.0/A..VA_EST?startPeriod=2010&dimensionAtObservation=AllDimensions"],
    title: {
      text: "World Bank Worldwide Governance Indicator",
    },
    xAxisConcept: "GEO_PICT",
    yAxisConcept: "OBS_VALUE",
    colorPalette: {
      "GEO_PICT": {
        "CK": "#E16A86",
        "FJ": "#D7765B",
        "FM": "#C7821C"
      }
    },
    extraOptions: {
      yAxis: {
        name: "Value"
      },
      tooltip: {
        valueFormatter: (value) => `${value}`
      }
    }
  }}
  language="en"
/>
```

`colorPalette` values must be hex color strings. The `callback` prop receives
the `echarts/core` `EChartsType` instance, so the ECharts API can be used
directly; the `EChartsType` type is exported by this package for annotating the
callback. An object-valued `extraOptions.series` is merged into every built
series — including drilldown child series — with matching keys overridden; an
array-valued `series` is concatenated and deduplicated onto the built series.

Value axes abbreviate large numbers by default: `1,500` → `1.5k`,
`1,500,000` → `1.5M`, `1,500,000,000` → `1.5B` (one decimal, trailing `.0`
dropped; values under 1,000 are unchanged). This applies to the value axis of
cartesian charts and to drilldown child charts; category and time axes are not
affected. Override the format with `extraOptions.yAxis.axisLabel.formatter`
(or `xAxis` for a horizontal `bar`). Tooltip values are shown in full with the
locale's thousands separators (e.g. `1,500,000 USD`), rather than abbreviated.
Tooltips also show the x-axis value (category, or a formatted date for time
axes) on the first line.
Category x-axis labels show every label (`axisLabel.interval: 0`). When they
do not fit, labels are wrapped onto multiple lines at word boundaries, and are
rotated 45° only when a single word is too wide for the available space.
Override with `extraOptions.xAxis.axisLabel.rotate` or
`extraOptions.xAxis.axisLabel.formatter`. Time/date axes keep ECharts' adaptive
tick interval.

Pie slices show data labels outside the pie with leader lines, formatted as
`Name: value` (or `Name: percentage %` when the unit is `%`). A pie legend is
rendered only when `config.legend` is set, positioned by `legend.location`
(`top`, `bottom`, `left`, `right`, or `none`). The pie radius adapts to the
available cell size, including legend and label space, so they stay inside the
chart; provide `extraOptions.series.radius` to size the pie yourself.

### Accessibility, export, and registered components

Accessibility (`aria.enabled`) and image export
(`toolbox.feature.saveAsImage`) are enabled by default. Hovering the download
button shows a "Save chart as image" tooltip above the icon. Both features can
be overridden or disabled through `extraOptions`, for example
`aria: { enabled: false }` or `toolbox: { show: false }`. CSV/data export is
**not** provided because ECharts has no equivalent; `saveAsImage` exports the
rendered chart image only.

The library registers the chart types it uses (`LineChart`, `BarChart`,
`PieChart`, `TreemapChart`, `ScatterChart`) plus `AriaComponent`,
`GridComponent`, `TitleComponent`, `ToolboxComponent`, `TooltipComponent`,
`LegendComponent`, and `CanvasRenderer`. If you enable other ECharts features
through `extraOptions` (for example `dataZoom`), register the corresponding
component from `echarts/components` in your application before rendering the
chart.

### Sorting data by value

For `column`-like representation (`column`, `bar`, `drilldown`, `lollipop`), the data is sorted alphabetically by default. The data can be sorted by value with the `sortByValue` config parameter in ascending or descending order. The sorting is done on the x-axis dimension.

```javascript
<SDMXChart
  config={{
    ...
    sortByValue: "asc" | "desc"
    ...
  }}
/>
```

### Choosing the observation

When the data contains more than one observation per x-axis category, `column`, `bar`, `lollipop` and `treemap` charts show the observation for the latest `TIME_PERIOD` with a non-empty value. Empty means `null`, `undefined`, `""`, or `NaN`; `0` is a valid value. If the latest period is empty, the most recent earlier period with a value is used. `drilldown` applies the same rule to its root values.

The rule applies only when `TIME_PERIOD` is neither `xAxisConcept` nor the legend concept. Otherwise the previous first-row-per-category behaviour is kept. Tables use the same selection.

### Tables

Use `type: "table"` in a dashboard config, or the `SDMXTable` component standalone, to render column-chart data as an HTML table. It fetches the same data as a column chart.

```javascript
<SDMXTable
  config={{
    id: "table-example",
    type: "table",
    data: ["https://stats-sdmx-disseminate.pacificdata.org/rest/data/DF_BP50/A.SI_POV_DAY1.FJ+FM+KI+MH+NR+PG+SB+TO+TV+VU+WS.F+M.Y15T24+Y15T999+Y25T999+_T._T._T._T._T._Z._T?lastNObservations=1&dimensionAtObservation=AllDimensions"],
    xAxisConcept: "GEO_PICT",
    legend: { concept: "SEX" },
    categoryLabel: "Country",
    decimals: 1
  }}
  language="en"
/>
```

The first column contains the `xAxisConcept` values and is headed `Category` unless `categoryLabel` overrides it. Each legend value becomes a value column; without `legend`, columns are built from the values of the first non-x active dimension. Missing values display `N/A`. `decimals` formats values, and `unit.text` is appended to each value column header. Tables ignore `extraOptions` and ECharts theming.

### Table tooltips

Value cells show a tooltip on hover and keyboard focus. By default it shows the row category, the value column, the formatted value, and the `TIME_PERIOD` used for that cell. Override the content with `tooltip.formatter`; it receives chart-shaped params and may return an HTML string (like a chart formatter) or a React node.

```javascript
<SDMXTable
  config={{
    ...
    tooltip: {
      formatter: ({ name, seriesName, value, data, marker }) => {
        const display = value == null || value === ""
          ? "N/A"
          : Number(value).toLocaleString("en");
        const period = data.TIME_PERIOD ? ` in ${data.TIME_PERIOD}` : "";
        return `${name}<br/>${marker}${seriesName}: ${display}${period}`;
      }
    }
  }}
  language="en"
/>
```

Set `tooltip: { enabled: false }` to disable them. Cells with no `TIME_PERIOD` and no formatter show no tooltip.

## Development

```bash
npm install
npm run dev
```

The components are located in the `lib` folder where as the `src` folder hosts a demo application.

The vite preview mode can also be used to test the built library in the demo application.

```bash
npm run preview
```

To deploy the demo app under a subfolder only in production, set `VITE_DEMO_BASE_PATH`.

```bash
# Example: deploy demo to /sdmx-dashboard-components/
VITE_DEMO_BASE_PATH=sdmx-dashboard-components npm run build-preview
```

When `VITE_DEMO_BASE_PATH` is empty (default), the demo is built for root (`/`).


## Build

```bash
npm run build
```

