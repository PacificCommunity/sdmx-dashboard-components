/* eslint-disable @typescript-eslint/no-explicit-any */
import { parseDate, periodFrequency } from '../../utils/parseDate';
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

const DAY_FORMAT = '{yyyy}-{MM}-{dd}';

// axis label (and tooltip) format per SDMX frequency. Daily, business-day and
// weekly periods need the day: with year labels every tick of a short span
// reads the same year.
const TIME_LABEL_FORMATS: Record<string, string> = {
  A: '{yyyy}',
  S: '{MMM} {yyyy}',
  T: '{MMM} {yyyy}',
  Q: '{MMM} {yyyy}',
  M: '{MMM} {yyyy}',
  W: DAY_FORMAT,
  D: DAY_FORMAT,
  B: DAY_FORMAT,
};

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
      // FREQ is read guardedly: some dataflows have none, and then the
      // period format tells the frequency
      const freqDimension = dimensions.find((d: any) => d.id === 'FREQ');
      const firstPeriod = data.find((val: any) => val[xAxisConcept] !== undefined)?.[xAxisConcept];
      const frequency = freqDimension?.values?.[0]?.id
        ?? (firstPeriod !== undefined ? periodFrequency(String(firstPeriod)) : undefined);
      const dateFormat = frequency ? TIME_LABEL_FORMATS[frequency] : undefined;
      // an unknown frequency (hourly, say) keeps ECharts' auto-scaled labels;
      // its tooltips show the full date
      timeAxisFormat = dateFormat ?? DAY_FORMAT;
      // ECharts adds month and year boundary ticks between the regular ones
      // and keeps all labels of a narrow axis: hideOverlap drops the labels
      // that would overlap a label already shown
      xAxis = { type: 'time', axisLabel: dateFormat ? { formatter: dateFormat, hideOverlap: true } : { hideOverlap: true } };
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
        // the period sort above compares years only; order within a year by
        // timestamp so weekly and daily lines do not zig-zag
        if (isTimeAxis) {
          points.sort((a: any[], b: any[]) =>
            typeof a[0] === 'number' && typeof b[0] === 'number' ? a[0] - b[0] : 0);
        }
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
