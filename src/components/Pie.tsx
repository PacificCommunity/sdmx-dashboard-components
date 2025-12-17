import React from "react"
import { SDMXChart } from "../../lib"
import { LiveEditor, LivePreview, LiveProvider } from "react-live"
import { Tab, Tabs } from "react-bootstrap"

const Pie = () => {
    const content = [{
        id: "SG_REG_BRTHDETH",
        code: `<SDMXChart config={{
            data: ["hist(https://stats-sdmx-disseminate.pacificdata.org/rest/data/DF_BP50/.SG_REG_BRTHDETH.........?lastNObservations=1&dimensionAtObservation=AllDimensions)"],
            subtitle: {
                text: "<a href='https://stats.pacificdata.org/vis?lc=en&df[ds]=SPC2&df[id]=DF_BP50&df[ag]=SPC&df[vs]=1.0&av=true&pd=2013%2C2023&lo=1&lom=LASTNOBSERVATIONS&dq=A.DC_TRF_TOTL.._T._T._T._T._T._T._Z._T&to[TIME_PERIOD]=false&ly[rs]=INDICATOR&ly[rw]=GEO_PICT%2CTIME_PERIOD'>Source PDH.stat</a>",
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
                chart: { styledMode: true },
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
                        return ${'`'}\${this.binValue === 1 ? "Yes" : "No"}${'`'}
                    }
                }
            }
        }} language='en'/>`
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

export default Pie
