import React from "react"
import { SDMXChart } from "../../lib"
import { Tab, Tabs } from "react-bootstrap"
import { LiveEditor, LivePreview, LiveProvider } from "react-live"

const Line = () => {
    const content = [{
        id: "DC_TRF_TOTL",
        code: `<SDMXChart
            config={{
            subtitle: {
                text: "<a href='https://stats.pacificdata.org/vis?lc=en&df[ds]=SPC2&df[id]=DF_BP50&df[ag]=SPC&df[vs]=1.0&av=true&pd=2013%2C2023&lo=1&lom=LASTNOBSERVATIONS&dq=A.DC_TRF_TOTL.CK+FJ+FM+KI+MH+NR+NU+PF+PG+PW+SB+TO+TV+VU._T._T._T._T._T._T._Z._T&to[TIME_PERIOD]=false&ly[rs]=INDICATOR&ly[rw]=GEO_PICT%2CTIME_PERIOD' target='_blank'>Source PDH.stat</a>"
            }, data: ["https://stats-sdmx-disseminate.pacificdata.org/rest/data/DF_BP50/A.DC_TRF_TOTL.CK+FJ+FM+KI+MH+NR+NU+PF+PG+PW+SB+TO+TV+VU+WS._T._T._T._T._T._T._Z._T?dimensionAtObservation=AllDimensions"],
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
            language='en' />`
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

export default Line;
