
import React from 'react'
import './App.css'
import { SDMXChart, SDMXDashboard } from '../lib'
import { useEffect, useRef, useState } from 'react'
import { SDMXDashboardConfig } from '../lib/components/types'

function App() {

  const [language, setLanguage] = useState(document.documentElement.lang || 'en')
  const [pacificConfig, setPacificConfig] = useState<SDMXDashboardConfig>()

  const dash1Languages = {
    en: 'English',
    fr: 'French',
  }

  useEffect(() => {
    fetch('./PacificPopulation.json').then(response => response.json()).then((data) => {
      setPacificConfig(data)
    }).catch((e) => {
      console.log(e)
    })
  }, [])


  return (
    <>
      {/* <div className='border'>
        <select className="form-select w-50" aria-label="select language" value={language} onChange={(evt)=>setLanguage(evt.target.value)}>
          {Object.keys(dash1Languages).map((key: string) => (
            <option key={key} value={key}>{dash1Languages[key as keyof typeof dash1Languages]}</option>
          ))}
        </select>
        <SDMXDashboard url='./MyDashboard.json' lang={language}/>
      </div> */}
      <div>
        <select className="form-select w-50" aria-label="select language" value={language} onChange={(evt)=>setLanguage(evt.target.value)}>
          {Object.keys(dash1Languages).map((key: string) => (
            <option key={key} value={key}>{dash1Languages[key as keyof typeof dash1Languages]}</option>
          ))}
        </select>
        <SDMXDashboard config={pacificConfig} lang={language}/>
        </div> 
      <div>
        <SDMXChart config={{
          data: ["https://stats-sdmx-disseminate.pacificdata.org/rest/data/SPC,DF_WBWGI,1.0/A.AS+CK+FJ+GU+KI+MH+FM+NR+NU+PW+PG+WS+SB+TO+TV+VU.VA_EST?dimensionAtObservation=AllDimensions"],
          title: {
            text: "World Bank Worldwide Governance Indicator",
          },
          subtitle: {
            text: "Voice and Accountability"
          },
          id:"wgi_va_drilldown",
          type: "drilldown",
          xAxisConcept:"TIME_PERIOD",
          legend: {
            concept: "GEO_PICT"
          },
          yAxisConcept: "OBS_VALUE",
        }} language='en'/>
      </div>
      <div>
        <SDMXChart config={{
          data: ["https://stats-sdmx-disseminate.pacificdata.org/rest/data/SPC,DF_WBWGI,1.0/A.AS+CK+FJ+GU+KI+MH+FM+NR+NU+PW+PG+WS+SB+TO+TV+VU.RQ_EST+VA_EST?lastNObservations=1&dimensionAtObservation=AllDimensions"],
          title: {
            text: "World Bank Worldwide Governance Indicator",
          },
          subtitle: {
            text: "Voice and Accountability"
          },
          id:"wgi_va",
          type: "column",
          xAxisConcept:"INDICATOR",
          legend: {
            concept: "GEO_PICT",
            location: "bottom"
          },
          yAxisConcept: "OBS_VALUE",
        }} language='en'/>

      </div>
    </>
  )
}

export default App
