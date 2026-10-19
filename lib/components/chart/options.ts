/* eslint-disable @typescript-eslint/no-explicit-any */
import type { EChartsOption } from 'echarts';
import { SDMXChartConfig } from '../types';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { SDMXParser } from 'sdmx-json-parser';
import { parseTextExpr } from '../../utils/parseTextExpr';
import { fetchDataExprOperand, parseDataExpr } from '../../utils/parseDataExpr';
import { parseDate } from '../../utils/parseDate';
import { parse as parseExpr, EvalAstFactory, Scope } from 'jexpr';
import { sortByDimension, sortByValue, getLatestValue } from './helpers';

export type DrilldownBundle = { options: Record<string, EChartsOption> };
export type BuiltChart = {
  option: EChartsOption;
  titleText: string;
  subtitleText: string;
  drilldown?: DrilldownBundle;
};

const paletteColor = (config: SDMXChartConfig, concept: string, code: string): string | undefined => {
  const p = config.colorPalette?.[concept];
  if (p && typeof p[code] === 'string') return p[code] as string;
  return undefined;
};

const legendPosition = (location?: string): EChartsOption['legend'] => {
  switch (location) {
    case 'left':
      return { orient: 'vertical', left: 0, top: 'middle', show: true };
    case 'right':
      return { orient: 'vertical', right: 0, top: 'middle', show: true };
    case 'top':
      return { orient: 'horizontal', top: 0, left: 'center', show: true };
    case 'none':
      return { show: false };
    case 'bottom':
    default:
      return { orient: 'horizontal', bottom: 0, left: 'center', show: true };
  }
};

