import './App.css'
import { SDMXDashboard } from '../lib'

function App() {

  return (
    <>
      <SDMXDashboard dashUrl='./MyDashboard.json'/>
      <SDMXDashboard dashUrl='./PacificPopulation.json'/>
    </>
  )
}

export default App
