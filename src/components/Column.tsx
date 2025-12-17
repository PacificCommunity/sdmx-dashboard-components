import React from "react";
import { SDMXChart } from "../../lib";
import { LiveProvider, LivePreview, LiveEditor } from "react-live";
import { Tab, Tabs } from "react-bootstrap";


const Column = () => {
    const content = [{
        id: "EG_ACS_ELEC",
        code: `<SDMXChart
        config={{
            "data": ["https://stats-sdmx-disseminate.pacificdata.org/rest/data/DF_BP50/A.EG_ACS_ELEC.CK+FJ+FM+KI+MH+NC+NR+NU+PF+PG+PW+SB+TO+TV+VU+WS._T._T.R+U._T._T._T._Z._T?dimensionAtObservation=AllDimensions"],
            "id": "EG_ACS_ELEC",
            "type": "column",
            "xAxisConcept": "GEO_PICT",
            "legend": {
                "concept": "URBANIZATION",
                "location": "bottom"
            },
            "colorPalette": {
                "URBANIZATION": {
                    "R": "#E16A86",
                    "U": "#00AD9A"
                }
            },
            "yAxisConcept": "OBS_VALUE",
            "extraOptions": {
                "credits": {
                    "enabled": false
                },
                "chart": {
                    "styledMode": true
                },
                "yAxis": {
                    "title": {
                        "text": "ratio to total population"
                    },
                    "max": 100
                },
                "tooltip": {
                    "valueSuffix": " ratio to total population"
                },
                "plotOptions": {
                    "column": {
                        "dataLabels": {
                            "enabled": true,
                            "style": {
                                "color": "contrast",
                                "textOutline": "0px",
                                "fontWeight": "normal"
                            }
                        }
                    }
                }
            },
            "subtitle": {
                "text": "<a href='https://stats.pacificdata.org/vis?lc=en&df[ds]=SPC2&df[id]=DF_BP50&df[ag]=SPC&df[vs]=1.0&av=true&pd=2013%2C2023&lo=1&lom=LASTNOBSERVATIONS&dq=A.EG_ACS_ELEC.CK+FJ+FM+KI+MH+NC+NR+NU+PF+PG+PW+SB+TO+TV+VU+WS._T._T.R+U._T._T._T._Z._T&to[TIME_PERIOD]=false&ly[rs]=INDICATOR&ly[rw]=GEO_PICT%2CTIME_PERIOD' target='_blank'>Source PDH.stat</a>"
            }
        }}
        language='en'
    />`
    }, {
        id: "SE_ACC_HNDWSH",
        code: `<SDMXChart
        config={{
            "data": ["https://stats-sdmx-disseminate.pacificdata.org/rest/data/DF_BP50/A.SE_ACC_HNDWSH.CK+FJ+FM+MH+NR+NU+PW+TO+TV+WS._T._T._T._T._T._T.PRIMARY_ALL+SECONDARY_LOWER+SECONDARY_UPPER._T?lastNObservations=1&dimensionAtObservation=AllDimensions"],
            "id": "SE_ACC_HNDWSH",
            "type": "column",
            "xAxisConcept": "GEO_PICT",
            "legend": {
                "concept": "COMPOSITE_BREAKDOWN",
                "location": "bottom"
            },
            "yAxisConcept": "OBS_VALUE",
            "extraOptions": {
                "chart": {
                    "styledMode": true
                },
                "credits": {
                    "enabled": false
                },
                "yAxis": {
                    "title": {
                        "text": "percent"
                    },
                    "max": 100
                },
                "tooltip": {
                    "valueSuffix": " %",
                    "pointFormat": "{series.name}: {point.y} in {point.TIME_PERIOD}"
                },
                "plotOptions": {
                    "column": {
                        "dataLabels": {
                            "enabled": true,
                            "allowOverlap": true,
                            "style": {
                                "color": "contrast",
                                "textOutline": "0px",
                                "fontWeight": "normal"
                            }
                        }
                    }
                }
            },
            "subtitle": {
                "text": "<a href='https://stats.pacificdata.org/vis?lc=en&df[ds]=SPC2&df[id]=DF_BP50&df[ag]=SPC&df[vs]=1.0&av=true&pd=2013%2C2023&lo=1&lom=LASTNOBSERVATIONS&dq=A.SE_ACC_HNDWSH.CK+FJ+FM+MH+NR+NU+PW+TO+TV+WS._T._T._T._T._T._T.PRIMARY_ALL+SECONDARY_LOWER+SECONDARY_UPPER._T&to[TIME_PERIOD]=false&ly[rs]=INDICATOR&ly[rw]=GEO_PICT%2CTIME_PERIOD' target='_blank'>Source PDH.stat</a>"
            },
            "colorPalette": {
                "COMPOSITE_BREAKDOWN": {
                    "SECONDARY_LOWER": 0,
                    "PRIMARY_ALL": 1,
                    "SECONDARY_UPPER": 2
                }
            }
        }}
    language='en'
    />`
    }, {
        id: "SI_POV_DAY1",
        code: `<SDMXChart
        config={{
            data: ["https://stats-sdmx-disseminate.pacificdata.org/rest/data/DF_BP50/A.SI_POV_DAY1.FJ+FM+KI+MH+NR+PG+SB+TO+TV+VU+WS.F+M.Y15T24+Y15T999+Y25T999+_T._T._T._T._T._Z._T?lastNObservations=1&dimensionAtObservation=AllDimensions"],
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
    />`
    }]
    const scope = {SDMXChart}
    return (
        <>
            {content.map((item: any) => (
                <div key={item.id} className="border rounded p-3 d-flex flex-column code-tabs mt-3">
                    <LiveProvider code={item.code} scope={scope} disabled={true}>
                        <Tabs>
                            <Tab eventKey="preview" title="Preview">
                                <LivePreview />
                            </Tab>
                            <Tab eventKey="editor" title="Code">
                                <LiveEditor className="text-start" />
                            </Tab>
                        </Tabs>
                    </LiveProvider>
                </div>
            ))}
        </>
    )
}

export default Column;
