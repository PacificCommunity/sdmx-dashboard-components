import type { ChartBuilder } from '../../utils/chartHelpers';
import {
  applyBarBorderRadius,
  applySeriesLabels,
  buildCartesianGrid,
  buildCartesianTooltip,
  buildColumnLikeSeries,
  buildLegend,
  collectColumnLike,
  finalizeCartesianAxes,
  sortColumnLikeCategories,
} from '../../utils/chartHelpers';

export const buildBar: ChartBuilder = (context) => {
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
  const series = applySeriesLabels(
    applyBarBorderRadius(bars, 'bar'),
    config,
    language,
    'bar'
  );
  const axes = finalizeCartesianAxes(
    { type: 'value' },
    { type: 'category', data: categories, axisLabel: { interval: 0 } }
  );

  return {
    series,
    xAxis: axes.xAxis,
    yAxis: axes.yAxis,
    grid: buildCartesianGrid(config, series),
    tooltip: buildCartesianTooltip(config, language),
    legend: buildLegend(config),
  };
};
