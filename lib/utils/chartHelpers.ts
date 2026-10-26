/* eslint-disable @typescript-eslint/no-explicit-any */
import type { EChartsOption } from 'echarts';
import { SDMXChartConfig } from '../components/types';

export type ChartType = 'line' | 'column' | 'bar' | 'lollipop' | 'treemap' | 'pie' | 'drilldown';

export type DrilldownBundle = { options: Record<string, EChartsOption> };

export type BuiltChart = {
  option: EChartsOption;
  titleText: string;
  subtitleText: string;
  drilldown?: DrilldownBundle;
};

export type ParsedDataset = {
  data: any[];
  dimensions: any[];
  activeDimensions?: any[];
  alternateLabel?: string;
  datasetIndex: number;
  titleText?: string;
  subtitleText?: string;
};

export type ChartContext = {
  config: SDMXChartConfig;
  language: string;
  datasets: ParsedDataset[];
  titleText: string;
  subtitleText: string;
};

export type ChartBuildResult = {
  series: any[];
  xAxis?: any;
  yAxis?: any;
  grid?: any;
  tooltip?: any;
  legend?: any;
  drilldown?: DrilldownBundle;
};

export type ChartBuilder = (context: ChartContext) => ChartBuildResult;

export type ColumnLikeEntry = {
  name: string;
  baseName: string;
  alternateLabel?: string;
  datasetIndex: number;
  id: string;
  legendConcept: string;
  valueByName: Map<any, any>;
};

export type ColumnLikeCollection = {
  categories: any[];
  entries: ColumnLikeEntry[];
  resolvedNames: Map<any, string>;
  xAxisConcept: string;
};

export const paletteColor = (config: SDMXChartConfig, concept: string, code: string): string | undefined => {
  const p = config.colorPalette?.[concept];
  if (!p) return undefined;
  const value: unknown = p[code];
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && typeof console !== 'undefined') {
    console.warn(
      `[SDMXChart] colorPalette.${concept}.${code} must be a hex color string; numeric color indexes are no longer supported.`
    );
  }
  return undefined;
};

export const resolveSeriesNames = (entries: any[]): Map<any, string> => {
  if (entries.length === 0) return new Map();

  const baseCounts = new Map<string, number>();
  entries.forEach((entry) => {
    const base = entry.baseName ?? entry.name;
    baseCounts.set(base, (baseCounts.get(base) ?? 0) + 1);
  });

  const preferred = entries.map((entry) => {
    const base = entry.baseName ?? entry.name;
    if ((baseCounts.get(base) ?? 0) > 1 && entry.alternateLabel) {
      return String(entry.alternateLabel);
    }
    return base;
  });

  const preferredCounts = new Map<string, number>();
  preferred.forEach((name) => preferredCounts.set(name, (preferredCounts.get(name) ?? 0) + 1));

  return new Map(
    entries.map((entry, index) => {
      let name = preferred[index];
      if ((preferredCounts.get(name) ?? 0) > 1) {
        name = `${name} (dataset ${entry.datasetIndex + 1})`;
      }
      return [entry, name];
    })
  );
};

export const legendPosition = (location?: string): EChartsOption['legend'] => {
  switch (location) {
    case 'left':
      return { orient: 'vertical', left: 0, top: 'middle', show: true };
    case 'right':
      return { orient: 'vertical', right: 0, top: 'middle', show: true };
    case 'top':
      return { orient: 'horizontal', top: 0, left: 'center', show: true };
    case 'none':
      return { show: false };
    case 'bottom':
    default:
      return { orient: 'horizontal', bottom: 0, left: 'center', show: true };
  }
};

export const legendGridInsets = (
  location: string | undefined,
  labels: string[] = []
): { left?: number; right?: number; top?: number; bottom?: number } => {
  const longestLabel = labels.reduce((max, label) => Math.max(max, String(label).length), 0);
  const sideInset = Math.min(320, Math.max(140, longestLabel * 7 + 40));
  const legendRows = Math.max(1, Math.ceil(labels.length / 6));
  const verticalInset = 15 + legendRows * 18;
  switch (location) {
    case 'left':
      return { left: sideInset };
    case 'right':
      return { right: sideInset };
    case 'top':
      return { top: verticalInset };
    case 'bottom':
      return { bottom: verticalInset };
    case 'none':
    default:
      return {};
  }
};

