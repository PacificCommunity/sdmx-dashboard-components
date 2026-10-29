/* eslint-disable @typescript-eslint/no-explicit-any */
import { parseDate } from '../../utils/parseDate';
import type { ChartBuilder } from '../../utils/chartHelpers';
import {
  applySeriesLabels,
  buildCartesianGrid,
  buildCartesianTooltip,
  buildLegend,
  finalizeCartesianAxes,
  paletteColor,
  sortByDimension,
} from '../../utils/chartHelpers';

export const buildLine: ChartBuilder = ({ config, language, datasets }) => {
  const series: any[] = [];
  let xAxis: any = { type: 'category', data: [] };
  let timeAxisFormat: string | undefined;

  datasets.forEach(({ data, dimensions }) => {
    const xAxisConcept = config.xAxisConcept || 'TIME_PERIOD';
    const legendConcept = config.legend?.concept
      || dimensions.find((d: any) => d.id !== xAxisConcept)['id'];
    if (!legendConcept) throw new Error(`No other dimension than ${xAxisConcept} found`);

    const serieDimensions = dimensions.find((d: any) => d.id === legendConcept);
    const isTimeAxis = xAxisConcept === 'TIME_PERIOD';

    if (isTimeAxis) {
      const freqDimension = dimensions.find((d: any) => d.id === 'FREQ');
      const frequency = freqDimension?.values?.[0]?.id;
      let dateFormat = '{yyyy}';
      if (frequency === 'Q' || frequency === 'M' || frequency === 'W') dateFormat = '{MMM} {yyyy}';
      else if (frequency === 'D') dateFormat = '{yyyy}-{MM}-{dd}';
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
        series.push({
          type: 'line',
          name: serieDimension.name,
          data: points,
          itemStyle: color ? { color } : undefined,
          lineStyle: color ? { color } : undefined,
        });
      });
  });

  const labeledSeries = applySeriesLabels(series, config, language, 'line');
  const axes = finalizeCartesianAxes(xAxis, { type: 'value' });

  return {
    series: labeledSeries,
    xAxis: axes.xAxis,
    yAxis: axes.yAxis,
    grid: buildCartesianGrid(config, labeledSeries),
    tooltip: buildCartesianTooltip(config, language, timeAxisFormat),
    legend: buildLegend(config),
  };
};
