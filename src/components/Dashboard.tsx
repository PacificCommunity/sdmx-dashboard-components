import React, { useState } from "react"
import { SDMXDashboard } from "../../lib"
import { Container, Row } from "react-bootstrap"


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
            <SDMXDashboard url={process.env.NODE_ENV === 'production' ? '/sdmx-dashboard-components/PacificPopulation.json' : '/PacificPopulation.json'} lang={language}/>
        </Row>
        <Row>
            <SDMXDashboard url={process.env.NODE_ENV === 'production' ? '/sdmx-dashboard-components/ExampleCLNew.json' : '/ExampleCLNew.json'} lang={language}/>
        </Row>
        <Row>
          <SDMXDashboard url={process.env.NODE_ENV === 'production' ? '/sdmx-dashboard-components/pacific-economies-the-iran-oil-shock.json' : '/pacific-economies-the-iran-oil-shock.json'} lang={language}/>
        </Row>

    </Container>
  )
}

export default Dashboard;
