# SDMX Dashboard React Component

Embeddable React components to create a dashboard for SDMX data.
The components are built using [Vite](https://vitejs.dev/).

This repository also embeds a demo application to showcase the components (more info [here](#development)).

<sub>Project generated thanks to this great article: [Create a Component Library Fast🚀\(using Vite's library mode\)](https://dev.to/receter/how-to-create-a-react-component-library-using-vites-library-mode-4lma)</sub>

## Usage

This library provides a set of components to build visuals for SDMX data.
Single React components are available `SDMXChart`, `SDMXMap` and `SDMXValue` to embed SDMX visuals in your application and can also be combined in a
 `SDMXDashboard` component that generates a dashboard.
The single components are only configured via props, while the dashboard component can configured via a JSON configuration file.

More information on the syntax of the configuration can be found [here](https://github.com/PacificCommunity/sdmx-dashboard-demo/blob/main/public/doc.md)

> **1.0.0 breaking change:** the chart component now renders with Apache ECharts.
> `config.extraOptions` is a native ECharts option (options from the previous
> charting library are no longer supported), `colorPalette` accepts hex colors only
> (numeric color indexes / styled mode removed), and the `callback` prop receives
> an `echarts/core` `EChartsType` instance.

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

Charts are rendered with [Apache ECharts](https://echarts.apache.org/). Use the
`theme` prop to select an ECharts theme registered with `echarts.registerTheme`,
or pass native ECharts options through `config.extraOptions`. `extraOptions` is
merged last, on top of the options built from the config, so scalar and object
options override their built counterparts (with the `series` exception described
below).

```javascript
<SDMXChart
  config={{
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
directly. An object-valued `extraOptions.series` supplies per-series defaults
merged into every built series; an array-valued `series` replaces the built
series.

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

