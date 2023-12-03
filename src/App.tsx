import React from 'react';

import Cell from './components/cell';

import 'bootstrap/dist/css/bootstrap.css';
import './App.css';

function App() {

  // declare pageData type
  type pageDataType = {
    dashId: string,
    dashConfig: Array<any>
}

  const sampleConfig = {
    DashID: 'MyDashboard',
    Rows: [
      {
        Row: 0,
        chartType: 'TITLE',
        Title: ' The Labour Market at a glance, [Arial, 24, Bold, Italics, CENTER]',
        Subtitle: 'Example of a dashboard script with SDMX data, [Arial, 18, Italics, CENTER]',
        Unit: null,
        unitLoc: null,
        Decimals: null,
        LabelsYN: null,
        legendConcept: null,
        legendLoc: null,
        xAxisConcept: null,
        yAxisConcept: null,
        downloadYN: null,
        dataLink: null,
        metadataLink: null,
        DATA: null
      },
      {
        Row: 1,
        chartType: 'VALUE',
        Title: 'Unemployment rate, [DIN, 14, Bold, Italics, LEFT]',
        Subtitle: '{$TIME_PERIOD}, [DIN, 12, Bold, CENTER]',
        Unit: '%',
        unitLoc: 'SUFFIX',
        Decimals: '{$DECIMALS}',
        LabelsYN: 'No',
        legendConcept: null,
        legendLoc: null,
        xAxisConcept: null,
        yAxisConcept: null,
        downloadYN: null,
        dataLink: 'https://www.ilo.org/ilostat-files/WEB_bulk_download/indicator/UNE_DEAP_SEX_AGE_RT_A.csv.gz',
        metadataLink: ' https://data.ilo.org/vis?tm=DF_UNE_DEAP_SEX_AGE_RT&pg=0&hc[dataflowId]=DF_UNE_DEAP_SEX_AGE_RT&snb=1&df[ds]=ds-ilo-prod&df[id]=DF_UNE_DEAP_SEX_AGE_RT&df[ag]=ILO&df[vs]=1.0&pd=%2C2022&dq=.A..SEX_T.AGE_YTHADULT_YGE15%2BAGE_YTHADULT_Y15-64%2BAGE_YTHADULT_Y15-24%2BAGE_YTHADULT_YGE25&ly[cl]=AGE&ly[rw]=REF_AREA%2CTIME_PERIOD&lo=1',
        DATA: 'https://www.ilo.org/sdmx/rest/data/ILO,DF_UNE_DEAP_SEX_AGE_RT,1.0/CHL.A..SEX_T.AGE_YTHADULT_YGE15?endPeriod=2022&lastNObservations=1'
      },
      {
        Row: 1,
        chartType: 'VALUE',
        Title: 'Number of persons with multiple jobs in {$TIME_PERIOD},[DIN, 14, Bold, Italics, LEFT]',
        Subtitle: null,
        Unit: null,
        unitLoc: 'HIDE',
        Decimals: 0,
        LabelsYN: 'No',
        legendConcept: null,
        legendLoc: null,
        xAxisConcept: null,
        yAxisConcept: null,
        downloadYN: null,
        dataLink: null,
        metadataLink: null,
        DATA: 'https://www.ilo.org/sdmx/rest/data/ILO,DF_EES_TEES_SEX_MJH_NB,1.0/CHL.A..SEX_T.MJH_AGGREGATE_MULTI?endPeriod=2022&lastNObservations=1 * {UNIT_MULT}'
      },
      {
        Row: 1,
        chartType: 'VALUE',
        Title: 'NEET {$TIME_PERIOD},[DIN, 14, Bold, Italics, LEFT]',
        Subtitle: 'Youth not in employment, education or training',
        Unit: '%',
        unitLoc: 'SUFFIX',
        Decimals: 2,
        LabelsYN: 'No',
        legendConcept: null,
        legendLoc: null,
        xAxisConcept: null,
        yAxisConcept: null,
        downloadYN: null,
        dataLink: null,
        metadataLink: null,
        DATA: 'https://www.ilo.org/sdmx/rest/data/ILO,DF_EIP_NEET_SEX_RT,1.0/CHL.A..SEX_T?endPeriod=2022&lastNObservations=1'
      },
      {
        Row: 2,
        chartType: 'PIE',
        Title: 'Labour Force {$TIME_PERIOD}, [DIN, 14, Bold, Italics, LEFT]',
        Subtitle: null,
        Unit: '%',
        unitLoc: 'SUFFIX',
        Decimals: 0,
        LabelsYN: 'Yes',
        legendConcept: null,
        legendLoc: 'HIDE',
        xAxisConcept: 'MULTI',
        yAxisConcept: null,
        downloadYN: null,
        dataLink: null,
        metadataLink: null,
        DATA: [Array]
      },
      {
        Row: 2,
        chartType: 'VALUE',
        Title: '{$MEASURE}, [DIN, 14, Bold, Italics, LEFT]',
        Subtitle: null,
        Unit: null,
        unitLoc: 'HIDE',
        Decimals: '{$DECIMALS}',
        LabelsYN: 'No',
        legendConcept: null,
        legendLoc: null,
        xAxisConcept: null,
        yAxisConcept: null,
        downloadYN: null,
        dataLink: null,
        metadataLink: null,
        DATA: 'https://www.ilo.org/sdmx/rest/data/ILO,DF_LAI_INDE_NOC_RT,1.0/CHL.A.?endPeriod=2021&lastNObservations=1'
      },
      {
        Row: 2,
        chartType: 'PIE',
        Title: 'Employment,[DIN, 14, Bold, Italics, LEFT]',
        Subtitle: null,
        Unit: '%',
        unitLoc: 'SUFFIX',
        Decimals: 0,
        LabelsYN: 'Yes',
        legendConcept: null,
        legendLoc: 'HIDE',
        xAxisConcept: 'ECO',
        yAxisConcept: null,
        downloadYN: null,
        dataLink: null,
        metadataLink: null,
        DATA: 'https://www.ilo.org/sdmx/rest/data/ILO,DF_EMP_TEMP_SEX_ECO_NB,1.0/CHL.A..SEX_T.ECO_SECTOR_X+ECO_SECTOR_SER+ECO_SECTOR_IND+ECO_SECTOR_AGR?endPeriod=2022&lastNObservations=1'
      },
      {
        Row: 3,
        chartType: 'LINES, double',
        Title: 'Participation rates,[DIN, 14, Bold, Italics, CENTER]',
        Subtitle: null,
        Unit: null,
        unitLoc: null,
        Decimals: 0,
        LabelsYN: 'No',
        legendConcept: 'SEX',
        legendLoc: 'BOTTOM',
        xAxisConcept: 'TIME_PERIOD',
        yAxisConcept: 'OBS_VALUE',
        downloadYN: null,
        dataLink: null,
        metadataLink: null,
        DATA: 'https://www.ilo.org/sdmx/rest/data/ILO,DF_EAP_DWAP_SEX_AGE_RT,1.0/CHL.A..SEX_O+SEX_F+SEX_M+SEX_T.AGE_YTHADULT_YGE15?startPeriod=2010&endPeriod=2022'
      },
      {
        Row: 3,
        chartType: 'BARS',
        Title: 'Status in employment {$TIME_PERIOD}, [DIN, 14, Bold, Italics, LEFT]',
        Subtitle: null,
        Unit: null,
        unitLoc: 'HIDE',
        Decimals: 0,
        LabelsYN: 'Yes',
        legendConcept: null,
        legendLoc: 'HIDE',
        xAxisConcept: 'STE',
        yAxisConcept: 'OBS_VALUE',
        downloadYN: null,
        dataLink: null,
        metadataLink: null,
        DATA: 'https://www.ilo.org/sdmx/rest/data/ILO,DF_EMP_TEMP_SEX_AGE_STE_NB,1.0/CHL.A..SEX_T.AGE_YTHADULT_YGE15.STE_ICSE93_6+STE_ICSE93_5+STE_ICSE93_4+STE_ICSE93_3+STE_ICSE93_2+STE_ICSE93_1?endPeriod=2022&lastNObservations=1'
      }
    ]
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

// const loadAndParse = async (data: any): Promise<pageDataType> => {

const parseDashConfig = (data: any): pageDataType => {

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

const pageData: pageDataType = parseDashConfig(sampleConfig);



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
