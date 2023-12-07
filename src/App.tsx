import React, { useState, useEffect } from 'react';

import Cell from './components/cell';

import 'bootstrap/dist/css/bootstrap.css';
import './App.css';
import { set } from 'ol/transform';
import Title from './components/title';
import { AnyMxRecord } from 'dns';

// declare pageData type
type pageDataType = {
  id: string,
  header: any,
  rows: Array<{columns: Array<any>}>,
  footer: any
}


const parseColSize = (chartExpr: string) => {
  let chartType = chartExpr.split(',')[0]
  if (chartType == 'TITLE' || chartType == 'FOOTER') {
    // Title and Footer are full width (3 columns)
    return 'col-12'
  }
  try {
    const colSize = chartExpr.split(',')[1].trim().toUpperCase();
    switch (colSize) {
      case 'DOUBLE':
        return 'col-12 col-md-8'
        break;
      case 'TRIPLE':
        return 'col-12'
        break;
      case 'SINGLE':
      default:
        return 'col-12 col-md-4'
        break;
    }
  } catch (e) { }
  // single by default
  return 'col-12 col-md-4'
}


const App = ({dashboardConfig}: {dashboardConfig: string}) => {

  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'fr', label: 'Francais' }
  ]

  const [pageData, setPageData] = useState<pageDataType>();
  const [language, setLanguage] = useState<string>(languageOptions[0].value);


  const handleChange = (e: any) => {
    setLanguage(e.target.value)
  }

  useEffect(() => {
    // loadAndParse('https://gist.githubusercontent.com/stanozr/a7750415151cd406c5528c3b561f6d64/raw/cb222aa2787183d5470d478d9c9524afe26a71c4/MyDashTest.json').then((data) => {
    //   setPageData(data)
    // })
    if(dashboardConfig.endsWith('.json')) {
      fetch(`${process.env.SERVER_URL}/api/config/${dashboardConfig}`).then(response => response.json()).then((data: pageDataType) => {
        setPageData(data)
      }).catch((e) => {
        console.log(e)
      })
    }
  }, [])

  return (
    <div className="App">
      {/* <div key={`container-${pageData.dashId}`} className="container-fluid mt-2">
        {
          pageData.dashConfig.map((row, index) => (
            <div key={`row-${index}`} className="row mb-3 display-flex">
              {
                row.map((element: any, index: string) => (
                  <Cell key={`col-${index}`} config={element} />
                )
                )
              }
            </div>
          ))
        }
      </div> */}
      { pageData ? (
          <div key={`container-${pageData.id}`} className="container-fluid mt-2">
            <select value={language} onChange={handleChange}>
              {languageOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            {
              pageData.header ?
                <div className="row mb-3 display-flex">
                  <Title config={pageData.header} />
                </div> : null
            }
            {
              pageData.rows.map((row, index_row) => (
                <div key={`row-${index_row}`} className="row mb-3 display-flex">
                  {
                    row.columns.map((cell, index_col) => (
                      <Cell key={`col-${cell.id}`} className={`col-md-${cell.bootstrapCol}`} language={language} config={cell} />
                    ))
                  }
                </div>
              ))
            }
            {
              pageData.footer ?
                <div className="row mb-3 display-flex">
                  <Title config={pageData.footer} />
                </div> : null
            }
          </div>
        ) : <div>Need to specify a dashboardConfig</div>
      }
    </div>
  );
}

export default App;
