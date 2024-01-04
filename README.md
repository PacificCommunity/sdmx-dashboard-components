# SDMX Dashboard React Component

Embeddable React components to create a dashboard for SDMX data.
The components are built using [Vite](https://vitejs.dev/).

<sub>Project generated thanks to this great article: [Create a Component Library Fast🚀\(using Vite's library mode\)](https://dev.to/receter/how-to-create-a-react-component-library-using-vites-library-mode-4lma)</sub>

## Usage

This library provides a `SDMXDashboard` component that generates a React dashboard from a JSON configuration file passed via `dashUrl`.

More information on the syntax of the configuration file can be found [here](https://github.com/thhomas/dashboard-creator/blob/main/public/doc.md)

```bash
npm install sdmx-dashboard-react
```

```javascript
import { SDMXDashboard } from 'sdmx-dashboard-react';

const App = () => {
  return (
    <SDMXDashboard
      dashUrl='path/to/dashboard.json'
    />
  );
};
```


## Development

```bash
npm install
npm run dev
```

The components are located in the `lib` folder where as the `src` folder hosts a demo application.

## Build

```bash
npm run build
```


