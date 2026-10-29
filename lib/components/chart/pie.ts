/* eslint-disable @typescript-eslint/no-explicit-any */
import type { EChartsOption } from 'echarts';
import type { SDMXChartConfig } from '../types';
import type { ChartBuilder } from '../../utils/chartHelpers';
import {
  buildValueTooltip,
  legendPosition,
  sortByDimension,
} from '../../utils/chartHelpers';

const pieLabelFormatter = (config: SDMXChartConfig, language: string) => {
  return (params: any) => {
    const value = Array.isArray(params.value) ? params.value[params.value.length - 1] : params.value;
    const formatted = config?.unit?.text === '%' && params.percent !== undefined
      ? `${params.percent.toFixed(Number(config.decimals) || 0)} %`
      : Number.isFinite(Number(value))
        ? Number(value).toLocaleString(language)
        : String(value ?? '');
    return `${params.name}: ${formatted}`;
  };
};

const applyPieLabels = (series: any[], config: SDMXChartConfig, language: string) =>
  series.map((s: any) => ({
    ...s,
    label: {
      show: true,
      position: 'outside',
      formatter: pieLabelFormatter(config, language),
      fontWeight: 'bold',
      overflow: 'break',
    },
    labelLine: { ...(s.labelLine || {}), show: true },
  }));

export const buildPie: ChartBuilder = ({ config, language, datasets, titleText }) => {
  const xAxisConcept = config.xAxisConcept;
  let series: any[] = [];

  datasets.forEach(({ data, dimensions, titleText: datasetTitle }) => {
    const legendConcept = config.legend?.concept || '';
    const sortedData = sortByDimension([...data], xAxisConcept);
    let yAxisValue = sortedData.map((val: any) => ({
      value: val['value'],
      name: xAxisConcept ? val[xAxisConcept] : val[legendConcept || ''],
      binValue: val.binValue,
    }));

    if (yAxisValue.length === 2 && yAxisValue[0].binValue !== undefined) {
      yAxisValue = yAxisValue.sort((a: any, b: any) => b.binValue - a.binValue);
    }

    if (series.length === 0) {
      series = [{
        type: 'pie',
        name: (datasetTitle ?? titleText) || dimensions.find((dim: any) => dim.id === config.legend?.concept)?.values[0]?.name,
        data: yAxisValue,
      }];
    } else {
      (series[0] as any).data.push(...yAxisValue);
    }

    if (config.legend) {
      (series[0] as any).legendHoverLink = true;
    }
  });

  return {
    series: applyPieLabels(series, config, language),
    tooltip: buildValueTooltip(config, language),
    legend: config.legend ? legendPosition(config.legend.location) : { show: false },
  };
};

type PieLabelLike = {
  fontSize?: number;
  fontWeight?: string | number;
  width?: number | string;
  overflow?: string;
  textStyle?: {
    fontSize?: number;
    fontWeight?: string | number;
  };
};

type PieLegendLike = {
  show?: boolean;
  orient?: string;
  textStyle?: {
    fontSize?: number;
  };
};

type PieSeriesLike = {
  type?: string;
  radius?: unknown;
  label?: PieLabelLike;
  data?: Array<{ name?: unknown }>;
};

const PIE_LABEL_LINE_LENGTH = 20;
const PIE_LABEL_MARGIN = 8;
const PIE_MIN_RADIUS = 20;
const PIE_LABEL_MIN_WIDTH = 80;
const PIE_LABEL_MAX_WIDTH = 180;
const PIE_LABEL_WIDTH_RATIO = 0.28;

let measureContext: CanvasRenderingContext2D | null | undefined;

const getMeasureContext = (): CanvasRenderingContext2D | null => {
  if (measureContext !== undefined) return measureContext;
  measureContext = typeof document === 'undefined'
    ? null
    : document.createElement('canvas').getContext('2d');
  return measureContext;
};

const measureLabelText = (text: string, font: string): number => {
  const context = getMeasureContext();
  if (!context) return text.length * 7;
  context.font = font;
  return context.measureText(text).width;
};