export const abbreviateNumber = (value: number): string => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '';
  const abs = Math.abs(numeric);
  const sign = numeric < 0 ? '-' : '';
  const format = (n: number) => {
    const text = n.toFixed(1);
    return text.endsWith('.0') ? text.slice(0, -2) : text;
  };
  if (abs >= 1e9) return `${sign}${format(abs / 1e9)}B`;
  if (abs >= 1e6) return `${sign}${format(abs / 1e6)}M`;
  if (abs >= 1e3) return `${sign}${format(abs / 1e3)}k`;
  return String(numeric);
};

export const withValueAxisFormatter = (axis: any) => {
  if (axis && axis.type === 'value') {
    axis.axisLabel = { ...(axis.axisLabel || {}), formatter: abbreviateNumber };
  }
  return axis;
};

export const hasExplicitAxisLabelRotation = (extraOptions: EChartsOption | undefined): boolean => {
  const xAxis = (extraOptions as any)?.xAxis;
  if (!xAxis) return false;
  const axes = Array.isArray(xAxis) ? xAxis : [xAxis];
  return axes.some((axis: any) => axis?.axisLabel?.rotate !== undefined);
};

const Y_AXIS_TITLE_DEFAULT_FONT_SIZE = 12;
const Y_AXIS_TITLE_LABEL_MARGIN = 12;

let textMeasureContext: CanvasRenderingContext2D | null | undefined;

const getTextMeasureContext = (): CanvasRenderingContext2D | null => {
  if (textMeasureContext !== undefined) return textMeasureContext;
  if (typeof document === 'undefined') {
    textMeasureContext = null;
    return null;
  }
  textMeasureContext = document.createElement('canvas').getContext('2d');
  return textMeasureContext;
};

const measureTextWidth = (text: string, font: string, fallbackFontSize: number): number => {
  const context = getTextMeasureContext();
  if (!context) return text.length * fallbackFontSize * 0.55;
  context.font = font;
  return context.measureText(text).width;
};

const measureLongestLine = (label: unknown, font: string, fallbackFontSize: number): number =>
  String(label ?? '')
    .split(/\r?\n/)
    .reduce((max, line) => Math.max(max, measureTextWidth(line, font, fallbackFontSize)), 0);

const axisLabelFont = (axis: any): { font: string; fontSize: number } => {
  const label = axis?.axisLabel || {};
  const fontSize = Number(label.fontSize) || Y_AXIS_TITLE_DEFAULT_FONT_SIZE;
  const fontFamily = label.fontFamily || 'sans-serif';
  const fontWeight = label.fontWeight || 'normal';
  const fontStyle = label.fontStyle || 'normal';
  return {
    font: `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`,
    fontSize,
  };
};

const yAxisTitleFontSize = (axis: any): number => {
  const size = Number(axis?.nameTextStyle?.fontSize);
  return Number.isFinite(size) && size > 0 ? size : Y_AXIS_TITLE_DEFAULT_FONT_SIZE;
};

const numericPointValue = (point: any): number | undefined => {
  if (typeof point === 'number') return Number.isFinite(point) ? point : undefined;
  if (Array.isArray(point)) {
    const candidate = point.length > 1 ? point[1] : point[0];
    const value = typeof candidate === 'number' ? candidate : Number(candidate);
    return Number.isFinite(value) ? value : undefined;
  }
  if (point && typeof point === 'object' && 'value' in point) {
    return numericPointValue(point.value);
  }
  return undefined;
};

