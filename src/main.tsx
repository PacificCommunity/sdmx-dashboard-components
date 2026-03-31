import React from 'react'
import ReactDOM from 'react-dom/client'
import {BrowserRouter, Route, Routes} from "react-router";
import App from './App'
import './index.css'

const normalizedBasePath = (import.meta.env.VITE_DEMO_BASE_PATH || '').replace(/^\/+|\/+$/g, '')
const demoBasePath = import.meta.env.PROD && normalizedBasePath ? `/${normalizedBasePath}` : '/'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={demoBasePath}>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/:active_tab" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
