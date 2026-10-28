import type { ChartBuilder, ChartContext } from '../../utils/chartHelpers';
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

type Orientation = 'bar' | 'column';

export const buildColumnLikeChart = (context: ChartContext, orientation: Orientation) => {
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
    applyBarBorderRadius(bars, orientation),
    config,
    language,
    orientation
  );

  const categoryAxis = { type: 'category', data: categories, axisLabel: { interval: 0 } };
  const valueAxis = { type: 'value' };
  const axes = orientation === 'bar'
    ? finalizeCartesianAxes(valueAxis, categoryAxis)
    : finalizeCartesianAxes(categoryAxis, valueAxis);

  return {
    series,
    xAxis: axes.xAxis,
    yAxis: axes.yAxis,
    grid: buildCartesianGrid(config, series),
    tooltip: buildCartesianTooltip(config, language),
    legend: buildLegend(config),
  };
};

export const buildBar: ChartBuilder = (context) => buildColumnLikeChart(context, 'bar');
export const buildColumn: ChartBuilder = (context) => buildColumnLikeChart(context, 'column');
