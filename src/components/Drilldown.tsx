import React from 'react';
import { SDMXChart } from '../../lib';
import { LivePreview, LiveEditor, LiveProvider } from 'react-live';
import { Tab, Tabs } from 'react-bootstrap';

const Drilldown = () => {

    const content = [{
        id: "SH_STA_MORT",
        code: `<SDMXChart
            config={{
            data: ["https://stats-sdmx-disseminate.pacificdata.org/rest/data/DF_BP50/A.SH_STA_MORT.CK+FJ+FM+KI+MH+NC+NR+NU+PF+PG+PW+SB+TO+TV+VU+WS.F._T._T._T._T._T._Z._T?dimensionAtObservation=AllDimensions"],
            id: "SH_STA_MORT",
            type: "drilldown",
            xAxisConcept: "GEO_PICT",
            legend: {"concept": "INDICATOR", "location": "none"},
            drilldown: {"xAxisConcept": "TIME_PERIOD"},
            colorPalette: {"GEO_PICT": {"CK": "#E16A86", "FJ": "#D7765B", "FM": "#C7821C", "KI": "#AF8E00", "MH": "#909800", "NC": "#65A100", "NR": "#00A846", "NU": "#00AC74", "PF": "#00AD9A", "PG": "#00AABA", "PW": "#00A2D3", "SB": "#4495E2", "TO": "#9183E6", "TV": "#BD72DD", "VU": "#D766C9", "WF": "#E264AB"}},
            yAxisConcept: "OBS_VALUE",
            labels: true,
            extraOptions: {
                yAxis: {"name": "per 100,000 live births"},
                tooltip: {"valueFormatter": (v) => \`\${Number(v).toLocaleString('en')} per 100,000 live births\`}
            }, "subtitle": {"text": "Source PDH.stat", "link": "https://stats.pacificdata.org/vis?lc=en&df[ds]=SPC2&df[id]=DF_BP50&df[ag]=SPC&df[vs]=1.0&av=true&pd=2013%2C2023&lo=1&lom=LASTNOBSERVATIONS&dq=A.SH_STA_MORT.CK+FJ+FM+KI+MH+NC+NR+NU+PF+PG+PW+SB+TO+TV+VU+WS.F._T._T._T._T._T._Z._T&to[TIME_PERIOD]=false&ly[rs]=INDICATOR&ly[rw]=GEO_PICT%2CTIME_PERIOD"}}}
            language='en'
        />`
    }, {
        id: "SL_TLF_NEET",
        code: `<SDMXChart
            config={{
                data: ["https://stats-sdmx-disseminate.pacificdata.org/rest/data/SPC,DF_BP50,1.0/A.SL_TLF_NEET..M+F+_T.Y15T24._T._T._T._T._Z._T?lastNObservations=1"],
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
                    yAxis: {
                        name: "per 1,000 live births"
                    },
                    tooltip: {
                        formatter: (p: any) => {
                            const pts = Array.isArray(p) ? p : [p];
                            return \`\${pts[0].name}<br/>\` + pts.map((x: any) => \`\${x.marker}\${x.seriesName}: \${Number(x.value).toLocaleString('en')} per 1,000 live births\`).join("<br/>");
                        }
                    }
                }
            }}
        language='en'/>`
    }, {
        id: "SH_DYN_MORT",
        code: `<SDMXChart
            config={{
            data: ["https://stats-sdmx-disseminate.pacificdata.org/rest/data/DF_BP50/A.SH_DYN_MORT.CK+FJ+FM+KI+MH+NC+NR+NU+PG+PW+SB+TO+TV+VU+WS.F+M.Y00T04._T._T._T._T._Z._T?dimensionAtObservation=AllDimensions"],
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
                yAxis: {"name": "per 1,000 live births"},
                tooltip: {
                    formatter: (p: any) => {
                        const pts = Array.isArray(p) ? p : [p];
                        return \`\${pts[0].name}<br/>\` + pts.map((x: any) => \`\${x.marker}\${x.seriesName}: \${Number(x.value).toLocaleString('en')} per 1,000 live births\`).join("<br/>");
                    }
                },
            }
            }}
            language='en'
        />`
    }, {
        id: "SH_DYN_MORT_SDG03",
        code: `<SDMXChart
            config={{
            data: ["https://stats-sdmx-disseminate.pacificdata.org/rest/data/SPC,DF_SDG_03/A.G.SH_DYN_MORT.AS+CK+FJ+FM+GU+KI+MH+MP+NC+NR+NU+PF+PG+PN+PW+SB+TK+TO+TV+VU+WF+WS.M+F.Y0T4._T._T._T._T._T._T._T._T._T?dimensionAtObservation=AllDimensions"],
            id: "SH_DYN_MORT",
            type: "drilldown",
            xAxisConcept: "REF_AREA",
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
                yAxis: {
                    name: "per 1,000",
                    min: 0,
                    max: 80
                },
                tooltip: {
                    formatter: (p) => {
                        const pts = Array.isArray(p) ? p : [p];
                        const isChild = pts[0].data && pts[0].data.drilldownId === undefined;
                        const lines = pts.map((x) => {
                            const n = Number(x.value);
                            const text = (x.value === null || x.value === undefined || x.value === "")
                                ? "-"
                                : (Number.isFinite(n) ? n.toLocaleString("en") : String(x.value));
                            const period = isChild ? x.name : (x.data && x.data.TIME_PERIOD);
                            const suffix = period ? " in " + period : "";
                            return (x.marker || "") + (x.seriesName || "") + ": " + text + " per 1,000" + suffix;
                        });
                        return (isChild ? "" : pts[0].name + "<br/>") + lines.join("<br/>");
                    }
                },
                series: {
                    label: {
                        show: false
                    },
                    emphasis: {
                        label: {
                            show: true
                        }
                    }
                }
            },
            subtitle: {
                text: "Source PDH.stat",
                link: "https://stats.pacificdata.org/vis?fs[0]=Development%20indicators,0%7CSustainable%20Development%20Goals%23SDG%23&pg=0&fc=Development%20indicators&bp=true&snb=18&vw=tb&df[ds]=ds%3ASPC2&df[id]=DF_SDG_03&df[ag]=SPC&dq=A.G.SH_DYN_MORT..M%2BF.Y0T4._T._T._T._T._T._T._T._T._T&pd=,&to[TIME_PERIOD]=false&isAvailabilityDisabled=false&page=0",
                target: "blank",
                size: "1em"
            }
            }}
            language='en'
        />`
    }, {
        id: "NY_GDP_PCAP",
        code: `<SDMXChart config={{
            data: ["https://stats-sdmx-disseminate.pacificdata.org/rest/data/DF_BP50/A.NY_GDP_PCAP.CK+FJ+FM+KI+MH+NC+NR+NU+PF+PG+PW+SB+TO+TV+VU+WS._T._T._T._T._T._T._Z._T?dimensionAtObservation=AllDimensions"],
            id: "NY_GDP_PCAP", type: "drilldown",
            xAxisConcept: "GEO_PICT",
            legend: {concept: "INDICATOR", location: "none"},
            drilldown: {xAxisConcept: "TIME_PERIOD"},
            colorPalette: {GEO_PICT: {CK: "#E16A86", FJ: "#D7765B", FM: "#C7821C", KI: "#AF8E00", MH: "#909800", NC: "#65A100", NR: "#00A846", NU: "#00AC74", PF: "#00AD9A", PG: "#00AABA", PW: "#00A2D3", SB: "#4495E2", TO: "#9183E6", TV: "#BD72DD", VU: "#D766C9", WF: "#E264AB"}},
            yAxisConcept: "OBS_VALUE",
            extraOptions: {
                yAxis: {
                    name: "percent",
                    min: -25,
                    max: 50,
                },
                tooltip: {
                    formatter: (p: any) => {
                        const pts = Array.isArray(p) ? p : [p];
                        return \`\${pts[0].name}<br/>\` + pts.map((x: any) => \`\${x.marker}\${Number(x.value).toLocaleString('en')} %\`).join("<br/>");
                    }
                },
                xAxis: {axisLabel: {rotate: 20}}
            }
            }}
            language='en'
            />`
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
};

export default Drilldown;