const estimateValueAxisLabelWidth = (axis: any, series: any[]): number => {
  const { font, fontSize } = axisLabelFont(axis);
  const values: number[] = [];
  if (typeof axis?.min === 'number') values.push(axis.min);
  if (typeof axis?.max === 'number') values.push(axis.max);
  series.forEach((entry: any) => {
    if (!Array.isArray(entry?.data)) return;
    entry.data.forEach((point: any) => {
      const value = numericPointValue(point);
      if (value !== undefined) values.push(value);
    });
  });
  const maxAbs = values.reduce((max, value) => Math.max(max, Math.abs(value)), 0);
  const hasNegative = values.some((value) => value < 0);
  const formatted = abbreviateNumber(maxAbs);
  const candidates = hasNegative ? [formatted, `-${formatted}`] : [formatted];
  const measured = candidates.reduce(
    (max, text) => Math.max(max, measureTextWidth(text, font, fontSize)),
    0
  );
  return measured + fontSize * 0.5;
};

const estimateYAxisLabelWidth = (axis: any, series: any[]): number => {
  if (axis?.type === 'category' && Array.isArray(axis.data)) {
    const { font, fontSize } = axisLabelFont(axis);
    const labels = axis.data as unknown[];
    const longest = labels.reduce<number>(
      (max, label) => Math.max(max, measureLongestLine(label, font, fontSize)),
      0
    );
    return Math.max(1, longest);
  }
  return estimateValueAxisLabelWidth(axis, series);
};

const explicitGridSides = (extraOptions: EChartsOption | undefined): Set<string> => {
  const sides = new Set<string>();
  const extraGrid = (extraOptions as any)?.grid;
  if (!extraGrid) return sides;
  const grids = Array.isArray(extraGrid) ? extraGrid : [extraGrid];
  grids.forEach((grid: any) => {
    if (grid?.left !== undefined) sides.add('left');
    if (grid?.right !== undefined) sides.add('right');
  });
  return sides;
};

export const applyYAxisTitleLayout = (option: any, extraOptions?: EChartsOption): boolean => {
  if (!option) return false;
  const axes = Array.isArray(option.yAxis) ? option.yAxis : [option.yAxis];
  const series = Array.isArray(option.series) ? option.series : [];
  const grid = !Array.isArray(option.grid) ? option.grid : undefined;
  const lockedSides = explicitGridSides(extraOptions);
  let changed = false;

  axes.forEach((axis: any) => {
    if (!axis || typeof axis.name !== 'string' || axis.name.trim() === '') return;
    if (axis.nameLocation !== undefined && axis.nameLocation !== 'middle') return;

    if (axis.nameLocation === undefined) {
      axis.nameLocation = 'middle';
      changed = true;
    }
    if (axis.nameRotate === undefined) {
      axis.nameRotate = 90;
      changed = true;
    }
    if (axis.nameGap === undefined) {
      axis.nameGap = estimateYAxisLabelWidth(axis, series) + Y_AXIS_TITLE_LABEL_MARGIN;
      changed = true;
    }

    if (grid) {
      const side = axis.position === 'right' ? 'right' : 'left';
      if (!lockedSides.has(side)) {
        const inset = yAxisTitleFontSize(axis) + 16;
        const current = grid[side];
        if (current === undefined || (typeof current === 'number' && current < inset)) {
          grid[side] = inset;
          changed = true;
        }
      }
    }
  });

  return changed;
};

const CATEGORY_LABEL_GAP = 8;
const CATEGORY_LABEL_LAYOUT_KEY = '__sdmxCategoryLabelLayout';

type CategoryLabelLayoutState = {
  originalFormatter: any;
  wrapped: string[];
  wrapper: (value: any, index: number) => string;
};

const formatCategoryLabel = (formatter: any, value: any, index: number): string => {
  if (typeof formatter === 'function') {
    try {
      return String(formatter(value, index));
    } catch {
      return String(value ?? '');
    }
  }
  if (typeof formatter === 'string') {
    return formatter.replace('{value}', String(value ?? ''));
  }
  return String(value ?? '');
};

const wrapCategoryLabel = (
  text: string,
  maxWidth: number,
  font: string,
  fontSize: number
): string[] | null => {
  const lines: string[] = [];
  const paragraphs = text.split(/\r?\n/);

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      continue;
    }

    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (measureTextWidth(candidate, font, fontSize) <= maxWidth) {
        current = candidate;
        continue;
      }
      if (current) lines.push(current);
      if (measureTextWidth(word, font, fontSize) > maxWidth) {
        return null;
      }
      current = word;
    }
    if (current) lines.push(current);
  }

  return lines.length > 0 ? lines : [''];
};

