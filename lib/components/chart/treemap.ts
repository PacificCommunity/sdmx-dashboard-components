/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ChartBuilder } from '../../utils/chartHelpers';
import {
  applySeriesLabels,
  buildLegend,
  buildValueTooltip,
  collectColumnLike,
  sortColumnLikeCategories,
} from '../../utils/chartHelpers';

export const buildTreemap: ChartBuilder = (context) => {
  const { config, language } = context;
  const collection = collectColumnLike(context);
  const categories = sortColumnLikeCategories(
    collection.categories,
    collection.entries,
    config.sortByValue
  );

  const treemapData: any[] = [];
  categories.forEach((category: any) => {
    collection.entries.forEach((seriesEntry) => {
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

  const series = treemapData.length > 0
    ? applySeriesLabels([{ type: 'treemap', data: treemapData }], config, language, 'treemap')
    : [];

  return {
    series,
    tooltip: buildValueTooltip(config, language),
    legend: buildLegend(config),
  };
};
