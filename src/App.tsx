import React, { useState } from 'react';
import { Container, Form, Nav, Row } from 'react-bootstrap';
import { Link, useParams } from 'react-router';
import Dashboard from './components/Dashboard';
import Line from './components/Line';
import 'bootstrap/dist/css/bootstrap.css';
import './App.css'
import Column from './components/Column';
import Drilldown from './components/Drilldown';
import Pie from './components/Pie';
import Value from './components/Value';
import Lollipop from './components/Lollipop';
import Other from './components/Other';
import Maps from './components/Maps';

const App = () => {
  const { active_tab } = useParams();
  const [isDarkTheme, setIsDarkTheme] = useState(false)


  const tabs = {
    dashboard: {
      title: 'Dashboard',
      component: <Dashboard />,
    },
    line: {
      title: 'Line charts',
      component: <Line />,
    },
    column: {
      title: 'Column charts',
      component: <Column />,
    },
    drilldown: {
      title: 'Drilldown charts',
      component: <Drilldown />,
    },
    pie: {
      title: 'Pie charts',
      component: <Pie />,
    },
    value: {
      title: 'Value',
      component: <Value />,
    },
    lollipop: {
      title: 'Lollipop charts',
      component: <Lollipop />,
    },
    maps: {
      title: 'Maps',
      component: <Maps />,
    },
    other: {
      title: 'Other',
      component: <Other />,
    },
  }
  return (
    <>
    <Form>
      <Form.Check type='switch' id='theme-switch' label='Dark theme' onChange={() => setIsDarkTheme(!isDarkTheme)} />
    </Form>
    <Container data-bs-theme={isDarkTheme ? 'dark' : 'light'} className={isDarkTheme ? 'highcharts-dark' : 'highcharts-light'}>
      <Row>
        <h1>SDMX Visual Components Library</h1>
        <p>On this page, some examples of charts generated using the sdmx-dashboard-react library.</p>
        <p>All those chart present data pulled out from the <a href="https://spc.int" target="_blank">SPC</a> .stat instance: <a href="https://stats.pacificdata.org" target="_blank">PDH.stat</a>.</p>
        <p>Code used to generate this page can be found <a href="https://github.com/PacificCommunity/sdmx-dashboard-components/blob/main/src/App.tsx" target="_blank">here</a>.</p>
      </Row>
      <Nav variant="tabs" defaultActiveKey={active_tab || 'dashboard'}>
        {Object.keys(tabs).map((tab) => (
          <Nav.Item key={tab}>
            <Nav.Link as={Link} to={`/${tab}`}>{tabs[tab as keyof typeof tabs].title}</Nav.Link>
          </Nav.Item>
        ))}
      </Nav>
      <Row>
        {tabs[(active_tab || 'dashboard') as keyof typeof tabs].component}
      </Row>
    </Container>
    </>
  )
}

export default App;
