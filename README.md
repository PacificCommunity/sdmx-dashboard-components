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
        xAxisConcept:"TIME_PERIOD",
        legend: {
          concept: "GEO_PICT"
        },
        yAxisConcept: "OBS_VALUE"
      }}
    />
  );
};
```

### Highcharts Styled Mode

The user can also make use of all the Highcharts options passing them as props to the components with the `extraOptions` parameter of the config object.

For instance, the Highcharts `styledMode` option can be used to apply CSS styles to the chart's elements and also leverage the dark theme. In this case, the `colorPalette` parameter passed to the component must be an object that specify a colorIndex and not a color code. The integrating application has to include in its CSS the highcharts classes for the indexes. 

```javascript
<SDMXChart
  config={{
    data: ["https://stats-sdmx-disseminate.pacificdata.org/rest/data/SPC,DF_WBWGI,1.0/A..VA_EST?startPeriod=2010&dimensionAtObservation=AllDimensions"],
    title: {
      text: "World Bank Worldwide Governance Indicator",
    },
    colorPalette: {
      "GEO_PICT": {
        "CK": 0,
        "FJ": 1,
        "FM": 2,
        "KI": 3,
        "MH": 4,
        "NC": 5,
        "PF": 8,
        "PW": 10,
        "SB": 11,
        "TO": 12,
        "VU": 14,
        "WF": 15
      }
    },
    extraOptions: {
      chart: {
        styledMode: true
      }
    }
  }}
/>
```

```css
.highcharts-color-0 {
  fill: #E16A86;
  stroke: #E16A86;
}
.highcharts-color-1 {
  fill: #D7765B;
  stroke: #D7765B;
}
.highcharts-color-2 {
  fill: #C7821C;
  stroke: #C7821C;
}
...
```

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


## Build

```bash
npm run build
```


