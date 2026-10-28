/* eslint-disable @typescript-eslint/no-explicit-any */
import type { EChartsOption } from 'echarts';
import type { ChartBuilder } from '../../utils/chartHelpers';
import {
  applyBarBorderRadius,
  applySeriesLabels,
  buildCartesianGrid,
  buildCartesianTooltip,
  buildEchartsTitle,
  buildLegend,
  CARTESIAN_GRID_INSETS,
  finalizeCartesianAxes,
  labelFormatter,
  paletteColor,
  resolveSeriesNames,
  sortByDimension,
  sortByValue,
  withValueAxisFormatter,
} from '../../utils/chartHelpers';

export const buildDrilldown: ChartBuilder = (context) => {
  const { config, language, datasets, titleText, subtitleText } = context;
  const drilldownXAxisConcept = config.drilldown?.xAxisConcept;
  if (!drilldownXAxisConcept) throw new Error('No drilldown xAxis concept found');

  const drilldownOptions: Record<string, EChartsOption> = {};
  const drilldownSeriesByKey = new Map<string, any>();
  const categoryOrder: any[] = [];
  const categorySeen = new Set<any>();
  let categorySortId: string | undefined;
  let rootConcept: string | undefined;

  datasets.forEach((dataset) => {
    const { data, dimensions, alternateLabel, datasetIndex } = dataset;
    const xAxisConcept = config.xAxisConcept;
    const legendConcept = config.legend?.concept || '';
    if (!legendConcept) throw new Error('No legend concept found');

    const xAxisDimension = dimensions.find((d: any) => d.id === xAxisConcept);
    const legendDimension = dimensions.find((d: any) => d.id === legendConcept);
    const drilldownXAxisDimension = dimensions.find((d: any) => d.id === drilldownXAxisConcept);
    rootConcept = xAxisConcept;

    if (categorySortId === undefined) categorySortId = xAxisDimension.id;
    xAxisDimension.values.forEach((xAxisDimensionValue: any) => {
      if (!categorySeen.has(xAxisDimensionValue.name)) {
        categorySeen.add(xAxisDimensionValue.name);
        categoryOrder.push(xAxisDimensionValue.name);
      }
    });

    [...legendDimension.values]
      .sort((a: any, b: any) => a.id.localeCompare(b.id))
      .forEach((legendDimensionValue: any) => {
        const legendSerie = data.filter((val: any) => val[legendConcept] === legendDimensionValue.name);

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
            valueByName: new Map<any, any>(),
            drilldownIdByName: new Map<any, string>(),
            itemStyleByName: new Map<any, any>(),
            periodByName: new Map<any, any>(),
          };
          drilldownSeriesByKey.set(seriesKey, seriesEntry);
        }

        xAxisDimension.values.forEach((xAxisDimensionValue: any) => {
          let tmpArr = legendSerie.filter((val: any) => val[xAxisConcept] === xAxisDimensionValue.name);
          tmpArr = sortByDimension(tmpArr, drilldownXAxisConcept);
          let legendSerieDataValue = tmpArr.find((val: any) => val[drilldownXAxisConcept] === 'Total');
          if (drilldownXAxisConcept === 'TIME_PERIOD') {
            legendSerieDataValue = tmpArr[tmpArr.length - 1];
          } else {
            tmpArr = tmpArr.filter((val: any) => val[drilldownXAxisConcept] !== 'Total');
          }
          if (!legendSerieDataValue) return;
          if (tmpArr.length === 0) return;

          const category = xAxisDimensionValue.name;
          const drilldownId = `${datasetIndex}:${category}:${legendDimensionValue.name}`;
          if (!seriesEntry.valueByName.has(category)) {
            const pointColor = paletteColor(config, xAxisConcept, xAxisDimensionValue.id);
            seriesEntry.valueByName.set(category, legendSerieDataValue['value']);
            seriesEntry.drilldownIdByName.set(category, drilldownId);
            seriesEntry.itemStyleByName.set(category, pointColor ? { color: pointColor } : undefined);
            if (drilldownXAxisConcept === 'TIME_PERIOD') {
              seriesEntry.periodByName.set(category, legendSerieDataValue[drilldownXAxisConcept]);
            }
          }

          const childData = tmpArr.map((value: any) => {
            const dimId = drilldownXAxisDimension.values.find((v: any) => v.name === value[drilldownXAxisConcept])?.id;
            const c = dimId ? paletteColor(config, drilldownXAxisConcept, dimId) : undefined;
            return {
              name: value[drilldownXAxisConcept],
              value: value['value'],
              itemStyle: c ? { color: c } : undefined,
            };
          });
          const isTime = drilldownXAxisConcept === 'TIME_PERIOD';
          const seriesColor = paletteColor(config, legendConcept, legendDimensionValue.id)
            ?? paletteColor(config, xAxisConcept, xAxisDimensionValue.id);
          drilldownOptions[drilldownId] = {
            title: buildEchartsTitle(
              config,
              dataset.titleText ?? titleText,
              dataset.subtitleText ?? subtitleText
            ),
            tooltip: buildCartesianTooltip(config, language),
            grid: { containLabel: true, ...CARTESIAN_GRID_INSETS },
            xAxis: {
              type: 'category',
              data: childData.map((d: any) => d.name),
              ...(isTime ? {} : { axisLabel: { interval: 0 } }),
            },
            yAxis: withValueAxisFormatter({ type: 'value' }),
            series: [{
              type: isTime ? 'line' : 'bar',
              name: legendDimensionValue.name,
              data: childData,
              itemStyle: {
                ...(seriesColor ? { color: seriesColor } : {}),
                ...(isTime ? {} : { borderRadius: [3, 3, 0, 0] }),
              },
              ...(config.labels
                ? {
                    label: {
                      show: true,
                      position: 'top',
                      formatter: labelFormatter(config, language, isTime ? 'line' : 'column'),
                    },
                  }
                : {}),
            }],
          };
        });
      });
  });

  const sortId = categorySortId ?? 'name';
  const sortedCategories = sortByDimension(
    categoryOrder.map((name: any) => ({ name, [sortId]: name })),
    sortId
  );
  let categories = sortedCategories.map((item: any) => item.name);

  if (config.sortByValue) {
    const totals = new Map<any, number>();
    drilldownSeriesByKey.forEach((seriesEntry: any) => {
      seriesEntry.valueByName.forEach((value: any, category: any) => {
        totals.set(category, (totals.get(category) ?? 0) + (Number(value) || 0));
      });
    });
    categories = sortByValue(
      categories.map((name: any) => ({ name, value: totals.get(name) ?? 0 })),
      config.sortByValue
    ).map((item: any) => item.name);
  }

  const entries = Array.from(drilldownSeriesByKey.values());
  const resolvedNames = resolveSeriesNames(entries);
  const rootSeries: any[] = [];
  entries.forEach((seriesEntry: any) => {
    const seriesValues = categories.map((category: any) => {
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
    });
  });
  rootSeries.sort(
    (a: any, b: any) =>
      b.data.filter((point: any) => point !== null).length -
      a.data.filter((point: any) => point !== null).length
  );

  const series = applySeriesLabels(
    applyBarBorderRadius(rootSeries, 'drilldown'),
    config,
    language,
    'drilldown'
  );
  const axes = finalizeCartesianAxes(
    { type: 'category', data: categories, axisLabel: { interval: 0 } },
    { type: 'value' }
  );

  return {
    series,
    xAxis: axes.xAxis,
    yAxis: axes.yAxis,
    grid: buildCartesianGrid(config, series),
    tooltip: buildCartesianTooltip(config, language),
    legend: buildLegend(config),
    drilldown: { options: drilldownOptions },
  };
};
