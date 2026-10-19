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
  const drilldownOptions: Record<string, EChartsOption> = {};

  // Column/bar category state is shared across all datasets so series from
  // earlier datasets stay aligned with the final category axis.
  const columnCategoryOrder: any[] = [];
  const columnCategorySeen = new Set<any>();
  const columnSeriesByName = new Map<string, any>();

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
      const isTimeAxis = xAxisConcept === 'TIME_PERIOD';
      if (isTimeAxis) {
        const freqDimension = dimensions.find((d: any) => d.id === 'FREQ');
        let dateFormat = '{yyyy}';
        if (freqDimension.values[0].id === 'A') dateFormat = '{yyyy}';
        else if (freqDimension.values[0].id === 'Q' || freqDimension.values[0].id === 'M') dateFormat = '{MMM} {yyyy}';
        xAxis = { type: 'time', axisLabel: { formatter: dateFormat } };
      } else {
        const categories = Array.from(new Set(data.map((val: any) => val[xAxisConcept])));
        xAxis = { type: 'category', data: categories };
      }
      serieDimensions.values
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

      legendDimension.values
        .slice()
        .sort((a: any, b: any) => a.id.localeCompare(b.id))
        .forEach((legendDimensionValue: any) => {
          const legendSerie = data.filter((val: any) => val[legendDimension.id] === legendDimensionValue.name);
          const sortedData = sortByDimension(legendSerie, xAxisConcept);
          const latestValues = getLatestValue(sortedData, xAxisConcept);

          let seriesEntry = columnSeriesByName.get(legendDimensionValue.name);
          if (!seriesEntry) {
            seriesEntry = {
              name: legendDimensionValue.name,
              id: legendDimensionValue.id,
              legendConcept,
              valueByName: new Map<any, any>(),
            };
            columnSeriesByName.set(legendDimensionValue.name, seriesEntry);
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

      legendDimension.values
        .sort((a: any, b: any) => a.id.localeCompare(b.id))
        .forEach((legendDimensionValue: any) => {
          const legendSerie = data.filter((val: any) => val[legendConcept] === legendDimensionValue.name);
          const legendSerieData: any[] = [];
          xAxisDimension.values.forEach((xAxisDimensionValue: any) => {
            let tmpArr = legendSerie.filter((val: any) => val[xAxisConcept] === xAxisDimensionValue.name);
            tmpArr = sortByDimension(tmpArr, drilldownXAxisConcept);
            let legendSerieDataValue = tmpArr.find((val: any) => val[drilldownXAxisConcept] === 'Total');
            if (drilldownXAxisConcept === 'TIME_PERIOD') {
              legendSerieDataValue = tmpArr[tmpArr.length - 1];
            } else {
              tmpArr = tmpArr.filter((val: any) => val[drilldownXAxisConcept] !== 'Total');
            }
            if (tmpArr.length === 0) return;

            const drilldownId = `${xAxisDimensionValue.name}-${legendDimensionValue.name}`;
            const pointColor = paletteColor(config, xAxisConcept, xAxisDimensionValue.id);
            legendSerieData.push({
              value: legendSerieDataValue['value'],
              name: xAxisDimensionValue.name,
              [xAxisConcept as string]: xAxisDimensionValue.name,
              drilldownId,
              itemStyle: pointColor ? { color: pointColor } : undefined,
            });

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
            drilldownOptions[drilldownId] = {
              tooltip: { trigger: isTime ? 'axis' : 'item' },
              grid: { containLabel: true },
              xAxis: isTime
                ? { type: 'category', data: childData.map((d: any) => d.name) }
                : { type: 'category', data: childData.map((d: any) => d.name) },
              yAxis: { type: 'value' },
              series: [{
                type: isTime ? 'line' : 'bar',
                name: legendDimensionValue.name,
                data: childData,
                itemStyle: paletteColor(config, legendConcept, legendDimensionValue.id)
                  ? { color: paletteColor(config, legendConcept, legendDimensionValue.id) }
                  : undefined,
              }],
            };
          });

          if (legendSerieData.length !== 0) {
            let sorted = sortByDimension(legendSerieData, xAxisDimension.id);
            if (config.sortByValue) sorted = sortByValue(sorted, config.sortByValue);
            const color = paletteColor(config, legendConcept, legendDimensionValue.id);
            seriesData.push({
              type: 'bar',
              name: legendDimensionValue.name,
              data: sorted,
              itemStyle: color ? { color } : undefined,
            });
          }
        });
      seriesData.sort((a: any, b: any) => b.data.length - a.data.length);
      xAxis = { type: 'category', data: xAxisDimension.values.map((v: any) => v.name) };
      yAxis = { type: 'value' };
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

    if (chartType === 'treemap') {
      // A treemap is a single flat series; each accumulated category point is
      // one tile, with any per-item palette color already stored on the point.
      const treemapData: any[] = [];
      categories.forEach((category: any) => {
        columnSeriesByName.forEach((seriesEntry: any) => {
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
      columnSeriesByName.forEach((seriesEntry: any) => {
        const yAxisValue = categories.map((category: any) => seriesEntry.valueByName.get(category) ?? null);
        if (yAxisValue.some((point: any) => point !== null)) {
          const color = paletteColor(config, seriesEntry.legendConcept, seriesEntry.id);
          seriesData.push({
            type: 'bar',
            name: seriesEntry.name,
            data: yAxisValue,
            itemStyle: color ? { color } : undefined,
          });
        }
      });
    }

    xAxisValue = categories;
    xAxis = { type: 'category', data: xAxisValue };
    yAxis = { type: 'value' };
    if (chartType === 'bar') {
      const tmp = xAxis;
      xAxis = { type: 'value' };
      yAxis = { ...tmp, type: 'category' };
    }
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

  const option: EChartsOption = {
    tooltip: { trigger: tooltipTrigger },
    legend: legendPosition(config.legend?.location),
    series: seriesData,
  };

  if (chartType === 'lollipop') {
    const names = (seriesData as any[]).filter((s: any) => s.type === 'bar').map((s: any) => s.name);
    option.legend = { ...(option.legend as any), data: names };
  }

  if (chartType !== 'pie' && chartType !== 'treemap') {
    option.grid = { containLabel: true };
    option.xAxis = xAxis;
    option.yAxis = yAxis;
  }

  if (config.labels) {
    option.series = (seriesData as any[]).map((s: any) => ({
      ...s,
      label: {
        show: true,
        formatter: (params: any) => {
          const v = Array.isArray(params.value) ? params.value[1] : params.value;
          return config?.unit?.text === '%' && params.percent !== undefined
            ? `${chartType === 'pie' ? `${params.name}: ` : ''}${params.percent.toFixed(Number(config.decimals) || 0)} %`
            : `${Number(v).toLocaleString(language)}`;
        },
      },
    }));
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
