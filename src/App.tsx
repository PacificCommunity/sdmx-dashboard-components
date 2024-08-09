
import React, { Suspense } from 'react'
import './App.css'
import { SDMXChart, SDMXDashboard, SDMXMap } from '../lib'
import { useEffect, useRef, useState } from 'react'
import { SDMXDashboardConfig } from '../lib/components/types'
import 'bootstrap/dist/css/bootstrap.css';

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
        <SDMXChart config={{
          data: ["hist(https://stats-sdmx-disseminate-staging.pacificdata.org/rest/data/DF_BP50/.SH_H2O_IMPR.........?lastNObservations=1&dimensionAtObservation=AllDimensions)"],
          id: "SG_STT_FPOS", type: "pie", xAxisConcept: "GEO_PICT", yAxisConcept: "OBS_VALUE",
          legend: { 
            concept: "INDICATOR" 
          },
          extraOptions: { 
            plotOptions: { 
              pie: { 
                dataLabels: { 
                  enabled: false 
                }, 
                startAngle: -90,
                endAngle: 90,
                center: ["50%", "65%"],
                size: "140%",
                innerSize: "50%"
              } 
            },
            tooltip: {
              pointFormatter: function(point) { return `${this.binValue === 1 ? 'Yes' : 'No'}` }
            } 
          } 
        }} language='en' />
      </div>
      <div>
        <SDMXChart config={{
          data: ["hist(https://stats-sdmx-disseminate-staging.pacificdata.org/rest/data/DF_BP50/.SG_INF_ACCSS.........?lastNObservations=1&dimensionAtObservation=AllDimensions)"],
          subtitle: {
            text: "<a href='https://stats-staging.pacificdata.org/vis?lc=en&df[ds]=SPC2&df[id]=DF_BP50&df[ag]=SPC&df[vs]=1.0&av=true&pd=2013%2C2023&lo=1&lom=LASTNOBSERVATIONS&dq=A.DC_TRF_TOTL.._T._T._T._T._T._T._Z._T&to[TIME_PERIOD]=false&ly[rs]=INDICATOR&ly[rw]=GEO_PICT%2CTIME_PERIOD'>Source PDH.stat</a>",
          },
          id: "SG_INF_ACCSS",
          type: "pie",
          xAxisConcept: "GEO_PICT",
          legend: {
            concept: "INDICATOR",
            location: "bottom"
          },
          yAxisConcept: "OBS_VALUE",
          extraOptions: {
            plotOptions: {
              pie: {
                dataLabels: {
                  enabled: false
                },
                startAngle: -90,
                endAngle: 90,
                center: ['50%', '65%'],
                size: '140%',
                innerSize: '50%'
              }
            },
            tooltip: {
              pointFormatter: function(point) {
                return `${this.binValue === 1 ? "Yes" : "No"}`
              }
            }
          }
        }} language='en'/>
      </div>
      <div>
        <select className="form-select w-50" aria-label="select language" value={language} onChange={(evt)=>setLanguage(evt.target.value)}>
          {Object.keys(dash1Languages).map((key: string) => (
            <option key={key} value={key}>{dash1Languages[key as keyof typeof dash1Languages]}</option>
          ))}
        </select>
        <SDMXDashboard config={pacificConfig} lang={language}/>
      </div> 
      
      {/* <div>
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

      </div> */}
    </>
  )
}

export default App
