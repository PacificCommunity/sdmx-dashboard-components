/* eslint-disable @typescript-eslint/no-explicit-any */
import type { EChartsOption } from 'echarts';
import type { SDMXChartConfig } from '../types';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { SDMXParser } from 'sdmx-json-parser';
import { parseTextExpr } from '../../utils/parseTextExpr';
import { fetchDataExprOperand, parseDataExpr } from '../../utils/parseDataExpr';
import { dataRequestHeaders } from '../../utils/requestHeaders';
import { parse as parseExpr, EvalAstFactory, Scope } from 'jexpr';
import type { BuiltChart, ChartBuilder, ChartBuildResult, ChartContext, ChartType, ParsedDataset } from '../../utils/chartHelpers';
import { buildEchartsTitle } from '../../utils/chartHelpers';
import { buildLine } from './line';
import { buildBar, buildColumn } from './columnLikeChart';
import { buildLollipop } from './lollipop';
import { buildTreemap } from './treemap';
import { buildPie } from './pie';
import { buildDrilldown } from './drilldown';

const builders: Record<ChartType, ChartBuilder> = {
  line: buildLine,
  column: buildColumn,
  bar: buildBar,
  lollipop: buildLollipop,
  treemap: buildTreemap,
  pie: buildPie,
  drilldown: buildDrilldown,
};

const resolveText = (text: SDMXChartConfig['title'], dimensions: any[], language: string): string => {
  if (typeof text === 'string') return parseTextExpr(text, dimensions);
  if (typeof text === 'object' && text) {
    return typeof text.text === 'string'
      ? parseTextExpr(text.text, dimensions)
      : parseTextExpr(text.text[language], dimensions);
  }
  return '';
};

export const loadDatasets = async (
  dataExpression: SDMXChartConfig['data'],
  xAxisConcept: SDMXChartConfig['xAxisConcept'],
  language: string
): Promise<ParsedDataset[]> => {
  const dataObjs = parseDataExpr(dataExpression);
  const dataPromises = dataObjs.map((dataObj, datasetIndex) => {
    const parser = new SDMXParser();
    return parser
      .getDatasets(dataObj.dataFlowUrl, { headers: dataRequestHeaders(language) })
      .then(() => {
        const data = parser.getData();
        const attributes = parser.getAttributes();
        if (dataObj.alternateLabel) {
          data.forEach((_item: any, index: number, data: any[]) => {
            data[index][xAxisConcept as string] = dataObj.alternateLabel;
          });
        }
        if (dataObj.operator === 'hist') {
          const histData: any[] = [];
          data.forEach((_dataItem: any) => {
            const idx = histData.findIndex((item) => item.binValue === _dataItem.value);
            if (idx === -1) {
              const histItem: any = {};
              histItem[xAxisConcept as string] = _dataItem[xAxisConcept as string];
              histItem.value = 1;
              histItem.binValue = _dataItem.value;
              histData.push(histItem);
            } else {
              histData[idx].value += 1;
              histData[idx][xAxisConcept as string] = `${histData[idx][xAxisConcept as string]}\n${_dataItem[xAxisConcept as string]}`;
            }
          });
          return {
            data: histData,
            dimensions: parser.getDimensions(),
            alternateLabel: dataObj.alternateLabel,
            datasetIndex,
          };
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
            return {
              data,
              dimensions: parser.getDimensions(),
              activeDimensions: parser.getActiveDimensions(),
              alternateLabel: dataObj.alternateLabel,
              datasetIndex,
            };
          });
        }
        return {
          data,
          dimensions: parser.getDimensions(),
          activeDimensions: parser.getActiveDimensions(),
          alternateLabel: dataObj.alternateLabel,
          datasetIndex,
        };
      });
  });

  return Promise.all(dataPromises);
};

