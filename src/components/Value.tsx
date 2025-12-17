import React from "react"
import { SDMXValue } from "../../lib"
import { LiveEditor, LivePreview, LiveProvider } from "react-live"
import { Tab, Tabs } from "react-bootstrap"

const Value = () => {
    const content = [{
        id: "SH_STA_MALR",
        code: `<SDMXValue
            config={{
            id: "SH_STA_MALR",
            type: "value",
            xAxisConcept: "GEO_PICT",
            data: ["count(https://stats-sdmx-disseminate.pacificdata.org/rest/data/DF_BP50/A.SH_STA_MALR.CK+FJ+FM+KI+MH+NC+NR+NU+PF+PG+PW+SB+TO+TV+VU+WS._T._T._T._T._T._T._Z._T?lastNObservations=1&dimensionAtObservation=AllDimensions !== 0)"],
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
            style={{ width: "120px", margin: "auto", padding: "1rem", borderRadius: "50%", aspectRatio: "1 / 1"}}
            valueClassName="bg-warning" />`
    }]
    const scope = {SDMXValue}
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

export default Value
