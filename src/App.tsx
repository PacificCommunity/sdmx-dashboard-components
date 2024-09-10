
import React, { Suspense } from 'react'
import './App.css'
import { SDMXChart, SDMXDashboard, SDMXMap, SDMXValue } from '../lib'
import { useEffect, useRef, useState } from 'react'
import { SDMXDashboardConfig } from '../lib/components/types'
import 'bootstrap/dist/css/bootstrap.css';
import { Container, Row, Tab, Tabs } from 'react-bootstrap'
import Form from 'react-bootstrap/Form'
import 'highcharts/css/highcharts.css';

function App() {

  const [language, setLanguage] = useState(document.documentElement.lang || 'en')
  const [pacificConfig, setPacificConfig] = useState<SDMXDashboardConfig>()
  const [isDarkTheme, setIsDarkTheme] = useState(false)

  const dash1Languages = {
    en: 'English',
    fr: 'French',
  }

  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('./PacificPopulation.json').then(response => response.json()).then((data) => {
      setPacificConfig(data)
    }).catch((e) => {
      console.log(e)
    })
  }, [])

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
        <p>Code used to generate this page can be found <a href="https://github.com/stanozr/sdmx-dashboard-react/blob/main/src/App.tsx" target="_blank">here</a>.</p>
      </Row>
      <Row>

      <Tabs
        defaultActiveKey="dashboard"
        id="ex-nav-tab"
        className='mb-3'
      >
        <Tab eventKey={'dashboard'} title="Dashboard">
          <div>
            <select className="form-select w-50" aria-label="select language" value={language} onChange={(evt)=>setLanguage(evt.target.value)}>
              {Object.keys(dash1Languages).map((key: string) => (
                <option key={key} value={key}>{dash1Languages[key as keyof typeof dash1Languages]}</option>
              ))}
            </select>
            <SDMXDashboard url='./PacificPopulation.json' lang={language}/>
          </div>
          <div>
            <SDMXDashboard url='./ExampleCLNew.json' lang={language}/>
          </div>

        </Tab>
        <Tab eventKey={'line'} title="Line charts">
            <SDMXChart 
              config={{
                subtitle: {
                  text: "<a href='https://stats-staging.pacificdata.org/vis?lc=en&df[ds]=SPC2&df[id]=DF_BP50&df[ag]=SPC&df[vs]=1.0&av=true&pd=2013%2C2023&lo=1&lom=LASTNOBSERVATIONS&dq=A.DC_TRF_TOTL.CK+FJ+FM+KI+MH+NR+NU+PF+PG+PW+SB+TO+TV+VU._T._T._T._T._T._T._Z._T&to[TIME_PERIOD]=false&ly[rs]=INDICATOR&ly[rw]=GEO_PICT%2CTIME_PERIOD' target='_blank'>Source PDH.stat</a>"
                }, data: ["https://stats-sdmx-disseminate-staging.pacificdata.org/rest/data/DF_BP50/A.DC_TRF_TOTL.CK+FJ+FM+KI+MH+NR+NU+PF+PG+PW+SB+TO+TV+VU+WS._T._T._T._T._T._T._Z._T?dimensionAtObservation=AllDimensions"], 
                id: "DC_TRF_TOTL",
                type: "line",
                xAxisConcept: "TIME_PERIOD",
                legend: {
                  concept: "GEO_PICT", 
                  location: "right"
                },
                yAxisConcept: "OBS_VALUE", 
                colorPalette: {
                  "GEO_PICT": {
                    "CK": 0,
                    "FJ": 1,
                    "FM": 2,
                    "KI": 3,
                    "MH": 4,
                    "NC": 5,
                    "NR": 6,
                    "NU": 7,
                    "PF": 8,
                    "PG": 9,
                    "PW": 10,
                    "SB": 11,
                    "TO": 12,
                    "TV": 13,
                    "VU": 14,
                    "WF": 15
                  }
                },
                extraOptions: {
                  chart: {
                    styledMode: true
                  },
                  credits: {
                    enabled: false
                  }, 
                  yAxis: {
                    title: {
                      text: "USD"
                    }
                  }, 
                  tooltip: {
                    valueSuffix: " USD"
                  }
                }
              }} 
              language='en' />
          </Tab>
          <Tab eventKey={'column'} title="Column charts">
            <SDMXChart
              config={{"data": ["https://stats-sdmx-disseminate.pacificdata.org/rest/data/DF_BP50/A.EG_ACS_ELEC.CK+FJ+FM+KI+MH+NC+NR+NU+PF+PG+PW+SB+TO+TV+VU+WS._T._T.R+U._T._T._T._Z._T?dimensionAtObservation=AllDimensions"], "id": "EG_ACS_ELEC", "type": "drilldown", "xAxisConcept": "GEO_PICT", "legend": {"concept": "URBANIZATION", "location": "bottom"}, "drilldown": {"xAxisConcept": "TIME_PERIOD"}, "colorPalette": {"URBANIZATION": {"R": "#E16A86", "U": "#00AD9A"}}, "yAxisConcept": "OBS_VALUE", "extraOptions": {"credits": {"enabled": false}, "yAxis": {"title": {"text": "ratio to total population"}, "max": 100}, "tooltip": {"valueSuffix": " ratio to total population", "pointFormatter": "function() { if (this.drilldown) { return `${this.y}${this.series.tooltipOptions.valueSuffix} in ${this.TIME_PERIOD}`; } else { return `${this.y}${this.series.tooltipOptions.valueSuffix}`; } }", "pointFormat": "{series.name}: {point.y} in {point.TIME_PERIOD}"}, "drilldown": {"activeDataLabelStyle": {"textDecoration": "none", "color": "black"}, "activeAxisLabelStyle": {"textDecoration": "none", "color": "black"}}, "plotOptions": {"column": {"dataLabels": {"enabled": true, "style": {"color": "contrast", "textOutline": "0px", "fontWeight": "normal"}}}}}, "subtitle": {"text": "<a href='https://stats.pacificdata.org/vis?lc=en&df[ds]=SPC2&df[id]=DF_BP50&df[ag]=SPC&df[vs]=1.0&av=true&pd=2013%2C2023&lo=1&lom=LASTNOBSERVATIONS&dq=A.EG_ACS_ELEC.CK+FJ+FM+KI+MH+NC+NR+NU+PF+PG+PW+SB+TO+TV+VU+WS._T._T.R+U._T._T._T._Z._T&to[TIME_PERIOD]=false&ly[rs]=INDICATOR&ly[rw]=GEO_PICT%2CTIME_PERIOD' target='_blank'>Source PDH.stat</a>"}}}
              language='en'
            />
            <SDMXChart
              config={{"data": ["https://stats-sdmx-disseminate-staging.pacificdata.org/rest/data/DF_BP50/A.SE_ACC_HNDWSH.CK+FJ+FM+MH+NR+NU+PW+TO+TV+WS._T._T._T._T._T._T.PRIMARY_ALL+SECONDARY_LOWER+SECONDARY_UPPER._T?lastNObservations=1&dimensionAtObservation=AllDimensions"], "id": "SE_ACC_HNDWSH", "type": "column", "xAxisConcept": "GEO_PICT", "legend": {"concept": "COMPOSITE_BREAKDOWN", "location": "bottom"}, "yAxisConcept": "OBS_VALUE", 
                "extraOptions": {
                  "chart": {
                    "styledMode": true
                  },
                  "credits": {
                    "enabled": false
                  }, 
                  "yAxis": {
                    "title": {"text": "percent"}, "max": 100
                  }, 
                  "tooltip": {
                    "valueSuffix": " %", "pointFormat": "{series.name}: {point.y} in {point.TIME_PERIOD}"
                  }, 
                  "plotOptions": {
                    "column": {"dataLabels": {"enabled": true, "style": {"color": "contrast", "textOutline": "0px", "fontWeight": "normal"}}}
                  }
                }, 
                "subtitle": {"text": "<a href='https://stats-staging.pacificdata.org/vis?lc=en&df[ds]=SPC2&df[id]=DF_BP50&df[ag]=SPC&df[vs]=1.0&av=true&pd=2013%2C2023&lo=1&lom=LASTNOBSERVATIONS&dq=A.SE_ACC_HNDWSH.CK+FJ+FM+MH+NR+NU+PW+TO+TV+WS._T._T._T._T._T._T.PRIMARY_ALL+SECONDARY_LOWER+SECONDARY_UPPER._T&to[TIME_PERIOD]=false&ly[rs]=INDICATOR&ly[rw]=GEO_PICT%2CTIME_PERIOD' target='_blank'>Source PDH.stat</a>"}, 
                "colorPalette": {
                  "COMPOSITE_BREAKDOWN": {
                    "SECONDARY_LOWER": 0, 
                    "PRIMARY_ALL": 1, 
                    "SECONDARY_UPPER": 2
                  }
                },
              }}
              language='en'
            />
            <SDMXChart
              config={{
                data: ["https://stats-sdmx-disseminate-staging.pacificdata.org/rest/data/DF_BP50/A.SI_POV_DAY1.FJ+FM+KI+MH+NR+PG+SB+TO+TV+VU+WS.F+M.Y15T24+Y15T999+Y25T999+_T._T._T._T._T._Z._T?lastNObservations=1&dimensionAtObservation=AllDimensions"], 
                id: "SI_POV_DAY1", 
                type: "column", 
                xAxisConcept: "GEO_PICT", 
                legend: {
                  concept: "SEX", 
                  location: "bottom"
                }, 
                yAxisConcept: "OBS_VALUE",
                colorPalette: {
                  SEX: {
                    M: 0, 
                    F: 1 
                  }
                },
                extraOptions: {
                  chart: {
                    styledMode: true
                  },
                  credits: {
                    enabled: false
                  }, 
                  yAxis: {
                    title: {
                      text: "per 100,000 population"
                    }
                  }, 
                  tooltip: {
                    valueSuffix: " per 100,000 population",
                    pointFormat: "{series.name}: {point.y} in {point.TIME_PERIOD}"
                  },
                  plotOptions: {
                    column: {
                      dataLabels: {
                        enabled: true, 
                        style: {
                          color: "contrast", 
                          textOutline: "0px", 
                          fontWeight: "normal"
                        }
                      }
                    }
                  }
                } 
              }}
              language='en'
            />
          </Tab>
          <Tab eventKey={'drilldown'} title="Drilldown charts">
            <SDMXChart
              config={{
                data: ["https://stats-sdmx-disseminate-staging.pacificdata.org/rest/data/DF_BP50/A.SH_STA_MORT.CK+FJ+FM+KI+MH+NC+NR+NU+PF+PG+PW+SB+TO+TV+VU+WS.F._T._T._T._T._T._Z._T?dimensionAtObservation=AllDimensions"],
                id: "SH_STA_MORT", "type": "drilldown", "xAxisConcept": "GEO_PICT", "legend": {"concept": "INDICATOR", "location": "none"}, "drilldown": {"xAxisConcept": "TIME_PERIOD"}, "colorPalette": {"GEO_PICT": {"CK": "#E16A86", "FJ": "#D7765B", "FM": "#C7821C", "KI": "#AF8E00", "MH": "#909800", "NC": "#65A100", "NR": "#00A846", "NU": "#00AC74", "PF": "#00AD9A", "PG": "#00AABA", "PW": "#00A2D3", "SB": "#4495E2", "TO": "#9183E6", "TV": "#BD72DD", "VU": "#D766C9", "WF": "#E264AB"}}, "yAxisConcept": "OBS_VALUE", "extraOptions": {"credits": {"enabled": false}, "yAxis": {"title": {"text": "per 100,000 live births"}}, "tooltip": {"valueSuffix": " per 100,000 live births" }, "drilldown": {"activeDataLabelStyle": {"textDecoration": "none", "color": "black"}, "activeAxisLabelStyle": {"textDecoration": "none", "color": "black"}}, "plotOptions": {"column": {"dataLabels": {"enabled": true, "style": {"color": "contrast", "textOutline": "0px", "fontWeight": "normal"}}}}}, "subtitle": {"text": "<a href='https://stats-staging.pacificdata.org/vis?lc=en&df[ds]=SPC2&df[id]=DF_BP50&df[ag]=SPC&df[vs]=1.0&av=true&pd=2013%2C2023&lo=1&lom=LASTNOBSERVATIONS&dq=A.SH_STA_MORT.CK+FJ+FM+KI+MH+NC+NR+NU+PF+PG+PW+SB+TO+TV+VU+WS.F._T._T._T._T._T._Z._T&to[TIME_PERIOD]=false&ly[rs]=INDICATOR&ly[rw]=GEO_PICT%2CTIME_PERIOD' target='_blank'>Source PDH.stat</a>"}}}
              language='en'
            />
            <SDMXChart config={{
              data: ["https://stats-sdmx-disseminate-staging.pacificdata.org/rest/data/SPC,DF_BP50,1.0/A.SL_TLF_NEET..M+F+_T.Y15T24._T._T._T._T._Z._T?lastNObservations=1"],
              title: {
                text: "Youth NEET"
              },
              id:"SL_TLF_NEET",
              type: "drilldown",
              xAxisConcept:"GEO_PICT",
              legend: {
                concept: "INDICATOR"
              },
              drilldown: {
                xAxisConcept: "SEX",
              },
              colorPalette: {
                "INDICATOR": {
                  "SL_TLF_NEET": "#726f5c"
                },
                "SEX": {
                  "_T": '#E16A86',
                  "M": '#fecba1',
                  "F": '#c5b3e6'
                }
              },
              yAxisConcept: "OBS_VALUE",
              extraOptions: {
                colors: ["#726f5c"],
                yAxis: {
                  title: {
                    text: "per 1,000 live births"
                  }
                },
                plotOptions: {
                  column: {
                    colorByPoint: true
                  }
                },
                tooltip: {
                  valueSuffix: " per 1,000 live births",
                  pointFormat: "{series.name}: {point.y} in {point.TIME_PERIOD}"
                },
              }
            }} language='en'/>
            <SDMXChart config={{
              subtitle: {
                text: "<a href='https://stats-staging.pacificdata.org/vis?lc=en&df[ds]=SPC2&df[id]=DF_BP50&df[ag]=SPC&df[vs]=1.0&av=true&pd=2013%2C2023&lo=1&lom=LASTNOBSERVATIONS&dq=A.SG_GEN_PARL.CK+FJ+FM+KI+MH+NC+NR+NU+PF+PG+PW+SB+TO+TV+VU+WS.F._T._T._T._T._T._Z._T&to[TIME_PERIOD]=false&ly[rs]=INDICATOR&ly[rw]=GEO_PICT%2CTIME_PERIOD' target='_blank'>Source PDH.stat</a>"
              }, 
              data: ["https://stats-sdmx-disseminate-staging.pacificdata.org/rest/data/DF_BP50/A.SG_GEN_PARL.CK+FJ+FM+KI+MH+NC+NR+NU+PF+PG+PW+SB+TO+TV+VU+WS.F._T._T._T._T._T._Z._T?dimensionAtObservation=AllDimensions"], 
              id: "SG_GEN_PARL",
              type: "drilldown",
              xAxisConcept: "GEO_PICT",
              legend: {
                concept: "INDICATOR"
              },
              drilldown: {
                xAxisConcept: "TIME_PERIOD"
              }, 
              yAxisConcept: "OBS_VALUE",
              colorPalette: {
                "GEO_PICT": {
                  "CK": 0,
                  "FJ": 1,
                  "FM": 2,
                  "KI": 3,
                  "MH": 4,
                  "NC": 5,
                  "NR": 6,
                  "NU": 7,
                  "PF": 8,
                  "PG": 9,
                  "PW": 10,
                  "SB": 11,
                  "TO": 12,
                  "TV": 13,
                  "VU": 14,
                  "WF": 15
                },
                "INDICATOR": {
                  "SG_GEN_PARL": 0 
                }
              },
              extraOptions: {
                credits: {
                  enabled: false
                }, 
                yAxis: {
                  title: {
                    text: "percent"
                  }, 
                  max: 100
                }, 
                tooltip: {
                  valueSuffix: " %", 
                  pointFormat: "{point.y} in {point.TIME_PERIOD}"
                }, 
                drilldown: {
                  activeAxisLabelStyle: {
                    cursor: "pointer", 
                    textDecoration: "none"
                  }
                },
                plotOptions: {
                  column: {
                    dataLabels: {
                      enabled: true, 
                      style: {
                        color: "contrast", 
                        textOutline: "0px", 
                        fontWeight: "normal"
                      }
                    }
                  }
                }
              }
            }}
            language='en'/>
            <SDMXChart 
              config={{
                data: ["https://stats-sdmx-disseminate-staging.pacificdata.org/rest/data/DF_BP50/A.SH_DYN_MORT.CK+FJ+FM+KI+MH+NC+NR+NU+PG+PW+SB+TO+TV+VU+WS.F+M.Y00T04._T._T._T._T._Z._T?dimensionAtObservation=AllDimensions"], 
                id: "SH_DYN_MORT", type: "drilldown",
                xAxisConcept: "GEO_PICT", 
                legend: {
                  concept: "SEX", 
                  location: "bottom"
                }, 
                drilldown: {
                  xAxisConcept: "TIME_PERIOD"
                }, 
                colorPalette: {
                  SEX: {
                    M: "#fecba1", 
                    F: "#c5b3e6"
                  }
                }, 
                yAxisConcept: "OBS_VALUE", 
                extraOptions: {
                  credits: {"enabled": false}, 
                  yAxis: {"title": {"text": "per 1,000 live births"}}, 
                  tooltip: {
                    pointFormat: "{series.name}: {point.y} in {point.TIME_PERIOD}"
                  },
                  drilldown: {activeDataLabelStyle: {"textDecoration": "none", "color": "black"}, activeAxisLabelStyle: {"textDecoration": "none", "color": "black"}},
                }
              }}
              language='en'
            />
          </Tab>
          <Tab eventKey={'pie'} title="Pie charts">
            <SDMXChart config={{
              data: ["hist(https://stats-sdmx-disseminate-staging.pacificdata.org/rest/data/DF_BP50/.SG_REG_BRTHDETH.........?lastNObservations=1&dimensionAtObservation=AllDimensions)"],
              subtitle: {
                text: "<a href='https://stats-staging.pacificdata.org/vis?lc=en&df[ds]=SPC2&df[id]=DF_BP50&df[ag]=SPC&df[vs]=1.0&av=true&pd=2013%2C2023&lo=1&lom=LASTNOBSERVATIONS&dq=A.DC_TRF_TOTL.._T._T._T._T._T._T._Z._T&to[TIME_PERIOD]=false&ly[rs]=INDICATOR&ly[rw]=GEO_PICT%2CTIME_PERIOD'>Source PDH.stat</a>",
              },
              id: "SG_REG_BRTHDETH",
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
          </Tab>
          <Tab eventKey={'value'} title="Value">
            <SDMXValue 
              config={{
                id: "SH_STA_MALR",
                type: "value",
                xAxisConcept: "GEO_PICT",
                data: ["count(https://stats-sdmx-disseminate-staging.pacificdata.org/rest/data/DF_BP50/A.SH_STA_MALR.CK+FJ+FM+KI+MH+NC+NR+NU+PF+PG+PW+SB+TO+TV+VU+WS._T._T._T._T._T._T._Z._T?lastNObservations=1&dimensionAtObservation=AllDimensions !== 0)"],
                unit: {
                  text: "countries", 
                  location: "under"
                },
                adaptiveTextSize: true,
                subtitle: {
                  text: "<a href=''>Source PDH.stat</a>",
                  weight: "light",
                  size: "16px"
                }
              }}
              language='en'
              style={{ width: "120px", backgroundColor: "blue", margin: "auto", padding: "1rem", borderRadius: "50%", aspectRatio: "1 / 1"}} />

          </Tab>
          <Tab eventKey={'lollipop'} title="Lollipop charts">
            <SDMXChart
              config={{
                data: ["https://stats-sdmx-disseminate-staging.pacificdata.org/rest/data/DF_BP50/A.SG_DSR_LEGREG.CK+FJ+FM+KI+MH+NC+NR+NU+PF+PG+PW+SB+TO+TV+VU+WS._T._T._T._T._T._T._Z._T?lastNObservations=1&dimensionAtObservation=AllDimensions"],
                id: "SG_DSR_LEGREG",
                type: "lollipop",
                xAxisConcept: "GEO_PICT", 
                legend: {
                  concept: "INDICATOR", location: "none"
                }, 
                yAxisConcept: "OBS_VALUE",
                extraOptions: {
                  colors: ["#726f5c"],
                  credits: {
                    enabled: false},
                    yAxis: {
                      title: {
                        text: "Boolean or binary measure"
                      }
                    },
                    tooltip: {
                      valueSuffix: " Boolean or binary measure"
                    }
                  }, 
              }}
              language='en'
            />
          </Tab>
        </Tabs>
      </Row>
    </Container>
    </>
  )
}

export default App
