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
            extraOptions: {
                credits: {"enabled": false},
                chart: {"styledMode": true},
                yAxis: {"title": {"text": "per 100,000 live births"}},
                tooltip: {"valueSuffix": " per 100,000 live births" },
                drilldown: {"activeDataLabelStyle": {"textDecoration": "none", "color": "black"}, "activeAxisLabelStyle": {"textDecoration": "none", "color": "black"}},
                plotOptions: {"column": {"dataLabels": {"enabled": true, "style": {"color": "contrast", "textOutline": "0px", "fontWeight": "normal"}}}}}, "subtitle": {"text": "<a href='https://stats.pacificdata.org/vis?lc=en&df[ds]=SPC2&df[id]=DF_BP50&df[ag]=SPC&df[vs]=1.0&av=true&pd=2013%2C2023&lo=1&lom=LASTNOBSERVATIONS&dq=A.SH_STA_MORT.CK+FJ+FM+KI+MH+NC+NR+NU+PF+PG+PW+SB+TO+TV+VU+WS.F._T._T._T._T._T._Z._T&to[TIME_PERIOD]=false&ly[rs]=INDICATOR&ly[rw]=GEO_PICT%2CTIME_PERIOD' target='_blank'>Source PDH.stat</a>"}}}
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
                    chart: { styledMode: true },
                    yAxis: {
                        title: {
                            text: "per 1,000 live births"
                        }
                    },
                    tooltip: {
                        valueSuffix: " per 1,000 live births",
                        pointFormat: "{series.name}: {point.y} in {point.TIME_PERIOD}"
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
                credits: {"enabled": false},
                chart: { styledMode: true },
                yAxis: {"title": {"text": "per 1,000 live births"}},
                tooltip: {
                pointFormat: "{series.name}: {point.y} in {point.TIME_PERIOD}"
                },
                drilldown: {
                activeDataLabelStyle: {"textDecoration": "none", "color": "black"},
                activeAxisLabelStyle: {"textDecoration": "none", "color": "black"},
                breadcrumbs: {
                    formatter: function (level: any) {
                        if (level.level === 0) {
                            return ${'`'}\${level.levelOptions.data[0]['INDICATOR']}${'`'};
                        }
                        return ${'`'}\${level.levelOptions.name}${'`'};
                    }
                }
                },
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
            colorPalette: {GEO_PICT: {CK: 0, FJ: 1, FM: 2, KI: 3, MH: 4, NC: 5, NR: 6, NU: 7, PF: 8, PG: 9, PW: 10, SB: 11, TO: 12, TV: 13, VU: 14, WF: 15}},
            yAxisConcept: "OBS_VALUE",
            extraOptions: {
                credits: {enabled: false},
                chart: {
                    styledMode: true,
                    events: {
                        drilldown: function(event: any) {
                            if (event.seriesOptions.id.startsWith("Nauru")) {
                                this.yAxis[0].update({
                                    max: 100
                                });
                            }
                        },
                        drillup: function(event: any) {
                            this.yAxis[0].update({
                                max: 50
                            });
                        }
                    }
                },
                yAxis: {
                    title: {text: "percent"},
                    min: -25,
                    max: 50,
                    endOnTick: false,
                },
                tooltip: {
                    valueSuffix: " %",
                    pointFormatter: function() {
                        if (this.drilldown) {
                            return ${'`'}\${this.y}\${this.series.tooltipOptions.valueSuffix} in \${this.TIME_PERIOD}${'`'};
                        }
                        return ${'`'}\${this.y}\${this.series.tooltipOptions.valueSuffix}${'`'};
                    }},
                drilldown: {
                    breadcrumbs: {
                        formatter: function (level: any) {
                            if (level.level === 0) {
                                return ${'`'}\${level.levelOptions.data[0]['INDICATOR']}${'`'};
                            }
                            return ${'`'}\${level.levelOptions.name}${'`'};
                        }
                    }
                },
                plotOptions: {column: {dataLabels: {enabled: true}}},
                xAxis: {labels: {autoRotationLimit: 20}}
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
};

export default Drilldown;
