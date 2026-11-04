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

### Error contract

Every failure in a visual's data pipeline is surfaced as an `SDMXRenderError`, rendered in place of the visual with `role="alert"` and a `data-error-code` attribute. The class and its code type are exported from the package root:

```typescript
import { SDMXRenderError, SDMXRenderErrorCode } from 'sdmx-dashboard-components';
```

| Code | Meaning |
|---|---|
| `ERR_FETCH` | data URL unreachable or non-2xx (other than a 404 reporting no records) |
| `ERR_PARSE` | response is not parseable SDMX-JSON |
| `ERR_EMPTY` | query returned zero observations, either as a 200 without observations or as a 404 whose body reports no records (`.Stat Suite NoRecordsFound`, parser code `NO_RECORDS`) |
| `ERR_NO_SERIES_DIMENSION` | bar/column/lollipop chart with no varying dimension besides the x-axis |
| `ERR_AMBIGUOUS_SERIES` | two or more varying dimensions and no `legend.concept` to disambiguate |
| `ERR_CONCEPT_NOT_FOUND` | `xAxisConcept` or `legend.concept` missing from the dataflow structure |
| `ERR_ENGINE` | anything thrown by ECharts while drawing (original error kept as `cause`) |

Errors carry `visualId` (the `id` of the failing visual) and, where useful, a structured `detail` object (for `ERR_CONCEPT_NOT_FOUND` it lists the available concepts; for the series-structure codes it lists the varying dimensions with their value counts). The message wording is part of the public contract and is covered by unit tests: messages name the failing concepts and state concrete fixes, so an agent or a helpful UI can correct the configuration in one step.

A dashboard whose `url` config fails to load shows the failure in place of the dashboard, through `renderError` when given and otherwise in the same alert panel, and logs it with `console.error`. A non-2xx response or a network failure gives `ERR_FETCH`, a body that is not JSON `ERR_PARSE`; the error has no `visualId`, and its `detail` holds the `url` and, when a response arrived, its HTTP `status`. A new `url` clears the error.

### Render lifecycle

Consumers that need to know when a dashboard is ready (live previews, PDF export, agent feedback loops) can observe render state instead of polling the DOM:

```typescript
<SDMXDashboard
  config={config}
  lang="en"
  onVisualRender={(s: VisualRenderStatus) => void}      // fires per visual, on every state change
  onRenderComplete={(all: VisualRenderStatus[]) => void} // fires once per config when no visual is loading
/>
```

Each `VisualRenderStatus` carries the `visualId`, a `status` of `loading`, `rendered`, `empty`, or `error`, the `SDMXRenderError` when failed (`empty` carries `ERR_EMPTY`), and on success a `stats` block (`observationCount`, `seriesCount`, `timePeriodRange`) that lets a consumer judge whether a technically successful render is substantively thin. `onRenderComplete` fires exactly once per config and language, after the last visual settles, including the case where every visual fails and the case of a dashboard without data visuals (`[]`). The standalone `SDMXChart`, `SDMXTable`, `SDMXValue`, and `SDMXMap` accept `onVisualRender` as well. Both callbacks are optional, and inline callbacks never re-trigger data fetching.

### Interaction callback

Clicks on chart elements are exposed through `onUserInteraction`, on the dashboard and on `SDMXChart`:

```typescript
<SDMXDashboard
  config={config}
  onUserInteraction={(e: VisualInteraction) => void}
  // { visualId, kind: "point-click" | "series-click" | "legend-click",
  //   concepts: { REF_AREA: "WS", INDICATOR: "POP", ... }, value?, timePeriod? }
/>
```

A click on a data point gives `point-click` with the observation's full coordinate, its value and its time period; a click on the line of a line series gives `series-click`, and toggling a legend item `legend-click`, both with the coordinate the series shares (the legend dimension). The `concepts` map gives dimension id to code, enough to reconstruct the SDMX query for the clicked slice without engine knowledge on the consumer side. The callback is optional and adds no behaviour when absent.

### Custom data transport

All components accept an optional `fetcher` prop with the signature of the global `fetch` (`(url, init?) => Promise<Response>`, exported as `SDMXFetcher`). When provided, every request made by the library (the dashboard configuration and all SDMX data queries) goes through it, so the integrating application can add authentication headers, route requests through a proxy, or apply caching and retries without touching the global `fetch`. When absent, the global `fetch` is used. The fetcher's identity does not matter: an inline function, new on every render, neither refetches nor discards the response cache, and a replaced fetcher serves the next request.

```javascript
const proxyFetcher = (url, init) =>
  fetch(url.replace('https://stats-sdmx-disseminate.pacificdata.org', '/api/sdmx-proxy'), init);

<SDMXDashboard url='path/to/dashboard.json' fetcher={proxyFetcher} />
```

Data requests send `Accept-Language` only: the parser picks the SDMX-JSON dialect (`format=jsondata`, then `Accept` negotiation), which providers such as ECB, IMF and BIS require. Routing the SDMX data queries through the fetcher requires sdmx-json-parser 0.4.1 or later, whose `getDatasets` accepts the `fetcher` option; older parser versions fall back to the global `fetch`. The GeoJSON layers of `SDMXMap` are loaded by OpenLayers and do not go through the fetcher.

### Request dedup, caching, retry, and telemetry

The library wraps its data requests in a transport layer, on top of the provided `fetcher` or the global `fetch`:

- identical in-flight requests (same URL, `Accept` and `Accept-Language`) across the visuals of a dashboard share one network request;
- 2xx responses are cached for the lifetime of the rendered config (a config or language change invalidates); other responses are never cached, so the parser's `Accept` negotiation is not replayed;
- network errors and 5xx responses are retried once with a short backoff, 4xx fails immediately.

