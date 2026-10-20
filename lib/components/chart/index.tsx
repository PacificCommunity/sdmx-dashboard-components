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
import parse from 'html-react-parser';
import styles from '../../global.module.css';

interface ChartProps extends React.HTMLAttributes<HTMLDivElement> {
  config: SDMXChartConfig;
  language: string;
  placeholder?: React.JSX.Element;
  callback?: (chart: EChartsType) => void;
  theme?: string;
}

const alignClass = (align?: 'center' | 'left' | 'right') =>
  align === 'left' ? 'text-start' : align === 'right' ? 'text-end' : align === 'center' ? 'text-center' : '';

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

const Chart = ({ config, language, placeholder, callback, theme, className, style, ...props }: ChartProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [titleText, setTitleText] = useState('');
  const [subtitleText, setSubtitleText] = useState('');
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
      const mergedChild = mergeExtraOptions(child, config.extraOptions);
      stackRef.current.push(mergedChild);
      chart.setOption(mergedChild, { notMerge: true });
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

      const merged = mergeExtraOptions(built.option, config.extraOptions);
      drilldownRef.current = built.drilldown;
      baseOptionRef.current = merged;
      stackRef.current = [merged];

      const existingChart = chartRef.current;
      const chart = existingChart ?? echarts.init(containerRef.current, activeThemeRef.current);
      if (!existingChart) {
        attachDrilldownHandler(chart);
        chartRef.current = chart;
      }

      chart.setOption(merged, { notMerge: true });
      setTitleText(built.titleText);
      setSubtitleText(built.subtitleText);
      setIsLoading(false);
      if (callbackRef.current) callbackRef.current(chart);
    }).catch((err) => {
      if (disposed) return;
      console.error(err);
      setError('Failed to load chart.');
      setIsLoading(false);
    });

    const resizeObserver = new ResizeObserver(() => chartRef.current?.resize());
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
    chart.dispose();
    const nextChart = echarts.init(container, activeTheme);
    attachDrilldownHandler(nextChart);
    chartRef.current = nextChart;
    if (current) nextChart.setOption(current, { notMerge: true });
    if (callbackRef.current) callbackRef.current(nextChart);
  }, [activeTheme, attachDrilldownHandler]);

  const isDarkTheme = activeTheme === 'dark';
  const hasHeader = !isLoading && !error && Boolean(config.title || config.subtitle || canGoBack);

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
      {!isLoading && !error && config.title && (
        <h2
          className={`${config.title.weight ? 'fw-' + config.title.weight : ''} ${config.title.style ? 'fst-' + config.title.style : ''} ${alignClass(config.title.align)}`}
          style={{ fontSize: config.title.size, color: config.title.color ?? (isDarkTheme ? '#EEF1FA' : undefined) }}
        >
          {parse(titleText)}
          {config.metadataLink && (
            <Button variant="link" onClick={() => window.open(config.metadataLink, '_blank')}>
              <InfoCircle />
            </Button>
          )}
        </h2>
      )}
      {!isLoading && !error && !config.title && config.metadataLink && (
        <div className="d-inline-block">
          <Button variant="link" onClick={() => window.open(config.metadataLink, '_blank')}>
            <InfoCircle />
          </Button>
        </div>
      )}
      {!isLoading && !error && config.subtitle && (
        <div
          className={`${styles.chartSubtitle} ${config.subtitle.weight ? 'fw-' + config.subtitle.weight : ''} ${config.subtitle.style ? 'fst-' + config.subtitle.style : ''} ${alignClass(config.subtitle.align ?? 'center')}`}
          style={{
            fontSize: config.subtitle.size ?? '0.8em',
            color: config.subtitle.color ?? (isDarkTheme ? '#B9B8CE' : '#666666'),
            fontFamily: config.subtitle.font ?? 'Helvetica, Arial, sans-serif',
            textAlign: config.subtitle.align ?? 'center',
          }}
        >
          {parse(subtitleText)}
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
