/* eslint-disable @typescript-eslint/no-explicit-any */
import type { EChartsOption } from 'echarts';
import type { SDMXChartConfig } from '../types';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { SDMXParser } from 'sdmx-json-parser';
import { parseTextExpr } from '../../utils/parseTextExpr';
import { fetchDataExprOperand, parseDataExpr } from '../../utils/parseDataExpr';
import { parse as parseExpr, EvalAstFactory, Scope } from 'jexpr';
import type { BuiltChart, ChartBuilder, ChartContext, ChartType, ParsedDataset } from '../../utils/chartHelpers';
import { buildEchartsTitle } from '../../utils/chartHelpers';
import { buildLine } from './line';
import { buildColumn } from './column';
import { buildBar } from './bar';
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

const loadDatasets = async (config: SDMXChartConfig, language: string): Promise<ParsedDataset[]> => {
  const dataObjs = parseDataExpr(config.data);
  const dataPromises = dataObjs.map((dataObj, datasetIndex) => {
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
              histData[idx][config.xAxisConcept] = `${histData[idx][config.xAxisConcept]}\n${_dataItem[config.xAxisConcept]}`;
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

const loadChartContext = async (
  config: SDMXChartConfig,
  language: string
): Promise<ChartContext> => {
  const datasets = await loadDatasets(config, language);
  let titleText = '';
  let subtitleText = '';

  datasets.forEach((dataset) => {
    const { dimensions } = dataset;
    dataset.titleText = resolveText(config.title, dimensions, language);
    dataset.subtitleText = resolveText(config.subtitle, dimensions, language);
    titleText = dataset.titleText;
    subtitleText = dataset.subtitleText;

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
  });

  return { config, language, datasets, titleText, subtitleText };
};

const TOOLBOX_FEATURE_LABELS: Record<string, string> = {
  saveAsImage: 'Save chart as image',
};

const toolboxTooltipFormatter = (params: any): string =>
  TOOLBOX_FEATURE_LABELS[params?.name] ?? params?.title ?? '';

const assembleOption = (
  config: SDMXChartConfig,
  context: ChartContext,
  parts: ReturnType<ChartBuilder>
): EChartsOption => {
  const option: EChartsOption = {
    aria: { enabled: true },
    title: buildEchartsTitle(config, context.titleText, context.subtitleText),
    toolbox: {
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

  if (parts.grid !== undefined) (option as any).grid = parts.grid;
  if (parts.xAxis !== undefined) (option as any).xAxis = parts.xAxis;
  if (parts.yAxis !== undefined) (option as any).yAxis = parts.yAxis;

  return option;
};

export const buildChartOption = async (
  config: SDMXChartConfig,
  language: string
): Promise<BuiltChart> => {
  const chartType = config.type;
  if (!chartType) throw new Error('Chart type not defined');
  const builder = builders[chartType as ChartType];
  if (!builder) throw new Error(`Unsupported chart type: ${chartType}`);

  const context = await loadChartContext(config, language);
  const parts = builder(context);

  return {
    option: assembleOption(config, context, parts),
    titleText: context.titleText,
    subtitleText: context.subtitleText,
    drilldown: parts.drilldown,
  };
};
