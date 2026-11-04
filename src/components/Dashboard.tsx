import React, { useState } from "react"
import { SDMXDashboard } from "../../lib"
import type { SDMXRenderError, SDMXTheme } from "../../lib"
import { Container, Row } from "react-bootstrap"

const normalizedBasePath = (import.meta.env.VITE_DEMO_BASE_PATH || '').replace(/^\/+|\/+$/g, '')
const demoBasePath = import.meta.env.PROD && normalizedBasePath ? `/${normalizedBasePath}` : ''
const withBasePath = (path: string) => `${demoBasePath}${path}`

const loadingSlot = (visualId: string) => (
  <div className="d-flex flex-column align-items-center justify-content-center gap-2 text-muted py-5">
    <div className="spinner-border text-primary" role="status" aria-label="Loading" />
    <small>Loading {visualId.replace(/_/g, ' ')}…</small>
  </div>
)

const emptySlot = (visualId: string) => (
  <div className="d-flex flex-column align-items-center justify-content-center gap-1 text-muted py-4">
    <span className="fs-3" aria-hidden="true">∅</span>
    <small>No observations for {visualId.replace(/_/g, ' ')}</small>
  </div>
)

const errorSlot = (error: SDMXRenderError) => (
  <div className="alert alert-danger d-flex align-items-start gap-2 m-3" role="alert">
    <span aria-hidden="true">⚠</span>
    <div>
      <div className="fw-semibold">This visual could not be loaded</div>
      <div className="small">{error.message}</div>
      <code className="small">{error.code}</code>
    </div>
  </div>
)

// SPC branding, applied once to the first dashboard
const spcTheme: SDMXTheme = {
  palette: ['#0a4595', '#e63946', '#2a9d8f'],
  fontFamily: { display: 'Georgia, serif', data: 'Inter, sans-serif' },
  numberFormat: { locale: 'en-NZ' },
}

const Dashboard = () => {
  const [language, setLanguage] = useState(document.documentElement.lang || 'en')
  const dash1Languages = {
    en: 'English',
    fr: 'French',
  }
  return (
    <Container>
        <Row>
            <select className="form-select w-50" aria-label="select language" value={language} onChange={(evt)=>setLanguage(evt.target.value)}>
                {Object.keys(dash1Languages).map((key: string) => (
                    <option key={key} value={key}>{dash1Languages[key as keyof typeof dash1Languages]}</option>
                ))}
            </select>
            <SDMXDashboard
                url={withBasePath('/PacificPopulation.json')}
                lang={language}
                theme={spcTheme}
                renderLoading={loadingSlot}
                renderEmpty={emptySlot}
                renderError={errorSlot}
            />
        </Row>
        <Row>
            <SDMXDashboard
                url={withBasePath('/ExampleCLNew.json')}
                lang={language}
                renderLoading={loadingSlot}
                renderEmpty={emptySlot}
                renderError={errorSlot}
            />
        </Row>
        <Row>
          <SDMXDashboard
              url={withBasePath('/pacific-economies-the-iran-oil-shock.json')}
              lang={language}
              renderLoading={loadingSlot}
              renderEmpty={emptySlot}
              renderError={errorSlot}
          />
        </Row>

    </Container>
  )
}

export default Dashboard;
