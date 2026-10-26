/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ChartBuilder } from '../../utils/chartHelpers';
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
  const { config, language } = context;
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

  const stems: any[] = [];
  bars.forEach((s: any) => {
    stems.push({ ...s, barWidth: 2, silent: true, z: 1 });
    stems.push({
      ...s,
      type: 'scatter',
      symbolSize: 10,
      z: 2,
    });
  });

  const series = applySeriesLabels(stems, config, language, 'lollipop');
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
    .filter((s: any) => s.type === 'bar')
    .map((s: any) => s.name);

  return {
    series,
    xAxis: axes.xAxis,
    yAxis: axes.yAxis,
    grid: buildCartesianGrid(config, series),
    tooltip: buildCartesianTooltip(config, language),
    legend: buildLegend(config, legendNames),
  };
};
