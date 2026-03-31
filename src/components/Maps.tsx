import React from "react"
import { SDMXMap } from "../../lib"
import { LiveEditor, LivePreview, LiveProvider } from "react-live"
import { Tab, Tabs } from "react-bootstrap"

const Maps = () => {
    const content = [{
        id: "fuel-imports-map",
        code: `<SDMXMap
            config={{
              id: "fuel-imports-map",
              type: "map",
              title: {
                text: "🗺️ Fuel Import Dependency Across the Pacific"
              },
              subtitle: {
                text: "Total fuel imports as % of GDP — geographic vulnerability map"
              },
              note: {
                text: "Darker shading = higher fuel import dependency = greater vulnerability to price shocks."
              },
              legend: {
                concept: "INDICATOR"
              },
              xAxisConcept: "GEO_PICT",
              colorScheme: "Oranges",
              data: "https://stats-sdmx-disseminate.pacificdata.org/rest/data/DF_ENERGY/A...ENERGY_IND_011?dimensionAtObservation=AllDimensions&lastNObservations=1, {GEO_PICT} | https://geonode.pacificdata.org/geoserver/gwc/service/tms/1.0.0/geonode%3Aglobal_eez_200nm_split@EPSG%3A3857@pbf/{z}/{x}/{-y}.pbf, EPSG:3857, {iso_ter1}"
            }}
            language='en' />`
    }, {
        id: "population-map",
        code: `<SDMXMap
            config={{
              id: "population_map",
              type: "map",
              title: {
                text: "Population in the Pacific Region",
                size: "20px",
                weight: "bold",
                align: "center"
              },
              subtitle: {
                text: "{$TIME_PERIOD}",
                size: "13px",
                weight: "normal",
                align: "center"
              },
              xAxisConcept: "GEO_PICT",
              legend: {
                concept: "INDICATOR"
              },
              colorScheme: "Blues",
              data: "https://stats-sdmx-disseminate.pacificdata.org/rest/data/SPC,DF_POP_PROJ,3.0/A.AS+CK+FJ+PF+GU+KI+MH+FM+NR+NC+NU+MP+PW+PG+PN+WS+SB+TK+TO+TV+VU+WF.MIDYEARPOPEST._T._T?startPeriod=2023&endPeriod=2023&dimensionAtObservation=AllDimensions, {GEO_PICT} | https://www.spc.int/modules/contrib/spc_dot_stat_data/modules/spc_dot_stat_map/maps/eez.json, EPSG:3832, {id}"
            }}
            language='en' />`
    }, {
        id: "population-map-coastlines",
        code: `<SDMXMap
            config={{
              id: "population_map_coastlines",
              type: "map",
              title: {
                text: "Population in the Pacific Region with Coastlines",
                size: "20px",
                weight: "bold",
                align: "center"
              },
              subtitle: {
                text: "{$TIME_PERIOD}",
                size: "13px",
                weight: "normal",
                align: "center"
              },
              xAxisConcept: "GEO_PICT",
              legend: {
                concept: "INDICATOR"
              },
              colorScheme: "Blues",
              data: "https://stats-sdmx-disseminate.pacificdata.org/rest/data/SPC,DF_POP_PROJ,3.0/A.AS+CK+FJ+PF+GU+KI+MH+FM+NR+NC+NU+MP+PW+PG+PN+WS+SB+TK+TO+TV+VU+WF.MIDYEARPOPEST._T._T?startPeriod=2023&endPeriod=2023&dimensionAtObservation=AllDimensions, {GEO_PICT} | https://geonode.pacificdata.org/geoserver/gwc/service/tms/1.0.0/geonode%3Apacific_coastlines@EPSG%3A3857@pbf/{z}/{x}/{-y}.pbf, EPSG:3857, {iso_ter1_2}"
            }}
            language='en' />`
    }]
    const scope = { SDMXMap }
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

export default Maps
