import React from 'react'
import ReactDOM from 'react-dom/client'
import {HashRouter, Route, Routes} from "react-router";
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter basename={process.env.NODE_ENV === 'production' ? '/sdmx-dashboard-components' : '/'}>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/:active_tab" element={<App />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>,
)
