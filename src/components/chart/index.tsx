import HighchartsReact from "highcharts-react-official";
import HighchartsExporting from "highcharts/modules/exporting";
import Accessibility from "highcharts/modules/accessibility";
import ExportData from "highcharts/modules/export-data";
import Drilldown from "highcharts/modules/drilldown"
import * as Highcharts from 'highcharts';
import { useEffect, useState } from "react";
// @ts-ignore
import { SDMXParser } from 'sdmx-json-parser';
import { parseTextExpr, parseOperandTextExpr } from '../../utils/parseTextExpr';
import { parseDataExpr } from "../../utils/parseDataExpr";
import { parseDate } from "../../utils/parseDate";

if (typeof Highcharts === 'object') {
    HighchartsExporting(Highcharts);
    Accessibility(Highcharts);
    ExportData(Highcharts)
    Drilldown(Highcharts)
}

const Chart = ({config} : {config: any}) => {

    const [ready, setReady] = useState(false)
    const [chartId, setChartId] = useState('chart-1')
    const [hcOptions, setHcOptions] = useState({})

    const sdmxParser = new SDMXParser();

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

    

    /**
     * Extract Highcharts chart type from chart expression in yaml.
     * @param chartExpr
     * @returns {String}
     */
    const processChartExpr = (chartExpr: string) => {
        const chartType = chartExpr.split(',')[0];
        switch (chartType) {
            case 'VBARS':
            case 'BARS':
                return 'column'
                break;
            case 'HBARS':
                return 'bar'
                break;
            case 'LINES':
                return 'line'
                break;
            case 'PIE':
                return 'pie'
                break;
            case 'DRILLDOWN':
                return 'drilldown'
                break;
            default:
                break;
        }
    }


    useEffect(() => {
        const dataObjs = parseDataExpr(config.DATA);

        const chartType = processChartExpr(config.chartType);
        if (!chartType) {
            throw new Error('Chart type not defined');
        }
        const hcExtraOptions : any = { 
            plotOptions: {
                [chartType]: {}
            }
        };

        let seriesData : any[] = [];
        let xAxisValue = [];
        let titleObj : any = {};
        let subTitleObj :any = {};

        const dataPromises = dataObjs.map((dataObj) => {
            const parser = new SDMXParser();
            return parser.getDatasets(dataObj.dataFlowUrl, {
                headers: new Headers({
                    Accept: "application/vnd.sdmx.data+json;version=2.0.0",
                })
            }).then(() => {
                let data = parser.getData();
                const attributes = parser.getAttributes();
                // if alternate label specified in the DATA field, the label is appended to the data with key xAxisConcept
                if (dataObj.alternateLabel) {
                    data.forEach((dataItem: any, index: number, data: [any]) => {
                        data[index][config.xAxisConcept] = dataObj.alternateLabel;
                    });
                }
                // if operation specified in the DATA field, it is applied here whether the operand is an attribute or another SDMX request
                if (dataObj.operator) {
                    if (dataObj.operand.startsWith('{')) {
                        // operand is an attribute
                        const operandValue = parseOperandTextExpr(dataObj.operand, data[0], attributes);
                        data.forEach((dataItem: any, index: number, data: [any]) => {
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
                            data.forEach((dataItem: any, index: number, data: [any]) => {
                                data[index].value = eval(`${data[index].value} ${dataObj.operator} ${operandValue}`);
                            });
                            return [data, parser.getDimensions()];
                        });
                    }
                } else {
                    return [data, parser.getDimensions()];
                }
            })
        });
        Promise.all(dataPromises).then((sdmxObjs) => {
            sdmxObjs.forEach((sdmxObj: any) => {
                const data = sdmxObj[0];
                const dimensions = sdmxObj[1];

                titleObj = parseTextExpr(config.Title, dimensions);
                subTitleObj = parseTextExpr(config.Subtitle, dimensions);

                // check if xAxisConcept exists in data
                if(config.xAxisConcept && config.xAxisConcept != 'MULTI') {
                    const xAxisDimension = dimensions.find((dimension:any) => dimension.id == config.xAxisConcept);
                    if(!xAxisDimension) {
                        throw new Error(`xAxisConcept ${config.xAxisConcept} not found in dataflow`);
                    }
                }
                // check if legendConcept exists in dataFlow
                if(config.legendConcept && config.legendConcept != 'MULTI') {
                    const legendDimension = dimensions.find((dimension:any) => dimension.id == config.legendConcept);
                    if(!legendDimension) {
                        throw new Error(`legendConcept ${config.legendConcept} not found in dataflow`);
                    }
                }

                let xAxisConcept = config.xAxisConcept;
                let legendConcept = config.legendConcept;

                if(chartType == 'line') {
                    // in case xAxisConcept is empty, we use TIME_PERIOD
                    xAxisConcept = config.xAxisConcept || 'TIME_PERIOD';
                    // in case legendConcept is empty, we use the first dimension which is not TIME_PERIOD
                    legendConcept = config.legendConcept || dimensions.find((dimension:any) => dimension.id != 'TIME_PERIOD')['id']
                    // for (multiple) line charts, we create multiple series for each legendConcept dimension values and using xAxisConcept as the x-axis dimension
                    // TODO in case any other dimension has multiple values, we fix them to their latest value and display a select field to change their value.
                    let serieDimensions = dimensions.find((dimension:any) => dimension.id == legendConcept);
                    if (xAxisConcept == "TIME_PERIOD") {
                        // we assume that line charts have a time dimension represented on x-axis
                        const timeDimension = dimensions.find((dimension:any) => dimension.id == "TIME_PERIOD");
                        const freqDimension = dimensions.find((dimension:any) => dimension.id == "FREQ");
                        let unit = '';
                        let dateTimeLabelFormats = {
                            year: "%Y",
                            month: "%b",
                        }
                        let xAxisLabelformat = '';
                        if(freqDimension.values[0].id == "A") {
                            unit = "year";
                            xAxisLabelformat = "{value:%Y}";
                        } else if(freqDimension.values[0].id == "Q" || freqDimension.values[0].id == 'M') {
                            unit = "month";
                            xAxisLabelformat = "{value:%b %Y}";
                        }
                        hcExtraOptions["xAxis"] = {
                            type: "datetime",
                            units: [[unit]],
                            labels: {
                                format: xAxisLabelformat
                            }
                        }
                    }
                    serieDimensions.values.forEach((serieDimension:any) => {
                        // a serie is created for each of the serie's dimension value
                        const serieData = data.filter((val:any) => val[config.legendConcept] == serieDimension.name);
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
                } else if(chartType == 'drilldown') {
                    const xAxisConcept = config.xAxisConcept;
                    const legendConcept = config.legendConcept;
                    const serieDimensions = dimensions.find((dimension:any) => dimension.id == legendConcept);
                    const xDimension = dimensions.find((dimension: any) => dimension.id == xAxisConcept)
                    let dataSerieData : any[] = []
                    let dataDrilldownData : any[] = []
                    serieDimensions.values.forEach((serieDimensionValue: any) => {
                        const serieDimensionData = data.filter((val:any) => val[config.legendConcept] == serieDimensionValue.name);
                        let serieDataDimensionValue= serieDimensionData[0];
                        if (xAxisConcept == "TIME_PERIOD") {
                            // we display the latest value in the bar and the whole time series in drilldown
                            serieDimensionData.forEach((value: any) => {
                                const valueDate = parseDate(value[xAxisConcept])
                                const serieDataDimensionValueDate = parseDate(serieDataDimensionValue[xAxisConcept])
                                if(value["TIME_PERIOD"] > serieDataDimensionValue["TIME_PERIOD"]) {
                                    serieDataDimensionValue = value;
                                }
                            })
                        } else {
                            // we look for a "total" (_T) value to display in the bars
                            const totalDimensionValue = xDimension.values.find((value : any) => value.id == '_T')
                            serieDataDimensionValue = serieDimensionData.find((value: any) => value[xAxisConcept] == totalDimensionValue.name)
                        }
                        xAxisValue.push(serieDimensionValue[legendConcept])
                        dataSerieData.push({
                                ...serieDataDimensionValue,
                                name: serieDataDimensionValue[legendConcept],
                                drilldown: serieDataDimensionValue[legendConcept],
                                y: serieDataDimensionValue["value"]

                        });
                        dataDrilldownData.push({
                            id: serieDataDimensionValue[legendConcept],
                            type: (xAxisConcept == "TIME_PERIOD" ? 'line' : 'column'),
                            data: serieDimensionData.map(( value : any) => {
                                if (xAxisConcept != "TIME_PERIOD") {
                                    // we remove the Total value from the drilled down data
                                    const totalDimensionValue = xDimension.values.find(( value : any) => value.id == '_T')
                                    if (value[xAxisConcept] == totalDimensionValue.name) {
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
                    if(seriesData.length == 0) {
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
                } else {
                    // other chart type (bar, pie) only one serie is created using the dimension specified in xAxisConcept
                    const sortedData = sortByDimensionName(data, xAxisConcept);
                    xAxisValue = sortedData.map((val: any) => {
                        return val[xAxisConcept];
                    });
                    hcExtraOptions["xAxis"] = {
                        categories: xAxisValue
                    }
                    const yAxisValue = sortedData.map((val: any) => {
                        return {
                            ...val,
                            y: val["value"],
                            name: xAxisConcept?val[xAxisConcept]:val[config.legendConcept],
                        };
                    });

                    if(config.LabelsYN) {
                        hcExtraOptions["plotOptions"][chartType] = {
                            dataLabels: {
                                enabled: true,
                                formatter: function(this: any) {
                                    if(config.Unit == '%') {
                                        if(chartType == "pie") {
                                            return `${this.point?.name}: ${this.point?.percentage.toFixed(config.Decimals)} %`
                                        } else {
                                            return `${this.point?.percentage.toFixed(config.Decimals)} %`
                                        }
                                    } else {
                                        return `${this.point?.y?.toLocaleString()}`
                                    }
                                }
                            }
                        }
                    }

                    // force legend for Pie charts
                    if (config.legendLoc != 'HIDE' && chartType == 'pie') {
                        hcExtraOptions["plotOptions"][chartType]["showInLegend"] = true;
                    }

                    // append data to the serie
                    if(seriesData.length == 0) {
                        seriesData = [{
                            name: titleObj.text,
                            data: yAxisValue,
                        },];
                    } else {
                        seriesData[0].data.push(...yAxisValue);
                    }
                }
            });
            setHcOptions({
                chart: {
                    type: chartType == 'drilldown' ? 'column' : chartType,
                },
                title: {
                    text: titleObj.text,
                    style: titleObj.hcStyle,
                    align: titleObj.align
                },
                subtitle: {
                    text: subTitleObj.text,
                    style: subTitleObj.hcStyle,
                    align: subTitleObj.align
                },
                legend: {
                    enabled: config.legendLoc == 'HIDE' ? false : true,
                    align: config.legendLoc && config.legendLoc.toLowerCase() || 'right'
                },
                series:seriesData,
                ...hcExtraOptions,
            });
        })
    }, [config]);

    return (
        <HighchartsReact
          highcharts={Highcharts}
          options={hcOptions}
          containerProps={{ className: config.frameYN && config.frameYN.toLowerCase() == 'yes' ? "border" : "" }}
        />
    )
}

export default Chart;
