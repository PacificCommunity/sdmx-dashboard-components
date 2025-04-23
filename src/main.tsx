import React from 'react'
import ReactDOM from 'react-dom/client'
import {BrowserRouter, Route, Routes} from "react-router";
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={process.env.NODE_ENV === 'production' ? '/sdmx-dashboard-components' : '/'}>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/:active_tab" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
