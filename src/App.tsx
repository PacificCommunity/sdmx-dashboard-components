import './App.css'
import { SDMXDashboard } from '../lib'

function App() {

  return (
    <>
      {/* <SDMXDashboard dashUrl='https://gist.githubusercontent.com/thhomas/c8dc5b6bfb13aca5aeeb1621c9971043/raw/51307429197a427bbafde6c6c07f5245cb2b37ce/dashboard.PacificPopulation.json'/> */}
      <SDMXDashboard dashUrl='https://gist.githubusercontent.com/thhomas/d7eeeb56d277aa1c2da36f17863eb869/raw/c09e372b67b16f4bdac1c58cc22e9fb03f65fc55/dashboard.MyDashboard.json'/>
    </>
  )
}

export default App
