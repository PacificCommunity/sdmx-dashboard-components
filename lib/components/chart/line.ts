import { parseDate, periodFrequency } from '../../utils/parseDate';
import type { ChartBuilder, AxisOption } from '../../utils/chartHelpers';
import type { SeriesOption } from 'echarts';
import type { SDMXObservation } from '../types';
import {
  applySeriesLabels,
  buildCartesianGrid,
  buildCartesianTooltip,
  buildLegend,
  finalizeCartesianAxes,
  paletteColor,
  sortByDimension,
  sortSeriesValues,
} from '../../utils/chartHelpers';
import { SDMXRenderError } from '../../errors';

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

export const buildLine: ChartBuilder = ({ config, numberLocale, datasets }) => {
  const series: SeriesOption[] = [];
  let xAxis: AxisOption = { type: 'category', data: [] };
  let timeAxisFormat: string | undefined;

  datasets.forEach(({ data, dimensions, annotations }) => {
    const xAxisConcept = config.xAxisConcept || 'TIME_PERIOD';
    const legendConcept = config.legend?.concept
      || dimensions.find((d) => d.id !== xAxisConcept)?.id;
    if (!legendConcept) {
      throw new SDMXRenderError('ERR_NO_SERIES_DIMENSION', `No other dimension than ${xAxisConcept} found`);
    }

    const serieDimensions = dimensions.find((d) => d.id === legendConcept);
    const isTimeAxis = xAxisConcept === 'TIME_PERIOD';

    if (isTimeAxis) {
      // FREQ is read guardedly: some dataflows have none, and then the
      // period format tells the frequency
      const freqDimension = dimensions.find((d) => d.id === 'FREQ');
      const firstPeriod = data.find((val) => val[xAxisConcept] !== undefined)?.[xAxisConcept];
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
      const categories = Array.from(new Set(data.map((val: SDMXObservation) => val[xAxisConcept])));
      xAxis = { type: 'category', data: categories, axisLabel: { interval: 0 } };
    }

    sortSeriesValues(serieDimensions.values, annotations, (a, b) => a.name.localeCompare(b.name))
      .forEach((serieDimension) => {
        const serieData = data.filter((val: SDMXObservation) => val[legendConcept] === serieDimension.name);
        if (serieData.length === 0) return;
        const sortedData = sortByDimension(serieData, xAxisConcept);
        const points: (string | number | null)[][] = sortedData.map((val: SDMXObservation) => {
          const period = val[xAxisConcept];
          return isTimeAxis
            ? [parseDate(period == null ? '' : String(period)) ?? period, val['value']]
            : [period, val['value']];
        });
        // the period sort above compares years only; order within a year by
        // timestamp so weekly and daily lines do not zig-zag
        if (isTimeAxis) {
          points.sort((a, b) =>
            typeof a[0] === 'number' && typeof b[0] === 'number' ? a[0] - b[0] : 0);
        }
        const color = paletteColor(config, legendConcept, serieDimension.id);
        series.push({
          type: 'line',
          name: serieDimension.name,
          data: points,
          itemStyle: color ? { color } : undefined,
          lineStyle: color ? { color } : undefined,
          // clicks on the line itself report a series-click
          triggerEvent: 'line',
        });
      });
  });

  const labeledSeries = applySeriesLabels(series, config, numberLocale, 'line');
  const axes = finalizeCartesianAxes(xAxis, { type: 'value' });

  return {
    series: labeledSeries,
    xAxis: axes.xAxis,
    yAxis: axes.yAxis,
    grid: buildCartesianGrid(config, labeledSeries),
    tooltip: buildCartesianTooltip(config, numberLocale, timeAxisFormat),
    legend: buildLegend(config),
  };
};
