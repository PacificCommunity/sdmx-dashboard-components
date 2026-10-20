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
  if (!p) return undefined;
  const value: unknown = p[code];
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && typeof console !== 'undefined') {
    console.warn(
      `[SDMXChart] colorPalette.${concept}.${code} must be a hex color string; numeric color indexes are no longer supported.`
    );
  }
  return undefined;
};

const resolveSeriesNames = (entries: any[]): Map<any, string> => {
  if (entries.length === 0) return new Map();

  const baseCounts = new Map<string, number>();
  entries.forEach((entry) => {
    const base = entry.baseName ?? entry.name;
    baseCounts.set(base, (baseCounts.get(base) ?? 0) + 1);
  });

  const preferred = entries.map((entry) => {
    const base = entry.baseName ?? entry.name;
    if ((baseCounts.get(base) ?? 0) > 1 && entry.alternateLabel) {
      return String(entry.alternateLabel);
    }
    return base;
  });

  const preferredCounts = new Map<string, number>();
  preferred.forEach((name) => preferredCounts.set(name, (preferredCounts.get(name) ?? 0) + 1));

  return new Map(
    entries.map((entry, index) => {
      let name = preferred[index];
      if ((preferredCounts.get(name) ?? 0) > 1) {
        name = `${name} (dataset ${entry.datasetIndex + 1})`;
      }
      return [entry, name];
    })
  );
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

const legendGridInsets = (
  location: string | undefined,
  labels: string[] = []
): { left?: number; right?: number; top?: number; bottom?: number } => {
  const longestLabel = labels.reduce((max, label) => Math.max(max, String(label).length), 0);
  const sideInset = Math.min(320, Math.max(140, longestLabel * 7 + 40));
  const legendRows = Math.max(1, Math.ceil(labels.length / 6));
  const verticalInset = 15 + legendRows * 18;
  switch (location) {
    case 'left':
      return { left: sideInset };
    case 'right':
      return { right: sideInset };
    case 'top':
      return { top: verticalInset };
    case 'bottom':
      return { bottom: verticalInset };
    case 'none':
    default:
      return {};
  }
};

const abbreviateNumber = (value: number): string => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '';
  const abs = Math.abs(numeric);
  const sign = numeric < 0 ? '-' : '';
  const format = (n: number) => {
    const text = n.toFixed(1);
    return text.endsWith('.0') ? text.slice(0, -2) : text;
  };
  if (abs >= 1e9) return `${sign}${format(abs / 1e9)}B`;
  if (abs >= 1e6) return `${sign}${format(abs / 1e6)}M`;
  if (abs >= 1e3) return `${sign}${format(abs / 1e3)}k`;
  return String(numeric);
};

const withValueAxisFormatter = (axis: any) => {
  if (axis && axis.type === 'value') {
    axis.axisLabel = { ...(axis.axisLabel || {}), formatter: abbreviateNumber };
  }
  return axis;
};

const withCategoryXAxisRotation = (axis: any) => {
  if (axis && axis.type === 'category') {
    axis.axisLabel = { ...(axis.axisLabel || {}), rotate: 45 };
  }
  return axis;
};

const formatTooltipValue = (value: unknown, language: string): string => {
  const raw = Array.isArray(value) ? value[value.length - 1] : value;
  if (raw === null || raw === undefined || raw === '') return '-';
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric.toLocaleString(language) : String(raw);
};

