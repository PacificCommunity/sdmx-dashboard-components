"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { EChartsOption, SeriesOption } from 'echarts';
import type { EChartsType, ECElementEvent } from 'echarts/core';
import { echarts } from './register';
import { buildChartOption, BuiltChart } from './options';
import { ChevronLeft, InfoCircle } from 'react-bootstrap-icons';
import { Button } from 'react-bootstrap';
import { SDMXChartConfig } from '../types';
import { merge } from 'ts-deepmerge';
import styles from '../../global.module.css';

interface ChartProps extends React.HTMLAttributes<HTMLDivElement> {
  config: SDMXChartConfig;
  language: string;
  placeholder?: React.JSX.Element;
  callback?: (chart: EChartsType) => void;
  theme?: string;
}


const mergeExtraOptions = (option: EChartsOption, extra?: EChartsOption): EChartsOption => {
  if (!extra) return option;
  const { series: extraSeries, ...rest } = extra;
  let merged = merge(option, rest) as EChartsOption;
  if (extraSeries !== undefined) {
    if (!Array.isArray(extraSeries) && Array.isArray(merged.series)) {
      merged = {
        ...merged,
        series: (merged.series as SeriesOption[]).map((s) => merge(s, extraSeries) as SeriesOption),
      };
    } else {
      merged = merge(merged, { series: extraSeries }) as EChartsOption;
    }
  }
  return merged;
};

const TITLE_WIDTH_PADDING = 24;

