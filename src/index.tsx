import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

import Dashboard from './components/dashboard'

// Get all nodes with CSS classname sdmx-dashboard-react
const elems = document.getElementsByClassName('sdmx-dashboard-react')

// loop through collections of elements and render Dashboards
Array.from(elems).forEach((elem) => {
  // get URL from element data attribute and pass to App
  const url = elem.getAttribute('data-url')
  // create root and render
  // if URL to config file is not provided, display a message
  ReactDOM.createRoot(elem as HTMLElement).render(
    url?.length > 0 &&
    (<React.StrictMode>
      <Dashboard dashUrl={url} />
    </React.StrictMode>
    || <div>Dashboard URL not provided</div>)
  );
});