export const buildChartOption = async (
  config: SDMXChartConfig,
  language: string
): Promise<BuiltChart> => {
  const dataObjs = parseDataExpr(config.data);
  const chartType = config.type;
  if (!chartType) throw new Error('Chart type not defined');

  const dataPromises = dataObjs.map((dataObj) => {
    const parser = new SDMXParser();
    return parser
      .getDatasets(dataObj.dataFlowUrl, {
        headers: new Headers({
          Accept: 'application/vnd.sdmx.data+json;version=2.0.0',
          'Accept-Language': language,
        }),
      })
      .then(() => {
        const data = parser.getData();
        const attributes = parser.getAttributes();
        if (dataObj.alternateLabel) {
          data.forEach((_item: any, index: number, data: any[]) => {
            data[index][config.xAxisConcept] = dataObj.alternateLabel;
          });
        }
        if (dataObj.operator === 'hist') {
          const histData: any[] = [];
          data.forEach((_dataItem: any) => {
            const idx = histData.findIndex((item) => item.binValue === _dataItem.value);
            if (idx === -1) {
              const histItem: any = {};
              histItem[config.xAxisConcept] = _dataItem[config.xAxisConcept];
              histItem.value = 1;
              histItem.binValue = _dataItem.value;
              histData.push(histItem);
            } else {
              histData[idx].value += 1;
              histData[idx][config.xAxisConcept] = `${histData[idx][config.xAxisConcept]}<br/>${_dataItem[config.xAxisConcept]}`;
            }
          });
          return [histData, parser.getDimensions()];
        } else if (dataObj.operator === 'expr') {
          const scope: Scope = { x0: data.map((item: any) => item.value) };
          const ops = fetchDataExprOperand(dataObj.exprOperand, data, scope, attributes, language);
          return Promise.all(ops).then(() => {
            const astFactory = new EvalAstFactory();
            const expr = parseExpr(dataObj.expression, astFactory);
            data.forEach((item: any, index: number) => {
              const scopeValues: Scope = {};
              Object.keys(scope).forEach((varKey: string) => {
                scopeValues[varKey] = scope[varKey][index];
              });
              item.value = expr?.evaluate(scopeValues);
            });
            return [data, parser.getDimensions(), parser.getActiveDimensions()];
          });
        }
        return [data, parser.getDimensions(), parser.getActiveDimensions()];
      });
  });

  const sdmxObjs: any[] = await Promise.all(dataPromises);

  let seriesData: any[] = [];
  let xAxisValue: any[] = [];
  let titleText = '';
  let subtitleText = '';
  let xAxis: any = { type: 'category', data: xAxisValue };
  let yAxis: any = { type: 'value' };
  let tooltipTrigger: 'axis' | 'item' = 'axis';

  sdmxObjs.forEach((sdmxObj) => {
    const data = sdmxObj[0];
    const dimensions = sdmxObj[1];
    const activeDimensions = sdmxObj[2];

    if (typeof config.title === 'string') {
      titleText = parseTextExpr(config.title, dimensions);
    } else if (typeof config.title === 'object') {
      titleText = typeof config.title.text === 'string' ? parseTextExpr(config.title.text, dimensions) : parseTextExpr(config.title.text[language], dimensions);
    }
    if (typeof config.subtitle === 'string') {
      subtitleText = parseTextExpr(config.subtitle, dimensions);
    } else if (typeof config.subtitle === 'object') {
      subtitleText = typeof config.subtitle.text === 'string' ? parseTextExpr(config.subtitle.text, dimensions) : parseTextExpr(config.subtitle.text[language], dimensions);
    }

    if (config.xAxisConcept && config.xAxisConcept !== 'MULTI') {
      if (!dimensions.find((d: any) => d.id === config.xAxisConcept)) {
        throw new Error(`xAxisConcept ${config.xAxisConcept} not found in dataflow`);
      }
    }
    if (config.legend && config.legend.concept && config.legend.concept !== 'MULTI') {
      if (!dimensions.find((d: any) => d.id === config?.legend?.concept)) {
        throw new Error(`legendConcept ${config.legend.concept} not found in dataflow`);
      }
    }

    let xAxisConcept = config.xAxisConcept;
    let legendConcept = config?.legend?.concept || '';

    if (chartType === 'line') {
      xAxisConcept = xAxisConcept || 'TIME_PERIOD';
      legendConcept = legendConcept || dimensions.find((d: any) => d.id !== xAxisConcept)['id'];
      if (!legendConcept) throw new Error(`No other dimension than ${xAxisConcept} found`);
      const serieDimensions = dimensions.find((d: any) => d.id === legendConcept);
      if (xAxisConcept === 'TIME_PERIOD') {
        const freqDimension = dimensions.find((d: any) => d.id === 'FREQ');
        let dateFormat = '{yyyy}';
        if (freqDimension.values[0].id === 'A') dateFormat = '{yyyy}';
        else if (freqDimension.values[0].id === 'Q' || freqDimension.values[0].id === 'M') dateFormat = '{MMM} {yyyy}';
        xAxis = { type: 'time', axisLabel: { formatter: dateFormat } };
      } else {
        xAxis = { type: 'category', data: data.map((val: any) => val[xAxisConcept]) };
      }
      serieDimensions.values
        .sort((a: any, b: any) => a.name.localeCompare(b.name))
        .forEach((serieDimension: any) => {
          const serieData = data.filter((val: any) => val[legendConcept] === serieDimension.name);
          if (serieData.length === 0) return;
          const sortedData = sortByDimension(serieData, xAxisConcept);
          const points = sortedData.map((val: any) => [parseDate(val[xAxisConcept]) ?? val[xAxisConcept], val['value']]);
          const color = paletteColor(config, legendConcept, serieDimension.id);
          seriesData.push({
            type: 'line',
            name: serieDimension.name,
            data: points,
            itemStyle: color ? { color } : undefined,
            lineStyle: color ? { color } : undefined,
          });
        });
    } else if (chartType === 'column' || chartType === 'bar' || chartType === 'lollipop' || chartType === 'treemap') {
      if (!xAxisConcept) throw new Error('No xAxis concept found');
      let legendDimension: any = {};
      if (!legendConcept) {
        legendDimension = activeDimensions.find((d: any) => d.id !== xAxisConcept);
      } else {
        legendDimension = dimensions.find((d: any) => d.id === legendConcept);
      }
      const xAxisDimension = activeDimensions.find((d: any) => d.id === xAxisConcept);
      legendDimension.values
        .sort((a: any, b: any) => a.id.localeCompare(b.id))
        .forEach((legendDimensionValue: any) => {
          const legendSerie = data.filter((val: any) => val[legendDimension.id] === legendDimensionValue.name);
          let sortedData = sortByDimension(legendSerie, xAxisConcept);
          if (config.sortByValue) sortedData = sortByValue(sortedData, config.sortByValue);
          const latestValues = getLatestValue(sortedData, xAxisConcept);
          const yAxisValue = latestValues
            .filter((val: any) => val.value !== null)
            .map((val: any) => {
              const colorByPoint = config.colorPalette?.[xAxisConcept] !== undefined;
              let itemStyle: any = undefined;
              if (colorByPoint) {
                const valXAxis = xAxisDimension.values.find((xVal: any) => xVal.name === val[xAxisConcept]);
                const c = valXAxis && paletteColor(config, xAxisConcept, valXAxis.id);
                if (c) itemStyle = { color: c };
              }
              if (!xAxisValue.includes(val[xAxisConcept])) xAxisValue.push(val[xAxisConcept]);
              return { value: val['value'], name: val[xAxisConcept], itemStyle };
            });
          if (yAxisValue.length > 0) {
            const color = paletteColor(config, legendConcept, legendDimensionValue.id);
            seriesData.push({
              type: 'bar',
              name: legendDimensionValue.name,
              data: yAxisValue,
              itemStyle: color ? { color } : undefined,
            });
          }
        });
      xAxis = { type: 'category', data: xAxisValue };
      yAxis = { type: 'value' };
      if (chartType === 'bar') {
        const tmp = xAxis;
        xAxis = { type: 'value' };
        yAxis = { ...tmp, type: 'category' };
      }
    } else if (chartType === 'pie') {
      const sortedData = sortByDimension(data, xAxisConcept);
      xAxisValue = sortedData.map((val: any) => val[xAxisConcept]);
      let yAxisValue = sortedData.map((val: any) => ({
        value: val['value'],
        name: xAxisConcept ? val[xAxisConcept] : val[legendConcept || ''],
        binValue: val.binValue,
      }));
      if (yAxisValue.length === 2 && yAxisValue[0].binValue !== undefined) {
        yAxisValue = yAxisValue.sort((a: any, b: any) => b.binValue - a.binValue);
      }
      tooltipTrigger = 'item';
      seriesData = [{
        type: 'pie',
        name: titleText || dimensions.find((dim: any) => dim.id === config.legend?.concept)?.values[0]?.name,
        data: yAxisValue,
      }];
      if (config.legend && chartType === 'pie') {
        (seriesData[0] as any).legendHoverLink = true;
      }
    }
  });

  const option: EChartsOption = {
    tooltip: { trigger: tooltipTrigger },
    legend: legendPosition(config.legend?.location),
    grid: { containLabel: true },
    xAxis,
    yAxis,
    series: seriesData,
  };

  if (config.labels) {
    option.series = (seriesData as any[]).map((s: any) => ({
      ...s,
      label: {
        show: true,
        formatter: (params: any) =>
          config?.unit?.text === '%' && params.percent !== undefined
            ? `${chartType === 'pie' ? `${params.name}: ` : ''}${params.percent.toFixed(Number(config.decimals) || 0)} %`
            : `${Number(params.value).toLocaleString(language)}`,
      },
    }));
  }

  return { option, titleText, subtitleText };
};