const categoryAxisPlotWidth = (option: any, width: number): number => {
  const series = Array.isArray(option?.series) ? option.series : [];
  const grid = !Array.isArray(option?.grid) ? option.grid : undefined;
  let left = 0;
  let right = 0;

  if (grid) {
    if (typeof grid.left === 'number') left = grid.left;
    else if (typeof grid.left === 'string' && grid.left.endsWith('%')) {
      left = (parseFloat(grid.left) / 100) * width;
    }
    if (typeof grid.right === 'number') right = grid.right;
    else if (typeof grid.right === 'string' && grid.right.endsWith('%')) {
      right = (parseFloat(grid.right) / 100) * width;
    }
  }

  const axes = Array.isArray(option?.yAxis) ? option.yAxis : [option?.yAxis];
  axes.forEach((axis: any) => {
    if (!axis) return;
    const labelWidth = estimateYAxisLabelWidth(axis, series) + 8;
    if (axis.position === 'right') right += labelWidth;
    else left += labelWidth;
  });

  return Math.max(0, width - left - right);
};

export const applyCategoryLabelLayout = (
  option: any,
  width: number,
  extraOptions?: EChartsOption
): boolean => {
  if (!option || width <= 0) return false;
  if (hasExplicitAxisLabelRotation(extraOptions)) return false;

  const axes = Array.isArray(option.xAxis) ? option.xAxis : [option.xAxis];
  const plotWidth = categoryAxisPlotWidth(option, width);
  let changed = false;

  axes.forEach((axis: any) => {
    if (!axis || axis.type !== 'category' || !Array.isArray(axis.data)) return;
    const labels = axis.data as unknown[];
    if (labels.length === 0 || axis.axisLabel?.show === false) return;

    const { font, fontSize } = axisLabelFont(axis);
    const available = Math.max(1, plotWidth / labels.length - CATEGORY_LABEL_GAP);

    let state = axis[CATEGORY_LABEL_LAYOUT_KEY] as CategoryLabelLayoutState | undefined;
    if (!state) {
      state = {
        originalFormatter: axis.axisLabel?.formatter,
        wrapped: [],
        wrapper: () => '',
      };
      axis[CATEGORY_LABEL_LAYOUT_KEY] = state;
    }
    const layoutState = state;

    const wrapped: string[] = [];
    let canWrap = true;
    let didWrap = false;
    for (let index = 0; index < labels.length; index += 1) {
      const originalText = formatCategoryLabel(layoutState.originalFormatter, labels[index], index);
      const lines = wrapCategoryLabel(originalText, available, font, fontSize);
      if (!lines) {
        canWrap = false;
        break;
      }
      const text = lines.join('\n');
      if (text !== originalText) didWrap = true;
      wrapped[index] = text;
    }

    const axisLabel = { ...(axis.axisLabel || {}) };
    let axisChanged = false;

    if (canWrap && didWrap) {
      layoutState.wrapped = wrapped;
      layoutState.wrapper = (value: any, index: number) => {
        const wrappedValue = layoutState.wrapped[index];
        return wrappedValue !== undefined
          ? wrappedValue
          : formatCategoryLabel(layoutState.originalFormatter, value, index);
      };
      if (axisLabel.formatter !== layoutState.wrapper) {
        axisLabel.formatter = layoutState.wrapper;
        axisChanged = true;
      }
    } else if (layoutState.originalFormatter === undefined) {
      if (axisLabel.formatter !== undefined) {
        delete axisLabel.formatter;
        axisChanged = true;
      }
    } else if (axisLabel.formatter !== layoutState.originalFormatter) {
      axisLabel.formatter = layoutState.originalFormatter;
      axisChanged = true;
    }

    const rotate = canWrap ? 0 : 45;
    if (axisLabel.rotate !== rotate) {
      axisLabel.rotate = rotate;
      axisChanged = true;
    }

    if (axisChanged) {
      axis.axisLabel = axisLabel;
      changed = true;
    }
  });

  return changed;
};

