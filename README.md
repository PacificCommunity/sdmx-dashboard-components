# SMDX dashboard frontend components

Embeddable React app try-out based on following articles:
- [Create a react app with webpack](https://www.educative.io/answers/how-to-create-a-react-application-with-webpack)
- [setup react application using typescript and webpack](https://dev.to/shivampawar/setup-react-application-using-typescript-and-webpack-2kn6)
- [Progressively Decoupled App With React on Drupal](https://www.tothenew.com/blog/progressively-decoupled-app-with-react-on-drupal/)

## Todo

- [ ] If not URL provided, load list of dashboards from server (?)
- [ ] If provided, pass on URL to Dashboard component
- [ ] Dashboard component
  - [ ] Load config file from server
  - [ ] Handle JSON files instead of YAML
  - [ ] Parse for layout
- [ ] Add (fix) map component
- [ ] Try adding 2 dashboards in one single page
- [ ] Check licencing (currently going for CC-BY-4.0)

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
