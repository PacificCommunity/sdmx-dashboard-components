import React from "react";
import { SDMXTable } from "../../lib";
import { LiveProvider, LivePreview, LiveEditor } from "react-live";
import { Tab, Tabs } from "react-bootstrap";

const Table = () => {
    const content = [{
        id: "SH_STA_MORT_TABLE",
        code: `<SDMXTable
        config={{
            "data": ["https://stats-sdmx-disseminate.pacificdata.org/rest/data/DF_BP50/A.SI_POV_DAY1.FJ+FM+KI+MH+NR+PG+SB+TO+TV+VU+WS.F+M.Y15T24+Y15T999+Y25T999+_T._T._T._T._T._Z._T?lastNObservations=1&dimensionAtObservation=AllDimensions"],
            "id": "SI_POV_DAY1_TABLE",
            "type": "table",
            "xAxisConcept": "GEO_PICT",
            "legend": {
                "concept": "SEX"
            },
            "categoryLabel": "Country",
            "title": {
                "text": "Proportion of population below the international poverty line"
            },
            "subtitle": {
                "text": "Source PDH.stat",
                "style": "italic"
            },
            "note": {
                "text": "Note that the figures are reported as a ratio to total population."
            },
            "decimals": 1
        }}
        language='en'
    />`
    }, {
        id: "SH_STA_MORT_TABLE",
        code: `<SDMXTable
        config={{
            data: ["https://stats-sdmx-disseminate.pacificdata.org/rest/data/DF_BP50/A.SH_STA_MORT.CK+FJ+FM+KI+MH+NC+NR+NU+PF+PG+PW+SB+TO+TV+VU+WS.F+_T._T._T._T._T._T._Z._T?dimensionAtObservation=AllDimensions"],
            id: "SH_STA_MORT_TABLE",
            type: "table",
            xAxisConcept: "GEO_PICT",
            legend: { concept: "SEX", location: "none" },
            categoryLabel: "Country",
            decimals: 1,
            colorPalette: {
                SEX: { F: "#e16a86", _T: "#00ad9a" }
            },
            title: { text: "Maternal mortality ratio" },
            subtitle: { text: "Source PDH.stat", style: "italic" },
            tooltip: {
                formatter: ({ name, seriesName, value, data, marker }) => {
                    const display = value == null || value === "" ? "N/A" : Number(value).toLocaleString("en");
                    const period = data.TIME_PERIOD ? " in " + data.TIME_PERIOD : "";
                    return name + "<br/>" + marker + seriesName + ": " + display + period;
                }
            }
        }}
        language='en'
    />`
    }]
    const scope = {SDMXTable}
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

export default Table