const createChartContext = (
  config: SDMXChartConfig,
  language: string,
  sourceDatasets: ParsedDataset[]
): ChartContext => {
  let titleText = '';
  let subtitleText = '';

  const datasets = sourceDatasets.map((dataset) => {
    const { dimensions } = dataset;
    const datasetTitleText = resolveText(config.title, dimensions, language);
    const datasetSubtitleText = resolveText(config.subtitle, dimensions, language);
    titleText = datasetTitleText;
    subtitleText = datasetSubtitleText;

    if (config.xAxisConcept && config.xAxisConcept !== 'MULTI') {
      if (!dimensions.find((d: any) => d.id === config.xAxisConcept)) {
        throw new Error(`xAxisConcept ${config.xAxisConcept} not found in dataflow`);
      }
    }
    const legendConcept = config.legend?.concept;
    if (legendConcept && legendConcept !== 'MULTI') {
      if (!dimensions.find((d: any) => d.id === legendConcept)) {
        throw new Error(`legendConcept ${legendConcept} not found in dataflow`);
      }
    }

    return { ...dataset, titleText: datasetTitleText, subtitleText: datasetSubtitleText };
  });

  return { config, language, datasets, titleText, subtitleText };
};

const TOOLBOX_FEATURE_LABELS: Record<string, string> = {
  saveAsImage: 'Save chart as image',
};

const toolboxTooltipFormatter = (params: any): string =>
  TOOLBOX_FEATURE_LABELS[params?.name] ?? params?.title ?? '';

// the semantic axis titles: xAxisTitle names the axis of xAxisConcept and
// yAxisTitle the value axis, so a horizontal bar chart, whose category axis
// is ECharts' yAxis, swaps them. The x axis name sits centred under the
// axis; the y axis name is laid out by applyYAxisTitleLayout. Unset titles
// leave the axis unnamed, and extraOptions, merged later, still override.
const withAxisTitles = (config: SDMXChartConfig, context: ChartContext, parts: ChartBuildResult) => {
  const dimensions = context.datasets[context.datasets.length - 1]?.dimensions ?? [];
  const xTitle = resolveText(config.xAxisTitle, dimensions, context.language);
  const yTitle = resolveText(config.yAxisTitle, dimensions, context.language);
  const [xAxisName, yAxisName] = config.type === 'bar' ? [yTitle, xTitle] : [xTitle, yTitle];
  const xAxis = parts.xAxis && xAxisName ? { ...parts.xAxis, name: xAxisName, nameLocation: 'middle' } : parts.xAxis;
  const yAxis = parts.yAxis && yAxisName ? { ...parts.yAxis, name: yAxisName } : parts.yAxis;
  return { xAxis, yAxis };
};

const assembleOption = (
  config: SDMXChartConfig,
  context: ChartContext,
  parts: ReturnType<ChartBuilder>
): EChartsOption => {
  const option: EChartsOption = {
    aria: { enabled: true },
    title: buildEchartsTitle(config, context.titleText, context.subtitleText),
    toolbox: {
      // download: false hides the save-as-image control
      show: config.download !== false,
      showTitle: false,
      tooltip: {
        show: true,
        position: 'top',
        formatter: toolboxTooltipFormatter,
      },
      feature: { saveAsImage: {} },
    },
    tooltip: parts.tooltip,
    legend: parts.legend,
    series: parts.series,
  };

  const { xAxis, yAxis } = withAxisTitles(config, context, parts);
  if (parts.grid !== undefined) (option as any).grid = parts.grid;
  if (xAxis !== undefined) (option as any).xAxis = xAxis;
  if (yAxis !== undefined) (option as any).yAxis = yAxis;

  return option;
};

export const buildChartOptionFromDatasets = (
  config: SDMXChartConfig,
  language: string,
  datasets: ParsedDataset[]
): BuiltChart => {
  const chartType = config.type;
  if (!chartType) throw new Error('Chart type not defined');
  const builder = builders[chartType as ChartType];
  if (!builder) throw new Error(`Unsupported chart type: ${chartType}`);

  const context = createChartContext(config, language, datasets);
  const parts = builder(context);

  return {
    option: assembleOption(config, context, parts),
    titleText: context.titleText,
    subtitleText: context.subtitleText,
    drilldown: parts.drilldown,
  };
};
