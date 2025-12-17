import React from "react"
import { SDMXChart, SDMXValue } from "../../lib"
import { LiveEditor, LivePreview, LiveProvider } from "react-live"
import { Tab, Tabs } from "react-bootstrap"

const Other = () => {
    const content = [{
        id: "EN_MAR_BEALITSQ",
        code: `<SDMXChart config={{
              data: ["https://stats-sdmx-disseminate.pacificdata.org/rest/data/DF_BP50/A.EN_MAR_BEALITSQ.FJ+FM+KI+MH+NC+PF+PW+SB+TO+VU+WS._T._T._T._T._T._T._Z._T?lastNObservations=1&dimensionAtObservation=AllDimensions"],
              id: "EN_MAR_BEALITSQ",
              type: "treemap",
              xAxisConcept: "GEO_PICT",
              legend: {
                concept: "INDICATOR",
                location: "none"
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
                  styledMode: true,
                },
                credits: {
                  enabled: false
                },
                plotOptions: {
                  treemap: {
                    colorByPoint: true
                  }
                }
              }
            }} language='en'/>`
    }, {
        id: "PGMS_tot",
        code: `<SDMXValue config={{
              id: "PGMS_tot",
              type: "value",
              decimals: "{$DECIMALS}",
              title: {
                text: "Programs approved and licensed by the Commission",
                size: "20px",
                weight: "bold",
              },
              subtitle: {
                text: "Period 2020 - 2023",
                color: "blue",
                size: "20px",
                align: "center",
                weight: "normal",
              },
              xAxisConcept: "GEO_PICT",
              unit: {
                text: "programs",
                location: "under"
              },
              labels: false,
              adaptiveTextSize: true,
              data: ["https://sdmx-jo.lmis.systems/rest/data/JO110,DF_APPPGM,1.0/.A.?startPeriod=2020&endPeriod=2020 + https://sdmx-jo.lmis.systems/rest/data/JO110,DF_APPPGM,1.0/.A.?startPeriod=2021&endPeriod=2021 + https://sdmx-jo.lmis.systems/rest/data/JO110,DF_APPPGM,1.0/.A.?startPeriod=2022&endPeriod=2022 + https://sdmx-jo.lmis.systems/rest/data/JO110,DF_APPPGM,1.0/.A.?startPeriod=2023&endPeriod=2023"]
            }} language='en'/>`
    }, {
        id: "DF_FOOD_SECURITY_HIES_2_sum",
        code: `<SDMXChart config={{
              data: ["https://stats-sdmx-disseminate.pacificdata.org/rest/data/SPC,DF_FOOD_SECURITY_HIES_2,1.0/A.VU+SB+KI.PRPHH._T._T._T._T._T.CROP?startPeriod=2013&endPeriod=2019&dimensionAtObservation=AllDimensions + https://stats-sdmx-disseminate.pacificdata.org/rest/data/SPC,DF_FOOD_SECURITY_HIES_2,1.0/A.VU+SB+KI.PRPHH._T._T._T._T._T.LIVE?startPeriod=2013&endPeriod=2019&dimensionAtObservation=AllDimensions + https://stats-sdmx-disseminate.pacificdata.org/rest/data/SPC,DF_FOOD_SECURITY_HIES_2,1.0/A.VU+SB+KI.PRPHH._T._T._T._T._T.FISH?startPeriod=2013&endPeriod=2019&dimensionAtObservation=AllDimensions + https://stats-sdmx-disseminate.pacificdata.org/rest/data/SPC,DF_FOOD_SECURITY_HIES_2,1.0/A.VU+SB+KI.PRPHH._T._T._T._T._T.HAND?startPeriod=2013&endPeriod=2019&dimensionAtObservation=AllDimensions"],
              id: "DF_FOOD_SECURITY_HIES_2_sum",
              type: "bar",
              xAxisConcept: "GEO_PICT",
              legend: {
                concept: "INDICATOR", location: "none"
              },
              extraOptions: {
                chart: { styledMode: true },
              },
              yAxisConcept: "OBS_VALUE",
            }} language='en'/>`
    }, {
        id: "EMPTOTAL",
        code: `<SDMXChart config={{
              data: ["https://nsi-demo-stable.siscc.org/rest/data/AU1,AUSTRALIAN_INDUSTRY,1.1.0/EMPTOTAL....?startPeriod=2013&dimensionAtObservation=AllDimensions * {UNIT_MULT}"],
              id: "EMPTOTAL",
              type: "drilldown",
              xAxisConcept: "INDUSTRY",
              drilldown: {
                xAxisConcept: "TIME_PERIOD",
              },
              legend: {
                concept: "MEASURE", location: "none"
              },
              extraOptions: {
                chart: { styledMode: true },
              },
              yAxisConcept: "OBS_VALUE",
            }} language='en'/>`
    }]
    const scope = {SDMXChart, SDMXValue}
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

export default Other
