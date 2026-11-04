import type { ChartBuilder } from '../../utils/chartHelpers';
import type { SeriesOption } from 'echarts';
import {
  applySeriesLabels,
  buildCartesianGrid,
  buildCartesianTooltip,
  buildColumnLikeSeries,
  buildLegend,
  collectColumnLike,
  finalizeCartesianAxes,
  sortColumnLikeCategories,
} from '../../utils/chartHelpers';

export const buildLollipop: ChartBuilder = (context) => {
  const { config, numberLocale } = context;
  const collection = collectColumnLike(context);
  const categories = sortColumnLikeCategories(
    collection.categories,
    collection.entries,
    config.sortByValue
  );
  const bars = buildColumnLikeSeries(
    categories,
    collection.entries,
    collection.resolvedNames,
    config
  );

  const stems: SeriesOption[] = [];
  bars.forEach((s) => {
    stems.push({ ...s, barWidth: 2, silent: true, z: 1 } as SeriesOption);
    stems.push({
      ...s,
      type: 'scatter',
      symbolSize: 10,
      z: 2,
    } as SeriesOption);
  });

  const series = applySeriesLabels(stems, config, numberLocale, 'lollipop');
  const axes = finalizeCartesianAxes(
    {
      type: 'category',
      data: categories,
      axisLabel: { interval: 0 },
      axisTick: { show: false },
    },
    { type: 'value' }
  );
  const legendNames = series
    .filter((s) => s.type === 'bar')
    .map((s) => s.name)
    .filter((name): name is string => typeof name === 'string');

  return {
    series,
    xAxis: axes.xAxis,
    yAxis: axes.yAxis,
    grid: buildCartesianGrid(config, series),
    tooltip: buildCartesianTooltip(config, numberLocale),
    legend: buildLegend(config, legendNames),
  };
};
