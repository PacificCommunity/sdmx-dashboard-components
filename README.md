# SMDX dashboard frontend components

Embeddable React app try-out based on following articles:
- [Create a react app with webpack](https://www.educative.io/answers/how-to-create-a-react-application-with-webpack)
- [setup react application using typescript and webpack](https://dev.to/shivampawar/setup-react-application-using-typescript-and-webpack-2kn6)
- [Progressively Decoupled App With React on Drupal](https://www.tothenew.com/blog/progressively-decoupled-app-with-react-on-drupal/)

## Todo

- [ ] If provided, pass on URL to Dashboard component
- [ ] Dashboard component
  - [ ] Load config file from server
  - [ ] Handle JSON files instead of YAML
  - [ ] Parse for layout
- [ ] Add (fix) map component
- [ ] Try adding 2 dashboards in one single page
- [ ] Check licencing (currently going for CC-BY-4.0)

## How does this work

The `sdmx-dashboard.bundle.js` (found in `dist/` folder) defines the **Dashboard** react component:

`<Dashboard dashurl="https://server.domain/path-to-config.json" />`  

The HTML page should include the javascript bundle and may include as many dashboards as needed by adding `sdmx-dashboard-react` CSS class name to DIV along with the URL to the config file:  
```
<div
  class="sdmx-dashboard-react"
  data-url="https://server.domain/path-to-config.json"
></div>
```

See src/index.html for an example.

## Available Scripts

In the project directory, you can run:

### `npm start` or `npm run serve`

Runs the app in the development mode.\
Open [http://localhost:3030](http://localhost:3030) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Unavailable.

### `npm run build`

Builds the app for production to the `dist` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See `dist/index.html` for an example of using the react app in a standalone page.
