import './App.css'
import { SDMXDashboard } from '../lib'
import { useState } from 'react'

function App() {

  const [language, setLanguage] = useState(document.documentElement.lang || 'en')

  const dash1Languages = {
    en: 'English',
    fr: 'French',
  }

  return (
    <>
      <div className='border'>
        <select className="form-select w-50" aria-label="select language" value={language} onChange={(evt)=>setLanguage(evt.target.value)}>
          {Object.keys(dash1Languages).map((key: string) => (
            <option key={key} value={key}>{dash1Languages[key as keyof typeof dash1Languages]}</option>
          ))}
        </select>
        <SDMXDashboard dashUrl='./MyDashboard.json' lang={language}/>
      </div>
      <div>
        <SDMXDashboard dashUrl='./PacificPopulation.json'/>
      </div>
    </>
  )
}

export default App
