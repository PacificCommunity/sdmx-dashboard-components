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
                "CK": "#E16A86",
                "FJ": "#D7765B",
                "FM": "#C7821C",
                "KI": "#AF8E00",
                "MH": "#909800",
                "NC": "#65A100",
                "NR": "#00A846",
                "NU": "#00AC74",
                "PF": "#00AD9A",
                "PG": "#00AABA",
                "PW": "#00A2D3",
                "SB": "#4495E2",
                "TO": "#9183E6",
                "TV": "#BD72DD",
                "VU": "#D766C9",
                "WF": "#E264AB"
                }
            },
            extraOptions: {
                yAxis: { name: "USD" },
                tooltip: { valueFormatter: (v) => \`\${v} USD\` }
            }
            }}
            language='en' />`
    }]
    const scope = {SDMXChart}
    return (
        <>
            {content.map((item) => (
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
