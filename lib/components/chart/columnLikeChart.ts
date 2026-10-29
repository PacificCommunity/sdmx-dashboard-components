import type { ChartBuilder, ChartContext } from '../../utils/chartHelpers';
import {
  buildCartesianChartParts,
  buildColumnLikeSeries,
  collectColumnLike,
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

  return buildCartesianChartParts(config, language, categories, bars, orientation);
};

export const buildBar: ChartBuilder = (context) => buildColumnLikeChart(context, 'bar');
export const buildColumn: ChartBuilder = (context) => buildColumnLikeChart(context, 'column');
