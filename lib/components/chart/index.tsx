"use client"

import React, { useState, useEffect, useRef } from "react";
import { HighchartsReact } from "highcharts-react-official";
import HighchartsExporting from "highcharts/modules/exporting";
import Accessibility from "highcharts/modules/accessibility";
import ExportData from "highcharts/modules/export-data";
import Drilldown from "highcharts/modules/drilldown"
import Highcharts from 'highcharts';
// @ts-ignore
import { SDMXParser } from 'sdmx-json-parser';
import { parseTextExpr, parseOperandTextExpr } from '../../utils/parseTextExpr';
import { parseDataExpr } from "../../utils/parseDataExpr";
import { parseDate } from "../../utils/parseDate";
import { InfoCircle } from "react-bootstrap-icons";
import { Button } from "react-bootstrap";
import { SDMXVisualConfig } from "../types";
import { AlignValue } from "highcharts";

if (typeof Highcharts === 'object') {
    HighchartsExporting(Highcharts);
    Accessibility(Highcharts);
    Drilldown(Highcharts);
    ExportData(Highcharts);
}

const Chart = ({ config, language }: { config: SDMXVisualConfig, language: string }) => {

    const [hcOptions, setHcOptions] = useState<Highcharts.Options>({
        title: {
            text: "Loading..."
        }
    })

    const chartComponentRef = useRef<HighchartsReact.RefObject>(null);

    const sortByDimensionName = (data: any, dimension: string) => {
        return data.sort((a: any, b: any) => {
            if (a[dimension] < b[dimension]) {
                return -1;
            }
            if (a[dimension] > b[dimension]) {
                return 1;
            }
            return 0;
        });
    };

    const getLatestValue = (data: any, dimension: string) => {
        let values  = []
        values = data.map((dataPoint: any) => dataPoint[dimension])
                    .map((e: any, i: number, final: any) => final.indexOf(e) === i && i)
                    .filter((e: any) => data[e]).map((e: any) => data[e])
        return values;
    }

    useEffect(() => {

        const dataObjs = parseDataExpr(config.data);

        if (config.download) {
            // ExportData(Highcharts)
        }

        const chartType = config.type
        if (!chartType) {
            throw new Error('Chart type not defined');
        }
        const hcExtraOptions: Highcharts.Options = {
            plotOptions: {
                [chartType]: {}
            }
        };

        let seriesData: any[] = [];
        let xAxisValue: any[] = [];

        const dataPromises = dataObjs.map((dataObj) => {
            const parser = new SDMXParser();
            return parser.getDatasets(dataObj.dataFlowUrl, {
                headers: new Headers({
                    Accept: "application/vnd.sdmx.data+json;version=2.0.0",
                    "Accept-Language": language
                })
            }).then(() => {
                let data = parser.getData();
                const attributes = parser.getAttributes();
                // if alternate label specified in the DATA field, the label is appended to the data with key xAxisConcept
                if (dataObj.alternateLabel) {
                    data.forEach((_dataItem: any, index: number, data: [any]) => {
                        data[index][config.xAxisConcept] = dataObj.alternateLabel;
                    });
                }
                // if operation specified in the DATA field, it is applied here whether the operand is an attribute or another SDMX request
                if (dataObj.operator) {
                    if (dataObj.operand.startsWith('{')) {
                        // operand is an attribute
                        const operandValue = parseOperandTextExpr(dataObj.operand, data[0], attributes);
                        data.forEach((_dataItem: any, index: number, data: [any]) => {
                            data[index].value = eval(`${data[index].value} ${dataObj.operator} ${operandValue}`);
                        });
                        return [data, parser.getDimensions()];
                    } else {
                        // operand is another SDMX request
                        const parserOperand = new SDMXParser();
                        return parserOperand.getDatasets(dataObj.operand, {
                            headers: new Headers({
                                Accept: "application/vnd.sdmx.data+json;version=2.0.0",
                            })
                        }).then(() => {
                            const dataOperand = parserOperand.getData();
                            const operandValue = dataOperand[0].value;
                            data.forEach((_dataItem: any, index: number, data: [any]) => {
                                data[index].value = eval(`${data[index].value} ${dataObj.operator} ${operandValue}`);
                            });
                            return [data, parser.getDimensions()];
                        });
                    }
                } else {
                    return [data, parser.getDimensions(), parser.getActiveDimensions()];
                }
            })
        });
        let titleText = config.title?'Loading...':'';
        let subtitleText = config.subtitle?'Loading...':'';
        Promise.all(dataPromises).then((sdmxObjs) => {
            sdmxObjs.forEach((sdmxObj: any) => {
                const data = sdmxObj[0];
                const dimensions = sdmxObj[1];
                const activeDimensions = sdmxObj[2];

                if(typeof config.title == 'string') {
                    titleText = parseTextExpr(config.title, dimensions)
                } else if (typeof config.title === 'object') {
                    titleText = typeof config.title.text == 'string'? parseTextExpr(config.title.text, dimensions) : parseTextExpr(config.title.text[language], dimensions)
                }
                if(typeof config.subtitle == 'string') {
                    subtitleText = parseTextExpr(config.subtitle, dimensions)
                } else if (typeof config.subtitle === 'object') {
                    subtitleText = typeof config.subtitle.text == 'string'? parseTextExpr(config.subtitle.text, dimensions) : parseTextExpr(config.subtitle.text[language], dimensions)
                }

                // check if xAxisConcept exists in data
                if (config.xAxisConcept && config.xAxisConcept !== 'MULTI') {
                    const xAxisDimension = dimensions.find((dimension: any) => dimension.id === config.xAxisConcept);
                    if (!xAxisDimension) {
                        throw new Error(`xAxisConcept ${config.xAxisConcept} not found in dataflow`);
                    }
                }
                // check if legendConcept exists in dataFlow
                if (config.legend && config.legend.concept && config.legend.concept !== 'MULTI') {
                    const legendDimension = dimensions.find((dimension: any) => dimension.id === config?.legend?.concept);
                    if (!legendDimension) {
                        throw new Error(`legendConcept ${config.legend.concept} not found in dataflow`);
                    }
                }

                let xAxisConcept = config.xAxisConcept;
                let legendConcept = config?.legend?.concept;

                if (chartType === 'line') {
                    // in case xAxisConcept is empty, we use TIME_PERIOD
                    xAxisConcept = config.xAxisConcept || 'TIME_PERIOD';
                    // in case legendConcept is empty, we use the first dimension which is not TIME_PERIOD
                    legendConcept = config?.legend?.concept || dimensions.find((dimension: any) => dimension.id !== xAxisConcept)['id']
                    if (!legendConcept) {
                        throw new Error(`No other dimension than ${xAxisConcept} found`);
                    }
                    // for (multiple) line charts, we create multiple series for each legendConcept dimension values and using xAxisConcept as the x-axis dimension
                    // TODO in case any other dimension has multiple values, we fix them to their latest value and display a select field to change their value.
                    let serieDimensions = dimensions.find((dimension: any) => dimension.id === legendConcept);
                    if (xAxisConcept === "TIME_PERIOD") {
                        // we assume that line charts have a time dimension represented on x-axis
                        const freqDimension = dimensions.find((dimension: any) => dimension.id === "FREQ");
                        let unit = '';
                        let xAxisLabelformat = '';
                        if (freqDimension.values[0].id === "A") {
                            unit = "year";
                            xAxisLabelformat = "{value:%Y}";
                        } else if (freqDimension.values[0].id === "Q" || freqDimension.values[0].id === 'M') {
                            unit = "month";
                            xAxisLabelformat = "{value:%b %Y}";
                        }
                        hcExtraOptions["xAxis"] = {
                            type: "datetime",
                            units: [[unit, []]],
                            labels: {
                                format: xAxisLabelformat
                            }
                        }
                    } else {
                        hcExtraOptions["xAxis"] = {
                            type: "category",
                            categories: data.map((val: any) => val[xAxisConcept])
                        }
                    }
                    serieDimensions.values.forEach((serieDimension: any) => {
                        // a serie is created for each of the serie's dimension value
                        const serieData = data.filter((val: any) => val[legendConcept||""] === serieDimension.name);
                        if(serieData.length == 0) {
                          // continue if no data for this serie
                          return
                        }
                        const sortedData = sortByDimensionName(serieData, xAxisConcept);
                        const yAxisValue = sortedData.map((val: any) => {
                            return {
                                //...dimensionSingleValues,
                                ...val,
                                y: val["value"],
                                x: parseDate(val[xAxisConcept])
                            };
                        });
                        seriesData.push({
                            name: serieDimension.name,
                            data: yAxisValue
                        });
                    });
                } else if (chartType === 'column' || chartType === 'bar') {
                    xAxisConcept = config.xAxisConcept;
                    if (!xAxisConcept) {
                        throw new Error('No xAxis concept found')
                    }
                    legendConcept = config?.legend?.concept
                    let serieDimension: any = {}
                    if (activeDimensions.length === 1) {
                        serieDimension = activeDimensions[0]
                    } else {
                        // in case legendConcept is empty, we take the other active dimension and display a serie for each value
                        if (!legendConcept) {
                            serieDimension = activeDimensions.find((dimension: any) => dimension.id !== xAxisConcept)
                        } else {
                            serieDimension = activeDimensions.find((dimension: any) => dimension.id === legendConcept)
                        }
                    }
                    serieDimension.values.forEach((serieDimensionValue: any) => {
                        const serieData = data.filter((val: any) => val[serieDimension.id] === serieDimensionValue.name);
                        const sortedData = sortByDimensionName(serieData, xAxisConcept)
                        const latestValues = getLatestValue(sortedData, xAxisConcept)
                        const yAxisValue = latestValues.map((val: any) => {
                            return {
                                ...val,
                                y: val["value"],
                                name: val[xAxisConcept]
                            }
                        })

                        latestValues.forEach((val: any) => {
                            if (!xAxisValue.includes(val[xAxisConcept])) {
                                xAxisValue.push(val[xAxisConcept])
                            }
                        });
                        seriesData.push({
                            name: serieDimensionValue.name,
                            data: yAxisValue
                        })
                    })

                    hcExtraOptions["xAxis"] = {
                        categories: xAxisValue,
                        type: 'category'
                    }

                } else if (chartType === 'drilldown') {
                    const xAxisConcept = config.xAxisConcept;
                    const legendConcept = config?.legend?.concept;
                    if (!legendConcept) {
                        throw new Error(`No legend concept defined for drilldown chart`);
                    }
                    const serieDimensions = dimensions.find((dimension: any) => dimension.id === legendConcept);
                    const xDimension = dimensions.find((dimension: any) => dimension.id === xAxisConcept)
                    let dataSerieData: any[] = []
                    let dataDrilldownData: any[] = []
                    serieDimensions.values.forEach((serieDimensionValue: any) => {
                        const serieDimensionData = data.filter((val: any) => val[legendConcept || ""] === serieDimensionValue.name);
                        if(serieDimensionData.length == 0) {
                          // continue if no data for this serie
                          return
                        }
                        let serieDataDimensionValue = serieDimensionData[0];
                        if (xAxisConcept === "TIME_PERIOD") {
                            // we display the latest value in the bar and the whole time series in drilldown
                            serieDimensionData.forEach((value: any) => {
                                if (value["TIME_PERIOD"] > serieDataDimensionValue["TIME_PERIOD"]) {
                                    serieDataDimensionValue = value;
                                }
                            })
                        } else {
                            // we look for a "total" (_T) value to display in the bars
                            const totalDimensionValue = xDimension.values.find((value: any) => value.id === '_T')
                            serieDataDimensionValue = serieDimensionData.find((value: any) => value[xAxisConcept] === totalDimensionValue.name)
                        }
                        dataSerieData.push({
                            ...serieDataDimensionValue,
                            name: serieDataDimensionValue[legendConcept],
                            drilldown: serieDataDimensionValue[legendConcept],
                            y: serieDataDimensionValue["value"]

                        });
                        dataDrilldownData.push({
                            id: serieDataDimensionValue[legendConcept],
                            type: (xAxisConcept === "TIME_PERIOD" ? 'line' : 'column'),
                            data: serieDimensionData.map((value: any) => {
                                if (xAxisConcept !== "TIME_PERIOD") {
                                    // we remove the Total value from the drilled down data
                                    const totalDimensionValue = xDimension.values.find((value: any) => value.id === '_T')
                                    if (value[xAxisConcept] === totalDimensionValue.name) {
                                        return false
                                    }
                                }
                                return {
                                    ...value,
                                    name: value[xAxisConcept],
                                    y: value["value"]
                                }
                            })
                        })
                    })
                    if (seriesData.length === 0) {
                        seriesData = [{
                            name: serieDimensions["name"],
                            colorByPoint: true,
                            data: dataSerieData
                        }]
                    }
                    hcExtraOptions["drilldown"] = {
                        series: dataDrilldownData
                    }
                    hcExtraOptions["xAxis"] = {
                        type: 'category'
                    }
                } else if (chartType === 'pie') {
                    // other chart type (bar, pie) only one serie is created using the dimension specified in xAxisConcept
                    const sortedData = sortByDimensionName(data, xAxisConcept);
                    xAxisValue = sortedData.map((val: any) => {
                        return val[xAxisConcept];
                    });
                    hcExtraOptions["xAxis"] = {
                        type: 'category',
                        categories: xAxisValue
                    }
                    const yAxisValue = sortedData.map((val: any) => {
                        return {
                            ...val,
                            y: val["value"],
                            name: xAxisConcept ? val[xAxisConcept] : val[legendConcept || ""],
                        };
                    });

                    if (config.labels) {
                        hcExtraOptions["plotOptions"] = {
                            [chartType]: {
                                dataLabels: {
                                    enabled: true,
                                    formatter: function (this: any) {
                                        if (config?.unit?.text === '%') {
                                            return `${this.point?.name}: ${this.point?.percentage.toFixed(config.decimals)} %`
                                        } else {
                                            return `${this.point?.y?.toLocaleString(language)}`
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // force legend for Pie charts
                    if (config.legend && chartType === 'pie') {
                        hcExtraOptions["plotOptions"] = {
                            [chartType]: {
                                showInLegend: true
                            }
                        }
                    }

                    // append data to the serie
                    if (seriesData.length === 0) {
                        seriesData = [{
                            name: titleText,
                            data: yAxisValue,
                        },];
                    } else {
                        seriesData[0].data.push(...yAxisValue);
                    }
                }
            })
            let legendAlign: AlignValue = "center"
            if (config?.legend?.location) {
                if (config.legend.location == "left" || config.legend.location == "right") {
                    legendAlign = config.legend.location
                }
            }
            if (config.labels) {
                hcExtraOptions["plotOptions"]= {
                    [chartType] : {
                        dataLabels: {
                            enabled: true,
                            formatter: function (this: any) {
                                if (config?.unit?.text === '%') {
                                    if (chartType === "pie") {
                                        return `${this.point?.name}: ${this.point?.percentage.toFixed(config.decimals)} %`
                                    } else {
                                        return `${this.point?.percentage.toFixed(config.decimals)} %`
                                    }
                                } else {
                                    return `${this.point?.y?.toLocaleString(language)}`
                                }
                            }
                        }
                    }
                }
            }

            setHcOptions({
                chart: {
                    type: chartType === 'drilldown' ? 'column' : chartType,
                },
                title: {
                    useHTML: true,
                    text: `<h2 style="font-weight:inherit;font-size:inherit;font-style:inherit;">${titleText}${config.metadataLink?<Button variant="link" onClick={() => window.open(config.metadataLink, "_blank")}><InfoCircle></InfoCircle></Button>:""}</h2>`,
                    style: {
                        fontWeight: config.title?.weight? config.title.weight : "",
                        fontStyle: config.title?.style,
                        fontSize: config.title?.size
                    },
                    align: config.title?.align || "center"
                },
                subtitle: {
                    text: `<h4>${subtitleText}</h4>`,
                    style: {
                        fontWeight: config.subtitle?.weight || "",
                        fontStyle: config.subtitle?.style || "",
                        fontSize: config.subtitle?.size
                    },
                    align: config.subtitle?.align || "center"
                },
                legend: {
                    enabled: config.legend?.location !== "none" ? true:false,
                    align: legendAlign
                },
                series: seriesData,
                ...hcExtraOptions,
            });
        })
    }, [config, language]);
 
    const chart: React.ReactNode =
        <HighchartsReact
            highcharts={Highcharts}
            options={hcOptions}
            ref={chartComponentRef}
            containerProps={{ className: config.frame && config.frame ? "border" : "" }}
        />

    return (
        <>
        { config.dataLink ? <a href={config.dataLink} target="_blank" rel="noreferrer">{chart}</a>
            : chart}
        </>
    )
}

export default Chart;
