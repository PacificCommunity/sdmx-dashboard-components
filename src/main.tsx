import React from 'react'
import ReactDOM from 'react-dom/client'
import {BrowserRouter, Route, Routes} from "react-router";
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/:active_tab" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