const getPieLegendInsets = (
  legend: PieLegendLike | PieLegendLike[] | undefined,
  labels: string[],
  width: number
): { horizontal: number; vertical: number } => {
  const entry = Array.isArray(legend) ? legend[0] : legend;
  if (!entry || entry.show === false) return { horizontal: 0, vertical: 0 };

  const fontSize = Number(entry.textStyle?.fontSize ?? 12) || 12;
  const font = `${fontSize}px sans-serif`;
  const markerWidth = 20;
  const itemGap = 12;
  const padding = 16;
  const labelWidths = labels.map((label) => measureLabelText(label, font));

  if (entry.orient === 'vertical') {
    const maxWidth = labelWidths.reduce((max, labelWidth) => Math.max(max, labelWidth), 0);
    return { horizontal: maxWidth + markerWidth + itemGap + padding, vertical: 0 };
  }

  const totalWidth = labelWidths.reduce(
    (total, labelWidth) => total + labelWidth + markerWidth + itemGap,
    0
  );
  const rows = Math.max(1, Math.ceil(totalWidth / Math.max(1, width - padding)));
  return { horizontal: 0, vertical: rows * (fontSize + 8) + padding };
};

const hasExplicitPieRadius = (config: SDMXChartConfig): boolean => {
  const extraSeries = config.extraOptions?.series as unknown;
  if (!extraSeries) return false;
  if (Array.isArray(extraSeries)) {
    return extraSeries.some((series) => {
      const candidate = series as { type?: string; radius?: unknown } | undefined;
      return candidate?.type === 'pie' && candidate.radius !== undefined;
    });
  }
  return (extraSeries as { radius?: unknown }).radius !== undefined;
};

export const applyPieRadius = (
  option: EChartsOption,
  width: number,
  height: number,
  config: SDMXChartConfig
): boolean => {
  if (width <= 0 || height <= 0 || hasExplicitPieRadius(config)) return false;
  const optionLike = option as unknown as {
    series?: PieSeriesLike | PieSeriesLike[];
    legend?: PieLegendLike | PieLegendLike[];
  };
  const series = optionLike.series;
  if (!Array.isArray(series)) return false;

  let changed = false;
  series.forEach((entry) => {
    if (entry?.type !== 'pie' || !Array.isArray(entry.data)) return;
    const fontSize = Number(entry.label?.fontSize ?? entry.label?.textStyle?.fontSize ?? 12) || 12;
    const fontWeight = entry.label?.fontWeight ?? entry.label?.textStyle?.fontWeight ?? 'normal';
    const font = `${fontWeight} ${fontSize}px sans-serif`;
    const labelNames: string[] = [];
    const valueSuffix = config.unit?.text === '%' ? ': 100 %' : ': 1,000,000';
    const maxLabelWidth = entry.data.reduce((max, item) => {
      if (item?.name === undefined || item.name === null) return max;
      const name = String(item.name);
      labelNames.push(name);
      return Math.max(max, measureLabelText(`${name}${valueSuffix}`, font));
    }, 0);
    const legendInsets = getPieLegendInsets(optionLike.legend, labelNames, width);
    const wrapWidth = Math.max(
      PIE_LABEL_MIN_WIDTH,
      Math.min(PIE_LABEL_MAX_WIDTH, width * PIE_LABEL_WIDTH_RATIO)
    );
    if (entry.label && entry.label.width !== wrapWidth) {
      entry.label.width = wrapWidth;
      entry.label.overflow = 'break';
      changed = true;
    }
    const labelWidth = Math.min(maxLabelWidth, wrapWidth);
    const labelLines = Math.max(1, Math.ceil(maxLabelWidth / wrapWidth));
    const labelHeight = labelLines * fontSize * 1.2;
    const radius = Math.max(
      PIE_MIN_RADIUS,
      Math.min(
        width / 2 - PIE_LABEL_MARGIN - PIE_LABEL_LINE_LENGTH - labelWidth - legendInsets.horizontal,
        height / 2 - PIE_LABEL_MARGIN - PIE_LABEL_LINE_LENGTH - labelHeight - legendInsets.vertical
      )
    );
    if (entry.radius !== radius) {
      entry.radius = radius;
      changed = true;
    }
  });
  return changed;
};
