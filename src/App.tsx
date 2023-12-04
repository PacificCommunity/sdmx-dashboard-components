import React, { useState, useEffect } from 'react';

import Cell from './components/cell';

import 'bootstrap/dist/css/bootstrap.css';
import './App.css';
import { set } from 'ol/transform';

// declare pageData type
type pageDataType = {
  dashId: string,
  dashConfig: Array<any>
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

const loadAndParse = async (sampleUrl: string): Promise<pageDataType> => {

  const dataJson = await fetch(sampleUrl);
  const data = await dataJson.json();

  let layout = new Array()
  let row = -1
  // store Footer row separately to append to final list
  const footerElement = data.Rows.filter((element: { chartType: string; }, index: number, arr: []) => {
    if (element.chartType === 'FOOTER') {
      arr.splice(index, 1)
      return true;
    }
    return false;
  })
  data.Rows.forEach((element: {
    Row: number;
    chartType: string;
    className?: string;
    colorScheme?: string;
  }) => {
    if (element.Row !== row) {
      row = element.Row
      layout[row] = new Array()
    }
    element.className = parseColSize(element.chartType)
    element.colorScheme = element.chartType.split(',')[2]?.trim()
    element.chartType = element.chartType.split(',')[0]
    layout[row].push(element)
  })

  layout[layout.length] = footerElement;
  // return pageDataType object
  return {
    dashId: data.dashID,
    dashConfig: layout
  }

}

const App = () => {

  const [pageData, setPageData] = useState({ dashId: '', dashConfig: [] });

  useEffect(() => {
    loadAndParse('https://gist.githubusercontent.com/stanozr/a7750415151cd406c5528c3b561f6d64/raw/cb222aa2787183d5470d478d9c9524afe26a71c4/MyDashTest.json').then((data) => {
      setPageData(data)
    })
  }, [])

  return (
    <div className="App">
      <div key={`container-${pageData.dashId}`} className="container-fluid mt-2">
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
      </div>
    </div>
  );
}

export default App;
