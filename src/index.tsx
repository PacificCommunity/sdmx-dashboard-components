import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

import Dashboard from './components/dashboard';
// import reportWebVitals from './reportWebVitals';

const elems = document.getElementsByClassName('sdmx-dashboard-react')

// loop through collections of elements and create a root for each
Array.from(elems).forEach((elem) => {
  // get URL from element data attribute and pass to App
  const url = elem.getAttribute('data-url')
  ReactDOM.createRoot(elem as HTMLElement).render(
    url?.length > 0 &&
    <React.StrictMode>
      <Dashboard dashUrl={url} />
    </React.StrictMode>
    || <div>Dashboard URL not provided</div>
  );
});