Operators can observe endpoint behaviour through the `onDataFetch` callback, available on the dashboard and the standalone components:

```typescript
<SDMXDashboard
  config={config}
  onDataFetch={(t: FetchTelemetry) => void} // { url, host, status, durationMs, fromCache, retried }
/>
```

It fires once per settled request, including deduplicated cache hits (`fromCache: true`), with no double counting of the underlying network exchange.

### Custom loading, empty, and error states

The built-in loading, empty, and error presentations can be replaced per state with render slots, on the dashboard and on the standalone components:

```typescript
<SDMXDashboard
  config={config}
  renderLoading={(visualId) => <BrandedSpinner />}
  renderEmpty={(visualId) => <BrandedNoDataCard />}
  renderError={(e: SDMXRenderError) => <BrandedErrorCard code={e.code} message={e.message} />}
/>
```

Defaults reproduce the built-in behaviour. `renderEmpty` applies when a query returns zero observations (`ERR_EMPTY`); other failures, and `ERR_EMPTY` when no `renderEmpty` is given, go to `renderError`. The map has no loading presentation of its own and shows `renderLoading` only when given.


### Axis titles, download, and dashboard rows

`xAxisTitle` and `yAxisTitle` (a string or a per-language map, with the same text expressions as `title`) name the axis of `xAxisConcept` and the value axis. For a horizontal `bar` chart, whose category axis is vertical, they are swapped accordingly. Left unset, the axes stay unnamed; `extraOptions.xAxis.name`/`yAxis.name` still override.

```javascript
config={{ ..., xAxisTitle: 'Year', yAxisTitle: { en: 'Population', fr: 'Population' } }}
```

`download: false` hides the chart's save-as-image button; it is shown otherwise.

Dashboard rows list their visuals under `columns` (type `SDMXDashboardRow`). The earlier misspelling `colums` is still accepted as a deprecated alias for this major version; migrate to `columns`.

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

### Global theming

A `theme` prop applies institutional branding once, at the dashboard level (and is accepted by the standalone components), instead of per visual or through engine class names:

```typescript
const spcTheme: SDMXTheme = {
  palette: ['#0a4595', '#e63946', '#2a9d8f'], // series colours in order
  fontFamily: { display: 'Georgia, serif', data: 'Inter, sans-serif' },
  numberFormat: { locale: 'en-NZ' }
};

<SDMXDashboard config={config} theme={spcTheme} />
```

The theme sits under everything a chart sets itself: a visual's `colorPalette`, the title config and `extraOptions` win, and the ECharts theme in force (the dark theme under `data-bs-theme="dark"`, or the one named by `SDMXChart`'s string `theme`) supplies anything the theme leaves unset. `fontFamily.display` applies to the titles and subtitles of charts, tables and values, `fontFamily.data` to axes, labels, legends, tooltips, table cells and value numbers. `numberFormat.locale` overrides the component language for number formatting (tooltips, data labels, table cells, values) while translated text stays on the component language. `SDMXChart` still accepts `theme` as the name of a registered ECharts theme.

### Accessibility, export, and registered components

Accessibility (`aria.enabled`) and image export
(`toolbox.feature.saveAsImage`) are enabled by default. Hovering the download
button shows a "Save chart as image" tooltip above the icon. Both features can
be overridden or disabled through `extraOptions`, for example
`aria: { enabled: false }`, or the config's `download: false`. CSV/data export is
**not** provided because ECharts has no equivalent; `saveAsImage` exports the
rendered chart image only.

Every chart also renders a visually hidden data table under it, holding the
same observations (x-axis values as rows, legend values as columns, captioned
with the chart title), so a screen reader can read the data where the chart's
aria description falls short. The `table` visual provides the same data as a
visible table.

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

When the data contains more than one observation per x-axis category, `column`, `bar`, `lollipop` and `treemap` charts show the observation for the latest `TIME_PERIOD` with a non-empty value. Empty means `null`, `undefined`, `""`, or `NaN`; `0` is a valid value. If the latest period is empty, the most recent earlier period with a value is used. `drilldown` applies the same rule to its root values. Time drilldowns keep the full period series in the child chart; a drilldown over another dimension uses the latest period with a non-empty `Total` value for the root (falling back to a non-`Total` row only when no `Total` exists), and shows that period's breakdown.

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

Value cells show a tooltip on hover and keyboard focus. By default it shows the row category, the value column, the formatted value, and the `TIME_PERIOD` used for that cell. Override the content with `tooltip.formatter`; it receives chart-shaped params and returns a React node.

```jsx
<SDMXTable
  config={{
    ...
    tooltip: {
      formatter: ({ name, seriesName, value, data, color }) => {
        const display = value == null || value === ""
          ? "N/A"
          : Number(value).toLocaleString("en");
        return (
          <>
            <div>{name}</div>
            <div>
              {color && (
                <span style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: color,
                  marginRight: 4
                }} />
              )}
              {seriesName}: {display}
              {data.TIME_PERIOD ? ` in ${data.TIME_PERIOD}` : ""}
            </div>
          </>
        );
      }
    }
  }}
  language="en"
/>
```

A string return value is still accepted, but it is sanitized: dataset-derived text is escaped, and only attribute-free formatting tags (`br`, `b`, `strong`, `i`, `em`, `u`, `small`, `span`, `div`, `p`) are kept. Attributes, styles and scripts appear as text. Prefer React nodes — they render as-is and markup cannot leak in.

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