type TitleLike = {
  textStyle?: {
    width?: number;
    overflow?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

type GridLike = {
  top?: number;
  [key: string]: unknown;
};

type EChartsInternals = {
  getModel: () => { getComponent: (type: string, index?: number) => unknown };
  getViewOfComponentModel: (model: unknown) => {
    group?: { getBoundingRect: () => { height: number } };
  };
};

const getTitleEntries = (option: EChartsOption | null): TitleLike[] => {
  const title = (option as unknown as { title?: TitleLike | TitleLike[] } | null)?.title;
  if (!title) return [];
  return Array.isArray(title) ? title : [title];
};

const applyTitleWidth = (option: EChartsOption | null, width: number) => {
  if (!option || width <= 0) return;
  const maxWidth = Math.max(0, width - TITLE_WIDTH_PADDING);
  getTitleEntries(option).forEach((entry) => {
    if (!entry) return;
    entry.textStyle = { ...(entry.textStyle || {}), width: maxWidth, overflow: 'break' };
  });
};

const hasExplicitTitleLayout = (config: SDMXChartConfig): boolean => {
  const extraTitle = config.extraOptions?.title as unknown as TitleLike | TitleLike[] | undefined;
  if (!extraTitle) return false;
  const entries = Array.isArray(extraTitle) ? extraTitle : [extraTitle];
  return entries.some((entry) => entry?.textStyle?.width !== undefined || entry?.textStyle?.overflow !== undefined);
};

const baseGridTop = new WeakMap<EChartsOption, number>();

const reserveTitleSpace = (chart: EChartsType, option: EChartsOption) => {
  const internals = chart as unknown as EChartsInternals;
  const titleModel = internals.getModel()?.getComponent('title', 0);
  if (!titleModel) return;
  const titleView = internals.getViewOfComponentModel(titleModel);
  const height = titleView?.group?.getBoundingRect()?.height ?? 0;
  if (!height) return;
  const grid = (option as unknown as { grid?: GridLike | GridLike[] }).grid;
  if (!grid || Array.isArray(grid)) return;
  if (!baseGridTop.has(option)) {
    baseGridTop.set(option, typeof grid.top === 'number' ? grid.top : 0);
  }
  const top = Math.max(baseGridTop.get(option) ?? 0, Math.ceil(height + 20));
  if (grid.top === top) return;
  const nextGrid = { ...grid, top };
  (option as unknown as { grid?: GridLike }).grid = nextGrid;
  chart.setOption({ grid: nextGrid } as unknown as EChartsOption);
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

const applyPieRadius = (
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

const initChart = (container: HTMLDivElement, themeName?: string): EChartsType => {
  const width = container.clientWidth;
  const height = container.clientHeight;
  if (width > 0 && height > 0) return echarts.init(container, themeName);

  const chart = echarts.init(container, themeName, { width: width || 600, height: height || 400 });
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => chart.resize());
  }
  return chart;
};

const Chart = ({ config, language, placeholder, callback, theme, className, style, ...props }: ChartProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [drilldownLabel, setDrilldownLabel] = useState('');
  const [activeTheme, setActiveTheme] = useState<string | undefined>(theme);

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<EChartsType | null>(null);
  const drilldownRef = useRef<BuiltChart['drilldown']>(undefined);
  const baseOptionRef = useRef<EChartsOption | null>(null);
  const stackRef = useRef<EChartsOption[]>([]);
  const callbackRef = useRef(callback);
  const activeThemeRef = useRef<string | undefined>(theme);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const resolveTheme = () => {
      if (theme) {
        activeThemeRef.current = theme;
        setActiveTheme(theme);
        return;
      }
      const darkContainer = containerRef.current?.closest('[data-bs-theme="dark"]');
      const nextTheme = darkContainer ? 'dark' : undefined;
      activeThemeRef.current = nextTheme;
      setActiveTheme(nextTheme);
    };
    resolveTheme();
    const observer = new MutationObserver(resolveTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-bs-theme'],
      subtree: true,
    });
    return () => observer.disconnect();
  }, [theme]);

  const goBack = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;
    stackRef.current.pop();
    const previous = stackRef.current[stackRef.current.length - 1] ?? baseOptionRef.current;
    if (previous) chart.setOption(previous, { notMerge: true });
    setCanGoBack(stackRef.current.length > 1);
    setDrilldownLabel('');
  }, []);

  const attachDrilldownHandler = useCallback((chart: EChartsType) => {
    chart.on('click', (params: ECElementEvent) => {
      const data = params.data as unknown as { drilldownId?: string } | undefined;
      const id = data?.drilldownId;
      const child = id ? drilldownRef.current?.options?.[id] : undefined;
      if (!child) return;
      if (!hasExplicitTitleLayout(config)) applyTitleWidth(child, containerRef.current?.clientWidth ?? 0);
      const mergedChild = mergeExtraOptions(child, config.extraOptions);
      stackRef.current.push(mergedChild);
      chart.setOption(mergedChild, { notMerge: true });
      reserveTitleSpace(chart, mergedChild);
      setCanGoBack(stackRef.current.length > 1);
      setDrilldownLabel(typeof params.name === 'string' ? params.name : '');
    });
  }, [config]);

  useEffect(() => {
    let disposed = false;

    setIsLoading(true);
    setError(null);
    stackRef.current = [];
    baseOptionRef.current = null;
    drilldownRef.current = undefined;
    setCanGoBack(false);
    setDrilldownLabel('');

    buildChartOption(config, language).then((built) => {
      if (disposed || !containerRef.current) return;

      if (!hasExplicitTitleLayout(config)) applyTitleWidth(built.option, containerRef.current.clientWidth);
      const merged = mergeExtraOptions(built.option, config.extraOptions);
      applyPieRadius(
        merged,
        containerRef.current.clientWidth,
        containerRef.current.clientHeight,
        config
      );
      drilldownRef.current = built.drilldown;
      baseOptionRef.current = merged;
      stackRef.current = [merged];

      const existingChart = chartRef.current;
      const chart = existingChart ?? initChart(containerRef.current, activeThemeRef.current);
      if (!existingChart) {
        attachDrilldownHandler(chart);
        chartRef.current = chart;
      }

      chart.setOption(merged, { notMerge: true });
      reserveTitleSpace(chart, merged);
      setIsLoading(false);
      if (callbackRef.current) callbackRef.current(chart);
    }).catch((err) => {
      if (disposed) return;
      console.error(err);
      setError('Failed to load chart.');
      setIsLoading(false);
    });

    const resizeObserver = new ResizeObserver(() => {
      const chart = chartRef.current;
      const container = containerRef.current;
      if (!chart || !container) return;
      chart.resize();
      const current = stackRef.current[stackRef.current.length - 1] ?? baseOptionRef.current;
      if (current) {
        if (applyPieRadius(current, container.clientWidth, container.clientHeight, config)) {
          const series = (current as unknown as { series?: PieSeriesLike | PieSeriesLike[] }).series;
          if (series) chart.setOption({ series } as unknown as EChartsOption);
        }
        if (!hasExplicitTitleLayout(config)) {
          applyTitleWidth(current, container.clientWidth);
          const title = (current as unknown as { title?: TitleLike | TitleLike[] }).title;
          if (title) chart.setOption({ title } as unknown as EChartsOption);
          reserveTitleSpace(chart, current);
        }
      }
    });
    if (containerRef.current) resizeObserver.observe(containerRef.current);

    return () => {
      disposed = true;
      resizeObserver.disconnect();
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, [config, language, attachDrilldownHandler]);

  useEffect(() => {
    activeThemeRef.current = activeTheme;
    const container = containerRef.current;
    const chart = chartRef.current;
    if (!container || !chart) return;
    const current = stackRef.current[stackRef.current.length - 1] ?? baseOptionRef.current;
    if (current && !hasExplicitTitleLayout(config)) applyTitleWidth(current, container.clientWidth);
    chart.dispose();
    const nextChart = initChart(container, activeTheme);
    attachDrilldownHandler(nextChart);
    chartRef.current = nextChart;
    if (current) {
      nextChart.setOption(current, { notMerge: true });
      reserveTitleSpace(nextChart, current);
    }
    if (callbackRef.current) callbackRef.current(nextChart);
  }, [activeTheme, attachDrilldownHandler, config]);

  const isDarkTheme = activeTheme === 'dark';
  const hasHeader = !isLoading && !error && canGoBack;

  const chartNode: React.ReactNode = (
    <div
      ref={containerRef}
      className={`${className || ''} ${config.frame ? 'border' : ''}`}
      style={{ width: '100%', height: 400, ...(style || {}) }}
      {...props}
    />
  );

  const content = (
    <>
      {!isLoading && !error && config.metadataLink && (
        <div className="d-inline-block mb-1">
          <Button variant="link" onClick={() => window.open(config.metadataLink, '_blank')}>
            <InfoCircle />
          </Button>
        </div>
      )}
      {!isLoading && !error && canGoBack && (
        <div className="d-flex align-items-center justify-content-start gap-2 mb-2" style={{ textAlign: 'left', fontSize: '0.8em' }}>
          <button
            type="button"
            className="btn btn-link p-0 text-secondary text-decoration-none d-inline-flex align-items-center"
            style={{ fontSize: 'inherit', lineHeight: 'inherit' }}
            onClick={goBack}
          >
            <ChevronLeft className="me-1" />
            Back
          </button>
          {drilldownLabel && <span className="fw-semibold">{drilldownLabel}</span>}
        </div>
      )}
      <div style={{ position: 'relative' }}>
        {config.dataLink ? (
          <a href={config.dataLink} target="_blank" rel="noreferrer">
            {chartNode}
          </a>
        ) : (
          chartNode
        )}
        {isLoading && (
          <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center">
            {placeholder || (
              <div className="opacity-50 d-table-cell align-middle" style={{ height: 400, width: 600 }}>
                Loading...
              </div>
            )}
          </div>
        )}
        {!isLoading && error && (
          <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center text-danger">
            Failed to load chart.
          </div>
        )}
      </div>
    </>
  );

  return isDarkTheme ? (
    <div className={`${styles.chartDark} ${hasHeader ? styles.chartDarkHeader : ''}`}>{content}</div>
  ) : content;
};

export default Chart;
