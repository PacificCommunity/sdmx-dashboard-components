import React, { useState } from "react"
import { SDMXDashboard } from "../../lib"
import { Container, Row } from "react-bootstrap"

const normalizedBasePath = (import.meta.env.VITE_DEMO_BASE_PATH || '').replace(/^\/+|\/+$/g, '')
const demoBasePath = import.meta.env.PROD && normalizedBasePath ? `/${normalizedBasePath}` : ''
const withBasePath = (path: string) => `${demoBasePath}${path}`

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
            <SDMXDashboard url={withBasePath('/PacificPopulation.json')} lang={language}/>
        </Row>
        <Row>
            <SDMXDashboard url={withBasePath('/ExampleCLNew.json')} lang={language}/>
        </Row>
        <Row>
          <SDMXDashboard url={withBasePath('/pacific-economies-the-iran-oil-shock.json')} lang={language}/>
        </Row>

    </Container>
  )
}

export default Dashboard;