export const finalizeCartesianAxes = (xAxis: any, yAxis: any) => ({
  xAxis: withValueAxisFormatter(xAxis),
  yAxis: withValueAxisFormatter(yAxis),
});

export const formatTooltipValue = (value: unknown, language: string): string => {
  const raw = Array.isArray(value) ? value[value.length - 1] : value;
  if (raw === null || raw === undefined || raw === '') return '-';
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric.toLocaleString(language) : String(raw);
};

export const labelFormatter = (config: SDMXChartConfig, language: string, chartType: string | undefined) => {
  return (params: any) => {
    const value = Array.isArray(params.value) ? params.value[1] : params.value;
    return config?.unit?.text === '%' && params.percent !== undefined
      ? `${chartType === 'pie' ? `${params.name}: ` : ''}${params.percent.toFixed(Number(config.decimals) || 0)} %`
      : `${Number(value).toLocaleString(language)}`;
  };
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const formatTimeValue = (timestamp: number, format?: string): string => {
  const date = new Date(Number(timestamp));
  if (Number.isNaN(date.getTime())) return String(timestamp);
  return format && format.includes('MMM')
    ? `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`
    : `${date.getUTCFullYear()}`;
};

export const buildTooltipFormatter = (config: SDMXChartConfig, language: string, timeFormat?: string) => {
  const customValueFormatter = (config.extraOptions as any)?.tooltip?.valueFormatter;
  return (params: any) => {
    const list = Array.isArray(params) ? params : [params];
    if (list.length === 0 || !list[0]) return '';
    const first = list[0];
    const xValue = first.axisValueLabel
      ?? (first.name
        ? String(first.name)
        : Array.isArray(first.value) && typeof first.value[0] === 'number'
          ? formatTimeValue(first.value[0], timeFormat)
          : '');
    const lines = list.map((point: any) => {
      const rawValue = Array.isArray(point.value) ? point.value[1] : point.value;
      const formatted = typeof customValueFormatter === 'function'
        ? String(customValueFormatter(rawValue, point.dataIndex))
        : formatTooltipValue(rawValue, language);
      const series = point.seriesName ? `${point.seriesName}: ` : '';
      return `${point.marker || ''}${series}${formatted}`;
    });
    return `${xValue ? `${xValue}<br/>` : ''}${lines.join('<br/>')}`;
  };
};

export const buildEchartsTitle = (config: SDMXChartConfig, titleText: string, subtitleText: string): any => {
  if (!config.title && !config.subtitle) return undefined;
  const title: any = {};
  if (titleText) title.text = titleText;
  if (config.title?.link) {
    title.link = config.title.link;
    title.target = config.title.target ?? 'blank';
  }
  if (subtitleText) title.subtext = subtitleText;
  if (config.subtitle?.link) {
    title.sublink = config.subtitle.link;
    title.subtarget = config.subtitle.target ?? 'blank';
  }
  const align = config.title?.align ?? config.subtitle?.align ?? 'center';
  title.left = align === 'left' ? 'left' : align === 'right' ? 'right' : 'center';
  if (config.title) {
    const textStyle: any = {};
    if (config.title.size !== undefined) textStyle.fontSize = config.title.size;
    if (config.title.weight !== undefined) textStyle.fontWeight = config.title.weight;
    if (config.title.style !== undefined) textStyle.fontStyle = config.title.style;
    if (config.title.color !== undefined) textStyle.color = config.title.color;
    if (config.title.font !== undefined) textStyle.fontFamily = config.title.font;
    if (Object.keys(textStyle).length > 0) title.textStyle = textStyle;
  }
  if (config.subtitle) {
    const subtextStyle: any = {};
    if (config.subtitle.size !== undefined) subtextStyle.fontSize = config.subtitle.size ?? '0.8em';
    else subtextStyle.fontSize = '0.8em';
    if (config.subtitle.weight !== undefined) subtextStyle.fontWeight = config.subtitle.weight;
    if (config.subtitle.style !== undefined) subtextStyle.fontStyle = config.subtitle.style;
    if (config.subtitle.color !== undefined) subtextStyle.color = config.subtitle.color;
    subtextStyle.fontFamily = config.subtitle.font ?? 'Helvetica, Arial, sans-serif';
    title.subtextStyle = subtextStyle;
  }
  return title;
};

export const sortByDimension = (data: any[], dimensionId: string) => {
  return data.sort((a: any, b: any) => {
    if (dimensionId === 'TIME_PERIOD') {
      return parseInt(a[dimensionId]) - parseInt(b[dimensionId]);
    }
    return a[dimensionId].localeCompare(b[dimensionId]);
  });
};

export const sortByValue = (data: any[], order: string) => {
  data.sort((a: any, b: any) => (order === 'asc' ? a.value - b.value : b.value - a.value));
  return data;
};

export const getLatestValue = (data: any[], dimension: string) => {
  let values: any[] = [];
  values = data
    .map((dataPoint: any) => dataPoint[dimension])
    .map((e: any, i: number, final: any) => final.indexOf(e) === i && i)
    .filter((e: any) => data[e])
    .map((e: any) => data[e]);
  return values;
};

export const CARTESIAN_GRID_INSETS = { left: 0, right: 8, top: 8, bottom: 8 };

export const buildCartesianGrid = (config: SDMXChartConfig, series: any[]) => {
  const labels = Array.from(
    new Set(series.map((s: any) => s.name).filter(Boolean))
  );
  return {
    containLabel: true,
    ...CARTESIAN_GRID_INSETS,
    ...legendGridInsets(config.legend?.location, labels),
  };
};

export const buildCartesianTooltip = (config: SDMXChartConfig, language: string, timeFormat?: string) => ({
  trigger: 'item' as const,
  position: 'top' as const,
  formatter: buildTooltipFormatter(config, language, timeFormat),
});

export const buildValueTooltip = (config: SDMXChartConfig, language: string) => ({
  trigger: 'item' as const,
  valueFormatter: (value: unknown) => formatTooltipValue(value, language),
});

export const buildLegend = (config: SDMXChartConfig, data?: string[]) => {
  const legend = legendPosition(config.legend?.location);
  return data ? { ...legend, data } : legend;
};

export const applySeriesLabels = (
  series: any[],
  config: SDMXChartConfig,
  language: string,
  chartType: ChartType
) => {
  if (!config.labels) return series;
  return series.map((s: any) => {
    if (chartType === 'lollipop' && s.type !== 'scatter') return { ...s };
    const labelPosition = s.type === 'bar'
      ? (chartType === 'bar' ? 'right' : 'top')
      : (s.type === 'line' || s.type === 'scatter' ? 'top' : undefined);
    return {
      ...s,
      label: {
        show: true,
        ...(labelPosition ? { position: labelPosition } : {}),
        formatter: labelFormatter(config, language, chartType),
      },
    };
  });
};

export const applyBarLabelLayout = (option: any): boolean => {
  if (!option) return false;
  const series = Array.isArray(option.series) ? option.series : [option.series];
  const xAxis = Array.isArray(option.xAxis) ? option.xAxis[0] : option.xAxis;
  const yAxis = Array.isArray(option.yAxis) ? option.yAxis[0] : option.yAxis;
  const horizontalBars = xAxis?.type === 'value' && yAxis?.type === 'category';
  let changed = false;

  series.forEach((entry: any) => {
    if (!entry || entry.type !== 'bar') return;
    if (!entry.label || entry.label.show !== true) return;
    if (entry.label.position !== undefined) return;
    entry.label = { ...entry.label, position: horizontalBars ? 'right' : 'top' };
    changed = true;
  });

  return changed;
};

export const applyBarBorderRadius = (series: any[], chartType: ChartType) => {
  const borderRadius = chartType === 'bar' ? [0, 3, 3, 0] : [3, 3, 0, 0];
  return series.map((s: any) =>
    s.type === 'bar'
      ? { ...s, itemStyle: { ...(s.itemStyle || {}), borderRadius } }
      : s
  );
};

export const collectColumnLike = (context: ChartContext): ColumnLikeCollection => {
  const { config, datasets } = context;
  const xAxisConcept = config.xAxisConcept;
  if (!xAxisConcept) throw new Error('No xAxis concept found');

  const categories: any[] = [];
  const seen = new Set<any>();
  const byName = new Map<string, ColumnLikeEntry>();

  datasets.forEach((dataset) => {
    const { data, dimensions, activeDimensions, alternateLabel, datasetIndex } = dataset;
    const legendConcept = config.legend?.concept || '';
    const legendDimension = !legendConcept
      ? activeDimensions!.find((d: any) => d.id !== xAxisConcept)
      : dimensions.find((d: any) => d.id === legendConcept);
    const xAxisDimension = activeDimensions!.find((d: any) => d.id === xAxisConcept);

    [...legendDimension.values]
      .sort((a: any, b: any) => a.id.localeCompare(b.id))
      .forEach((legendDimensionValue: any) => {
        const legendSerie = data.filter((val: any) => val[legendDimension.id] === legendDimensionValue.name);
        const sortedData = sortByDimension(legendSerie, xAxisConcept);
        const latestValues = getLatestValue(sortedData, xAxisConcept);

        const seriesKey = `${datasetIndex}:${legendDimensionValue.name}`;
        let seriesEntry = byName.get(seriesKey);
        if (!seriesEntry) {
          seriesEntry = {
            name: legendDimensionValue.name,
            baseName: legendDimensionValue.name,
            alternateLabel,
            datasetIndex,
            id: legendDimensionValue.id,
            legendConcept,
            valueByName: new Map<any, any>(),
          };
          byName.set(seriesKey, seriesEntry);
        }

        latestValues
          .filter((val: any) => val.value !== null)
          .forEach((val: any) => {
            const category = val[xAxisConcept];
            if (!seen.has(category)) {
              seen.add(category);
              categories.push(category);
            }
            if (seriesEntry.valueByName.has(category)) return;

            const colorByPoint = config.colorPalette?.[xAxisConcept] !== undefined;
            let itemStyle: any = undefined;
            if (colorByPoint) {
              const valXAxis = xAxisDimension.values.find((xVal: any) => xVal.name === val[xAxisConcept]);
              const c = valXAxis && paletteColor(config, xAxisConcept, valXAxis.id);
              if (c) itemStyle = { color: c };
            }
            seriesEntry.valueByName.set(category, { value: val['value'], name: val[xAxisConcept], itemStyle });
          });
      });
  });

  const entries = Array.from(byName.values());
  return { categories, entries, resolvedNames: resolveSeriesNames(entries), xAxisConcept };
};

export const sortColumnLikeCategories = (
  categories: any[],
  entries: ColumnLikeEntry[],
  order?: string
) => {
  if (!order) return categories;
  const totals = new Map<any, number>();
  entries.forEach((seriesEntry) => {
    seriesEntry.valueByName.forEach((point: any, category: any) => {
      totals.set(category, (totals.get(category) ?? 0) + (Number(point.value) || 0));
    });
  });
  return sortByValue(
    categories.map((name: any) => ({ name, value: totals.get(name) ?? 0 })),
    order
  ).map((item: any) => item.name);
};

export const buildColumnLikeSeries = (
  categories: any[],
  entries: ColumnLikeEntry[],
  resolvedNames: Map<any, string>,
  config: SDMXChartConfig
) => {
  const series: any[] = [];
  entries.forEach((seriesEntry) => {
    const yAxisValue = categories.map((category: any) => seriesEntry.valueByName.get(category) ?? null);
    if (yAxisValue.some((point: any) => point !== null)) {
      const color = paletteColor(config, seriesEntry.legendConcept, seriesEntry.id);
      series.push({
        type: 'bar',
        name: resolvedNames.get(seriesEntry) ?? seriesEntry.name,
        data: yAxisValue,
        itemStyle: color ? { color } : undefined,
      });
    }
  });
  return series;
};
