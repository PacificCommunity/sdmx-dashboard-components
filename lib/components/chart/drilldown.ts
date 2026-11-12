import type { EChartsOption, SeriesOption } from 'echarts';
import type { Category, ChartBuilder, SeriesNaming, TimeDimensionLike } from '../../utils/chartHelpers';
import type { SDMXObservation } from '../types';
import {
  buildCartesianChartParts,
  buildCartesianGrid,
  buildCartesianTooltip,
  buildEchartsTitle,
  buildLegend,
  CARTESIAN_GRID_INSETS,
  GRID_CONTAINS_AXIS_TEXT,
  labelFormatter,
  paletteColor,
  resolveSeriesNames,
  selectLatestRootRow,
  sortByDimension,
  sortByValue,
  sortTimePeriodValues,
  withValueAxisFormatter,
} from '../../utils/chartHelpers';
import { SDMXRenderError } from '../../errors';

// One legend series accumulated across datasets, keyed by category. The extra
// maps carry the per-category drilldown metadata the root chart needs.
type DrilldownSeriesEntry = SeriesNaming & {
  baseName: string;
  id: string;
  legendConcept: string;
  valueByName: Map<Category, number | null>;
  drilldownIdByName: Map<Category, string>;
  itemStyleByName: Map<Category, { color: string } | undefined>;
  periodByName: Map<Category, Category>;
};

// One point of a child series: the breakdown value for one value of the
// drilldown dimension.
type DrilldownChildPoint = {
  name: Category;
  value: number | null;
  itemStyle?: { color: string };
};

// The child chart for one root category. Every legend series with data for
// that category contributes a series here, so drilling into a multi-series
// column shows them all rather than only the clicked one.
type DrilldownChild = {
  isTime: boolean;
  drilldownXAxisConcept: string;
  timeDimension?: TimeDimensionLike;
  pointColor?: string;
  titleText?: string;
  subtitleText?: string;
  seriesByName: Map<string, { entry: DrilldownSeriesEntry; data: DrilldownChildPoint[] }>;
};