const labelFormatter = (config: SDMXChartConfig, language: string, chartType: string | undefined) => {
  return (params: any) => {
    const value = Array.isArray(params.value) ? params.value[1] : params.value;
    return config?.unit?.text === '%' && params.percent !== undefined
      ? `${chartType === 'pie' ? `${params.name}: ` : ''}${params.percent.toFixed(Number(config.decimals) || 0)} %`
      : `${Number(value).toLocaleString(language)}`;
  };
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatTimeValue = (timestamp: number, format?: string): string => {
  const date = new Date(Number(timestamp));
  if (Number.isNaN(date.getTime())) return String(timestamp);
  return format && format.includes('MMM')
    ? `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`
    : `${date.getUTCFullYear()}`;
};

const buildTooltipFormatter = (config: SDMXChartConfig, language: string, timeFormat?: string) => {
  const customValueFormatter = (config.extraOptions as any)?.tooltip?.valueFormatter;
  return (params: any) => {
    const list = Array.isArray(params) ? params : [params];
    if (list.length === 0 || !list[0]) return '';
    const first = list[0];
    const xValue = first.axisValueLabel
      ?? (first.name
        ? String(first.name)
        : Array.isArray(first.value) && typeof first.value[0] === 'number'
          ? formatTimeValue(first.value[0], timeFormat)
          : '');
    const lines = list.map((point: any) => {
      const rawValue = Array.isArray(point.value) ? point.value[1] : point.value;
      const formatted = typeof customValueFormatter === 'function'
        ? String(customValueFormatter(rawValue, point.dataIndex))
        : formatTooltipValue(rawValue, language);
      const series = point.seriesName ? `${point.seriesName}: ` : '';
      return `${point.marker || ''}${series}${formatted}`;
    });
    return `${xValue ? `${xValue}<br/>` : ''}${lines.join('<br/>')}`;
  };
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
              histData[idx][config.xAxisConcept] = `${histData[idx][config.xAxisConcept]}\n${_dataItem[config.xAxisConcept]}`;
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
  let tooltipTrigger: 'axis' | 'item' = 'item';
  let timeAxisFormat: string | undefined;
  const drilldownOptions: Record<string, EChartsOption> = {};

  // Column/bar category state is shared across all datasets so series from
  // earlier datasets stay aligned with the final category axis.
  const columnCategoryOrder: any[] = [];
  const columnCategorySeen = new Set<any>();
  const columnSeriesByName = new Map<string, any>();

  // Drilldown root state follows the same model: one canonical category list
  // shared by every series, with values looked up by category name.
  const drilldownCategoryOrder: any[] = [];
  const drilldownCategorySeen = new Set<any>();
  const drilldownSeriesByKey = new Map<string, any>();
  let drilldownCategorySortId: string | undefined;
  let drilldownRootConcept: string | undefined;

  sdmxObjs.forEach((sdmxObj, datasetIndex) => {
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
      const isTimeAxis = xAxisConcept === 'TIME_PERIOD';
      if (isTimeAxis) {
        const freqDimension = dimensions.find((d: any) => d.id === 'FREQ');
        let dateFormat = '{yyyy}';
        if (freqDimension.values[0].id === 'A') dateFormat = '{yyyy}';
        else if (freqDimension.values[0].id === 'Q' || freqDimension.values[0].id === 'M') dateFormat = '{MMM} {yyyy}';
        timeAxisFormat = dateFormat;
        xAxis = { type: 'time', axisLabel: { formatter: dateFormat } };
      } else {
        const categories = Array.from(new Set(data.map((val: any) => val[xAxisConcept])));
        xAxis = { type: 'category', data: categories, axisLabel: { interval: 0 } };
      }
      [...serieDimensions.values]
        .sort((a: any, b: any) => a.name.localeCompare(b.name))
        .forEach((serieDimension: any) => {
          const serieData = data.filter((val: any) => val[legendConcept] === serieDimension.name);
          if (serieData.length === 0) return;
          const sortedData = sortByDimension(serieData, xAxisConcept);
          const points = sortedData.map((val: any) =>
            isTimeAxis
              ? [parseDate(val[xAxisConcept]) ?? val[xAxisConcept], val['value']]
              : [val[xAxisConcept], val['value']]
          );
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

      const alternateLabel = dataObjs[datasetIndex]?.alternateLabel;
      [...legendDimension.values]
        .sort((a: any, b: any) => a.id.localeCompare(b.id))
        .forEach((legendDimensionValue: any) => {
          const legendSerie = data.filter((val: any) => val[legendDimension.id] === legendDimensionValue.name);
          const sortedData = sortByDimension(legendSerie, xAxisConcept);
          const latestValues = getLatestValue(sortedData, xAxisConcept);

          const seriesKey = `${datasetIndex}:${legendDimensionValue.name}`;
          let seriesEntry = columnSeriesByName.get(seriesKey);
          if (!seriesEntry) {
            seriesEntry = {
              name: legendDimensionValue.name,
              baseName: legendDimensionValue.name,
              alternateLabel,
              datasetIndex,
              id: legendDimensionValue.id,
              legendConcept,
              valueByName: new Map<any, any>(),
            };
            columnSeriesByName.set(seriesKey, seriesEntry);
          }

          latestValues
            .filter((val: any) => val.value !== null)
            .forEach((val: any) => {
              const category = val[xAxisConcept];
              if (!columnCategorySeen.has(category)) {
                columnCategorySeen.add(category);
                columnCategoryOrder.push(category);
              }
              if (seriesEntry.valueByName.has(category)) return;

              const colorByPoint = config.colorPalette?.[xAxisConcept] !== undefined;
              let itemStyle: any = undefined;
              if (colorByPoint) {
                const valXAxis = xAxisDimension.values.find((xVal: any) => xVal.name === val[xAxisConcept]);
                const c = valXAxis && paletteColor(config, xAxisConcept, valXAxis.id);
                if (c) itemStyle = { color: c };
              }
              seriesEntry.valueByName.set(category, { value: val['value'], name: val[xAxisConcept], itemStyle });
            });
        });
    } else if (chartType === 'drilldown') {
      const drilldownXAxisConcept = config.drilldown?.xAxisConcept;
      if (!drilldownXAxisConcept) throw new Error('No drilldown xAxis concept found');
      if (!legendConcept) throw new Error('No legend concept found');
      const xAxisDimension = dimensions.find((d: any) => d.id === xAxisConcept);
      const legendDimension = dimensions.find((d: any) => d.id === legendConcept);
      const drilldownXAxisDimension = dimensions.find((d: any) => d.id === drilldownXAxisConcept);
      const alternateLabel = dataObjs[datasetIndex]?.alternateLabel;
      drilldownRootConcept = xAxisConcept;

      if (drilldownCategorySortId === undefined) drilldownCategorySortId = xAxisDimension.id;
      xAxisDimension.values.forEach((xAxisDimensionValue: any) => {
        if (!drilldownCategorySeen.has(xAxisDimensionValue.name)) {
          drilldownCategorySeen.add(xAxisDimensionValue.name);
          drilldownCategoryOrder.push(xAxisDimensionValue.name);
        }
      });

      [...legendDimension.values]
        .sort((a: any, b: any) => a.id.localeCompare(b.id))
        .forEach((legendDimensionValue: any) => {
          const legendSerie = data.filter((val: any) => val[legendConcept] === legendDimensionValue.name);

          const seriesKey = `${datasetIndex}:${legendDimensionValue.name}`;
          let seriesEntry = drilldownSeriesByKey.get(seriesKey);
          if (!seriesEntry) {
            seriesEntry = {
              name: legendDimensionValue.name,
              baseName: legendDimensionValue.name,
              alternateLabel,
              datasetIndex,
              id: legendDimensionValue.id,
              legendConcept,
              valueByName: new Map<any, any>(),
              drilldownIdByName: new Map<any, string>(),
              itemStyleByName: new Map<any, any>(),
            };
            drilldownSeriesByKey.set(seriesKey, seriesEntry);
          }

          xAxisDimension.values.forEach((xAxisDimensionValue: any) => {
            let tmpArr = legendSerie.filter((val: any) => val[xAxisConcept] === xAxisDimensionValue.name);
            tmpArr = sortByDimension(tmpArr, drilldownXAxisConcept);
            let legendSerieDataValue = tmpArr.find((val: any) => val[drilldownXAxisConcept] === 'Total');
            if (drilldownXAxisConcept === 'TIME_PERIOD') {
              legendSerieDataValue = tmpArr[tmpArr.length - 1];
            } else {
              tmpArr = tmpArr.filter((val: any) => val[drilldownXAxisConcept] !== 'Total');
            }
            if (!legendSerieDataValue) return;
            if (tmpArr.length === 0) return;

            const category = xAxisDimensionValue.name;
            const drilldownId = `${datasetIndex}:${category}:${legendDimensionValue.name}`;
            if (!seriesEntry.valueByName.has(category)) {
              const pointColor = paletteColor(config, xAxisConcept, xAxisDimensionValue.id);
              seriesEntry.valueByName.set(category, legendSerieDataValue['value']);
              seriesEntry.drilldownIdByName.set(category, drilldownId);
              seriesEntry.itemStyleByName.set(category, pointColor ? { color: pointColor } : undefined);
            }

            const childData = tmpArr.map((value: any) => {
              const dimId = drilldownXAxisDimension.values.find((v: any) => v.name === value[drilldownXAxisConcept])?.id;
              const c = dimId ? paletteColor(config, drilldownXAxisConcept, dimId) : undefined;
              return {
                name: value[drilldownXAxisConcept],
                value: value['value'],
                itemStyle: c ? { color: c } : undefined,
              };
            });
            const isTime = drilldownXAxisConcept === 'TIME_PERIOD';
            const seriesColor = paletteColor(config, legendConcept, legendDimensionValue.id);
            drilldownOptions[drilldownId] = {
              tooltip: { trigger: 'item', formatter: buildTooltipFormatter(config, language) },
              grid: { containLabel: true, top: 30 },
              xAxis: {
                type: 'category',
                data: childData.map((d: any) => d.name),
                ...(isTime ? {} : { axisLabel: { interval: 0, rotate: 45 } }),
              },
              yAxis: withValueAxisFormatter({ type: 'value' }),
              series: [{
                type: isTime ? 'line' : 'bar',
                name: legendDimensionValue.name,
                data: childData,
                itemStyle: {
                  ...(seriesColor ? { color: seriesColor } : {}),
                  ...(isTime ? {} : { borderRadius: [3, 3, 0, 0] }),
                },
                ...(config.labels
                  ? {
                      label: {
                        show: true,
                        position: 'top',
                        formatter: labelFormatter(config, language, isTime ? 'line' : 'column'),
                      },
                    }
                  : {}),
              }],
            };
          });
        });
    } else if (chartType === 'pie') {
      const sortedData = sortByDimension([...data], xAxisConcept);
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
      if (seriesData.length === 0) {
        seriesData = [{
          type: 'pie',
          name: titleText || dimensions.find((dim: any) => dim.id === config.legend?.concept)?.values[0]?.name,
          data: yAxisValue,
        }];
      } else {
        (seriesData[0] as any).data.push(...yAxisValue);
      }
      if (config.legend && chartType === 'pie') {
        (seriesData[0] as any).legendHoverLink = true;
      }
    }
  });

  if (chartType === 'drilldown') {
    // Emit the root series once all datasets are known. The category list is
    // sorted as a whole, then every series is mapped onto it by name so bars
    // always sit under their own tick.
    const sortId = drilldownCategorySortId ?? 'name';
    const sortedCategories = sortByDimension(
      drilldownCategoryOrder.map((name: any) => ({ name, [sortId]: name })),
      sortId
    );
    let categories = sortedCategories.map((item: any) => item.name);

    if (config.sortByValue) {
      const totals = new Map<any, number>();
      drilldownSeriesByKey.forEach((seriesEntry: any) => {
        seriesEntry.valueByName.forEach((value: any, category: any) => {
          totals.set(category, (totals.get(category) ?? 0) + (Number(value) || 0));
        });
      });
      categories = sortByValue(
        categories.map((name: any) => ({ name, value: totals.get(name) ?? 0 })),
        config.sortByValue
      ).map((item: any) => item.name);
    }

    const entries = Array.from(drilldownSeriesByKey.values());
    const resolvedNames = resolveSeriesNames(entries);
    entries.forEach((seriesEntry: any) => {
      const seriesValues = categories.map((category: any) => {
        const value = seriesEntry.valueByName.get(category);
        if (value == null) return null;
        return {
          value,
          name: category,
          ...(drilldownRootConcept ? { [drilldownRootConcept]: category } : {}),
          drilldownId: seriesEntry.drilldownIdByName.get(category),
          itemStyle: seriesEntry.itemStyleByName.get(category),
        };
      });
      const color = paletteColor(config, seriesEntry.legendConcept, seriesEntry.id);
      seriesData.push({
        type: 'bar',
        name: resolvedNames.get(seriesEntry) ?? seriesEntry.name,
        data: seriesValues,
        itemStyle: color ? { color } : undefined,
      });
    });
    seriesData.sort(
      (a: any, b: any) =>
        b.data.filter((point: any) => point !== null).length -
        a.data.filter((point: any) => point !== null).length
    );
    xAxisValue = categories;
    xAxis = { type: 'category', data: xAxisValue, axisLabel: { interval: 0 } };
    yAxis = { type: 'value' };
  }

  if (chartType === 'column' || chartType === 'bar' || chartType === 'lollipop' || chartType === 'treemap') {
    // Emit column/bar series once all datasets are known, mapping every series
    // onto the shared category list so multi-dataset axes stay aligned.
    let categories = columnCategoryOrder;
    if (config.sortByValue) {
      const totals = new Map<any, number>();
      columnSeriesByName.forEach((seriesEntry: any) => {
        seriesEntry.valueByName.forEach((point: any, category: any) => {
          totals.set(category, (totals.get(category) ?? 0) + (Number(point.value) || 0));
        });
      });
      const sorted = sortByValue(
        columnCategoryOrder.map((name: any) => ({ name, value: totals.get(name) ?? 0 })),
        config.sortByValue
      );
      categories = sorted.map((item: any) => item.name);
    }

    const columnEntries = Array.from(columnSeriesByName.values());
    const resolvedColumnNames = resolveSeriesNames(columnEntries);

    if (chartType === 'treemap') {
      // A treemap is a single flat series; each accumulated category point is
      // one tile, with any per-item palette color already stored on the point.
      const treemapData: any[] = [];
      categories.forEach((category: any) => {
        columnEntries.forEach((seriesEntry: any) => {
          const point = seriesEntry.valueByName.get(category);
          if (point) {
            treemapData.push({
              name: point.name,
              value: point.value,
              itemStyle: point.itemStyle,
            });
          }
        });
      });
      if (treemapData.length > 0) {
        seriesData.push({ type: 'treemap', data: treemapData });
      }
    } else {
      columnEntries.forEach((seriesEntry: any) => {
        const yAxisValue = categories.map((category: any) => seriesEntry.valueByName.get(category) ?? null);
        if (yAxisValue.some((point: any) => point !== null)) {
          const color = paletteColor(config, seriesEntry.legendConcept, seriesEntry.id);
          seriesData.push({
            type: 'bar',
            name: resolvedColumnNames.get(seriesEntry) ?? seriesEntry.name,
            data: yAxisValue,
            itemStyle: color ? { color } : undefined,
          });
        }
      });
    }

    xAxisValue = categories;
    xAxis = { type: 'category', data: xAxisValue, axisLabel: { interval: 0 } };
    yAxis = { type: 'value' };
    if (chartType === 'bar') {
      const tmp = xAxis;
      xAxis = { type: 'value' };
      yAxis = { ...tmp, type: 'category' };
    }
  }

  xAxis = withValueAxisFormatter(xAxis);
  yAxis = withValueAxisFormatter(yAxis);
  xAxis = withCategoryXAxisRotation(xAxis);

  if (chartType === 'lollipop' && xAxis.type === 'category') {
    xAxis = { ...xAxis, axisTick: { show: false } };
  }

  if (chartType === 'lollipop') {
    const stems: any[] = [];
    (seriesData as any[]).forEach((s: any) => {
      stems.push({ ...s, barWidth: 2, silent: true, z: 1 });
      stems.push({
        ...s,
        type: 'scatter',
        symbolSize: 10,
        z: 2,
      });
    });
    seriesData = stems;
  }

  if (chartType === 'treemap') {
    tooltipTrigger = 'item';
    xAxis = undefined;
    yAxis = undefined;
  }

  if (chartType === 'column' || chartType === 'bar' || chartType === 'drilldown') {
    const borderRadius = chartType === 'bar' ? [0, 3, 3, 0] : [3, 3, 0, 0];
    seriesData = (seriesData as any[]).map((s: any) =>
      s.type === 'bar'
        ? { ...s, itemStyle: { ...(s.itemStyle || {}), borderRadius } }
        : s
    );
  }

  const option: EChartsOption = {
    aria: { enabled: true },
    toolbox: { feature: { saveAsImage: {} } },
    tooltip: chartType === 'pie' || chartType === 'treemap'
      ? { trigger: tooltipTrigger, valueFormatter: (value: unknown) => formatTooltipValue(value, language) }
      : { trigger: tooltipTrigger, formatter: buildTooltipFormatter(config, language, timeAxisFormat) },
    legend: legendPosition(config.legend?.location),
    series: seriesData,
  };

  if (chartType === 'lollipop') {
    const names = (seriesData as any[]).filter((s: any) => s.type === 'bar').map((s: any) => s.name);
    option.legend = { ...(option.legend as any), data: names };
  }

  if (chartType !== 'pie' && chartType !== 'treemap') {
    const legendLabels = Array.from(
      new Set((seriesData as any[]).map((s: any) => s.name).filter(Boolean))
    );
    option.grid = { containLabel: true, ...legendGridInsets(config.legend?.location, legendLabels) };
    option.xAxis = xAxis;
    option.yAxis = yAxis;
  }

  if (config.labels) {
    option.series = (seriesData as any[]).map((s: any) => {
      if (chartType === 'lollipop' && s.type !== 'scatter') return { ...s };
      const labelPosition = s.type === 'bar'
        ? (chartType === 'bar' ? 'right' : 'top')
        : (s.type === 'line' || s.type === 'scatter' ? 'top' : undefined);
      return {
        ...s,
        label: {
          show: true,
          ...(labelPosition ? { position: labelPosition } : {}),
          formatter: labelFormatter(config, language, chartType),
        },
      };
    });
  } else if (chartType === 'pie') {
    option.series = (seriesData as any[]).map((s: any) => ({
      ...s,
      label: { show: false },
      labelLine: { show: false },
    }));
  }

  const result: BuiltChart = { option, titleText, subtitleText };
  if (chartType === 'drilldown') result.drilldown = { options: drilldownOptions };
  return result;
};
