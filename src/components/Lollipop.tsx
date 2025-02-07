import React from "react"
import { SDMXChart } from "../../lib"
import { LiveEditor, LivePreview, LiveProvider } from "react-live"
import { Tab, Tabs } from "react-bootstrap"

const Lollipop = () => {
    const content = [{
        id: "SG_DSR_LEGREG",
        code: `<SDMXChart
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

export default Lollipop