export const buildDrilldown: ChartBuilder = (context) => {
  const { config, numberLocale, datasets, titleText, subtitleText } = context;
  const drilldownXAxisConcept = config.drilldown?.xAxisConcept;
  if (!drilldownXAxisConcept) throw new SDMXRenderError('ERR_CONCEPT_NOT_FOUND', 'No drilldown xAxis concept found');

  const drilldownOptions: Record<string, EChartsOption> = {};
  const drilldownSeriesByKey = new Map<string, DrilldownSeriesEntry>();
  const drilldownChildren = new Map<string, DrilldownChild>();
  const categoryOrder: Category[] = [];
  const categorySeen = new Set<Category>();
  const categoriesWithData = new Set<Category>();
  let categorySortId: string | undefined;
  let rootConcept: string | undefined;

  datasets.forEach((dataset) => {
    const { data, dimensions, alternateLabel, datasetIndex } = dataset;
    const xAxisConcept = config.xAxisConcept;
    const legendConcept = config.legend?.concept || '';
    if (!legendConcept) throw new SDMXRenderError('ERR_CONCEPT_NOT_FOUND', 'No legend concept found');

    const xAxisDimension = dimensions.find((d) => d.id === xAxisConcept);
    const legendDimension = dimensions.find((d) => d.id === legendConcept);
    const drilldownXAxisDimension = dimensions.find((d) => d.id === drilldownXAxisConcept);
    const timeDimension = dimensions.find((d) => d.id === 'TIME_PERIOD');
    rootConcept = xAxisConcept;

    if (categorySortId === undefined) categorySortId = xAxisDimension.id;
    xAxisDimension.values.forEach((xAxisDimensionValue) => {
      if (!categorySeen.has(xAxisDimensionValue.name)) {
        categorySeen.add(xAxisDimensionValue.name);
        categoryOrder.push(xAxisDimensionValue.name);
      }
    });

    [...legendDimension.values]
      .sort((a, b) => a.id.localeCompare(b.id))
      .forEach((legendDimensionValue) => {
        const legendSerie = data.filter((val: SDMXObservation) => val[legendConcept] === legendDimensionValue.name);

        const seriesKey = `${datasetIndex}:${legendDimensionValue.name}`;
        let seriesEntry = drilldownSeriesByKey.get(seriesKey);
        if (!seriesEntry) {
          seriesEntry = {
            name: legendDimensionValue.name,
            baseName: legendDimensionValue.name,
            alternateLabel,
            datasetIndex,
            id: legendDimensionValue.id,
            legendConcept,
            valueByName: new Map<Category, number | null>(),
            drilldownIdByName: new Map<Category, string>(),
            itemStyleByName: new Map<Category, { color: string } | undefined>(),
            periodByName: new Map<Category, Category>(),
          };
          drilldownSeriesByKey.set(seriesKey, seriesEntry);
        }

        xAxisDimension.values.forEach((xAxisDimensionValue) => {
          let tmpArr = legendSerie.filter(
            (val: SDMXObservation) => val[xAxisConcept] === xAxisDimensionValue.name
          );
          let legendSerieDataValue: SDMXObservation | undefined;

          if (drilldownXAxisConcept === 'TIME_PERIOD') {
            legendSerieDataValue = selectLatestRootRow(tmpArr, timeDimension);
            if (!legendSerieDataValue) return;
            tmpArr = sortTimePeriodValues(tmpArr, timeDimension);
          } else if (timeDimension) {
            legendSerieDataValue = selectLatestRootRow(tmpArr, timeDimension, {
              preferredDimension: drilldownXAxisConcept,
              preferredValue: 'Total',
            });
            if (!legendSerieDataValue) return;
            tmpArr = tmpArr.filter(
              (val: SDMXObservation) =>
                val['TIME_PERIOD'] === legendSerieDataValue['TIME_PERIOD'] &&
                val[drilldownXAxisConcept] !== 'Total'
            );
            tmpArr = sortByDimension(tmpArr, drilldownXAxisConcept);
            if (tmpArr.length === 0) return;
          } else {
            tmpArr = sortByDimension(tmpArr, drilldownXAxisConcept);
            legendSerieDataValue = tmpArr.find(
              (val: SDMXObservation) => val[drilldownXAxisConcept] === 'Total'
            );
            tmpArr = tmpArr.filter(
              (val: SDMXObservation) => val[drilldownXAxisConcept] !== 'Total'
            );
            if (!legendSerieDataValue || tmpArr.length === 0) return;
          }
          if (!legendSerieDataValue) return;
          if (tmpArr.length === 0) return;

          const category = xAxisDimensionValue.name;
          // one child chart per root category, shared by every legend series:
          // drilling in must keep all the series drawn for that category
          const drilldownId = `${datasetIndex}:${category}`;
          const pointColor = paletteColor(config, xAxisConcept, xAxisDimensionValue.id);
          if (!seriesEntry.valueByName.has(category)) {
            seriesEntry.valueByName.set(category, legendSerieDataValue['value']);
            seriesEntry.drilldownIdByName.set(category, drilldownId);
            seriesEntry.itemStyleByName.set(category, pointColor ? { color: pointColor } : undefined);
            categoriesWithData.add(category);
            if (legendSerieDataValue['TIME_PERIOD']) {
              seriesEntry.periodByName.set(category, legendSerieDataValue['TIME_PERIOD']);
            }
          }

          const childData: DrilldownChildPoint[] = tmpArr.map((value: SDMXObservation) => {
            const dimId = drilldownXAxisDimension.values.find((v) => v.name === value[drilldownXAxisConcept])?.id;
            const c = dimId ? paletteColor(config, drilldownXAxisConcept, dimId) : undefined;
            return {
              name: value[drilldownXAxisConcept],
              value: value['value'],
              itemStyle: c ? { color: c } : undefined,
            };
          });
          let child = drilldownChildren.get(drilldownId);
          if (!child) {
            child = {
              isTime: drilldownXAxisConcept === 'TIME_PERIOD',
              drilldownXAxisConcept,
              timeDimension,
              pointColor,
              titleText: dataset.titleText ?? titleText,
              subtitleText: dataset.subtitleText ?? subtitleText,
              seriesByName: new Map(),
            };
            drilldownChildren.set(drilldownId, child);
          }
          // the first legend value seen for the category wins, as for the root
          if (!child.seriesByName.has(legendDimensionValue.name)) {
            child.seriesByName.set(legendDimensionValue.name, { entry: seriesEntry, data: childData });
          }
        });
      });
  });

  const sortId = categorySortId ?? 'name';
  const sortedCategories = sortByDimension(
    categoryOrder
      .filter((name) => categoriesWithData.has(name))
      .map((name) => ({ name, [sortId]: name })),
    sortId
  );
  let categories = sortedCategories.map((item) => item.name);

  if (config.sortByValue) {
    const totals = new Map<Category, number>();
    drilldownSeriesByKey.forEach((seriesEntry) => {
      seriesEntry.valueByName.forEach((value, category) => {
        totals.set(category, (totals.get(category) ?? 0) + (Number(value) || 0));
      });
    });
    categories = sortByValue(
      categories.map((name) => ({ name, value: totals.get(name) ?? 0 })),
      config.sortByValue
    ).map((item) => item.name);
  }

  const entries = Array.from(drilldownSeriesByKey.values());
  const resolvedNames = resolveSeriesNames(entries);

  // The breakdown values of one child chart, in the order its series were
  // sorted: chronological for a time drilldown, by the drilldown dimension
  // otherwise. A series that does not cover a value gets an explicit null.
  const childCategories = (child: DrilldownChild): Category[] => {
    const seen = new Set<Category>();
    child.seriesByName.forEach(({ data }) => {
      data.forEach((point) => seen.add(point.name));
    });
    const names = Array.from(seen);
    if (child.isTime) {
      return sortTimePeriodValues(
        names.map((name): SDMXObservation => ({ value: null, name, TIME_PERIOD: name })),
        child.timeDimension
      ).map((row) => row.name);
    }
    return sortByDimension(
      names.map((name) => ({ name, [child.drilldownXAxisConcept]: name })),
      child.drilldownXAxisConcept
    ).map((row) => row.name);
  };

  drilldownChildren.forEach((child, drilldownId) => {
    const names = childCategories(child);
    const childSeries = Array.from(child.seriesByName.values());
    const seriesNames = childSeries.map(
      ({ entry }) => resolvedNames.get(entry) ?? entry.name
    );
    const series = childSeries.map(({ entry, data }, index) => {
      const byName = new Map(data.map((point) => [point.name, point]));
      const seriesColor = paletteColor(config, entry.legendConcept, entry.id) ?? child.pointColor;
      // with several series the colour identifies the series, so the
      // drilldown-dimension point colours of the single-series child would
      // paint every series alike and are dropped
      const keepPointColor = childSeries.length === 1;
      return {
        type: child.isTime ? 'line' : 'bar',
        name: seriesNames[index],
        data: names.map((name) => {
          const point = byName.get(name) ?? { name, value: null };
          return keepPointColor ? point : { name: point.name, value: point.value };
        }),
        itemStyle: {
          ...(seriesColor ? { color: seriesColor } : {}),
          ...(child.isTime ? {} : { borderRadius: [3, 3, 0, 0] }),
        },
        ...(config.labels
          ? {
              label: {
                show: true,
                position: 'top',
                formatter: labelFormatter(config, numberLocale, child.isTime ? 'line' : 'column'),
              },
            }
          : {}),
      } as SeriesOption;
    });
    drilldownOptions[drilldownId] = {
      title: buildEchartsTitle(
        config,
        child.titleText ?? titleText,
        child.subtitleText ?? subtitleText
      ),
      tooltip: buildCartesianTooltip(config, numberLocale),
      grid: series.length > 1
        ? buildCartesianGrid(config, series)
        : { ...GRID_CONTAINS_AXIS_TEXT, ...CARTESIAN_GRID_INSETS },
      // a single-series child keeps its old chrome-free look; several series
      // need a legend to be told apart
      ...(series.length > 1 ? { legend: buildLegend(config, seriesNames) } : {}),
      xAxis: {
        type: 'category',
        data: names,
        ...(child.isTime ? {} : { axisLabel: { interval: 0 } }),
      },
      yAxis: withValueAxisFormatter({ type: 'value' }),
      series,
    };
  });

  const rootSeries: SeriesOption[] = [];
  entries.forEach((seriesEntry) => {
    const seriesValues = categories.map((category) => {
      const value = seriesEntry.valueByName.get(category);
      if (value == null) return null;
      const period = seriesEntry.periodByName.get(category);
      return {
        value,
        name: category,
        ...(rootConcept ? { [rootConcept]: category } : {}),
        ...(period ? { TIME_PERIOD: period } : {}),
        drilldownId: seriesEntry.drilldownIdByName.get(category),
        itemStyle: seriesEntry.itemStyleByName.get(category),
      };
    });
    if (!seriesValues.some((point) => point !== null)) return;
    const color = paletteColor(config, seriesEntry.legendConcept, seriesEntry.id);
    rootSeries.push({
      type: 'bar',
      name: resolvedNames.get(seriesEntry) ?? seriesEntry.name,
      data: seriesValues,
      itemStyle: color ? { color } : undefined,
    } as SeriesOption);
  });
  const pointCount = (series: SeriesOption): number => {
    const data = (series as { data?: unknown[] }).data;
    return Array.isArray(data) ? data.filter((point) => point !== null).length : 0;
  };
  rootSeries.sort((a, b) => pointCount(b) - pointCount(a));

  return {
    ...buildCartesianChartParts(config, numberLocale, categories, rootSeries, 'column'),
    drilldown: { options: drilldownOptions },
  };
};
