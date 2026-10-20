"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { EChartsOption } from 'echarts';
import type { EChartsType, ECElementEvent } from 'echarts/core';
import { echarts } from './register';
import { buildChartOption, BuiltChart } from './options';
import { InfoCircle } from 'react-bootstrap-icons';
import { Button } from 'react-bootstrap';
import { SDMXChartConfig } from '../types';
import { merge } from 'ts-deepmerge';
import parse from 'html-react-parser';

interface ChartProps extends React.HTMLAttributes<HTMLDivElement> {
  config: SDMXChartConfig;
  language: string;
  placeholder?: React.JSX.Element;
  callback?: (chart: EChartsType) => void;
  theme?: string;
}

const alignClass = (align?: 'center' | 'left' | 'right') =>
  align === 'left' ? 'text-start' : align === 'right' ? 'text-end' : align === 'center' ? 'text-center' : '';

const Chart = ({ config, language, placeholder, callback, theme, className, style, ...props }: ChartProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [titleText, setTitleText] = useState('');
  const [subtitleText, setSubtitleText] = useState('');
  const [canGoBack, setCanGoBack] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<EChartsType | null>(null);
  const drilldownRef = useRef<BuiltChart['drilldown']>(undefined);
  const baseOptionRef = useRef<EChartsOption | null>(null);
  const stackRef = useRef<EChartsOption[]>([]);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const goBack = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;
    stackRef.current.pop();
    const previous = stackRef.current[stackRef.current.length - 1] ?? baseOptionRef.current;
    if (previous) chart.setOption(previous, { notMerge: true });
    setCanGoBack(stackRef.current.length > 1);
  }, []);

  useEffect(() => {
    let disposed = false;

    setIsLoading(true);
    setError(null);
    stackRef.current = [];
    baseOptionRef.current = null;
    drilldownRef.current = undefined;
    setCanGoBack(false);

    buildChartOption(config, language).then((built) => {
      if (disposed || !containerRef.current) return;

      const merged = merge(built.option, config.extraOptions || {}) as EChartsOption;
      drilldownRef.current = built.drilldown;
      baseOptionRef.current = merged;
      stackRef.current = [merged];

      const existingChart = chartRef.current;
      const chart = existingChart ?? echarts.init(containerRef.current, theme);
      if (!existingChart) {
        chart.on('click', (params: ECElementEvent) => {
          const data = params.data as unknown as { drilldownId?: string } | undefined;
          const id = data?.drilldownId;
          const child = id ? drilldownRef.current?.options?.[id] : undefined;
          if (!child) return;
          const mergedChild = merge(child, config.extraOptions || {}) as EChartsOption;
          stackRef.current.push(mergedChild);
          chart.setOption(mergedChild, { notMerge: true });
          setCanGoBack(stackRef.current.length > 1);
        });
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
  }, [config, language, theme]);

  const chartNode: React.ReactNode = (
    <div
      ref={containerRef}
      className={`${className || ''} ${config.frame ? 'border' : ''}`}
      style={{ width: '100%', height: 400, ...(style || {}) }}
      {...props}
    />
  );

  return (
    <>
      {!isLoading && !error && config.title && (
        <h2
          className={`${config.title.weight ? 'fw-' + config.title.weight : ''} ${config.title.style ? 'fst-' + config.title.style : ''} ${alignClass(config.title.align)}`}
          style={{ fontSize: config.title.size, color: config.title.color }}
        >
          {parse(titleText)}
          {config.metadataLink && (
            <Button variant="link" onClick={() => window.open(config.metadataLink, '_blank')}>
              <InfoCircle />
            </Button>
          )}
        </h2>
      )}
      {!isLoading && !error && config.subtitle && (
        <h4
          className={`${config.subtitle.weight ? 'fw-' + config.subtitle.weight : ''} ${config.subtitle.style ? 'fst-' + config.subtitle.style : ''} ${alignClass(config.subtitle.align)}`}
          style={{ fontSize: config.subtitle.size, color: config.subtitle.color, textAlign: config.subtitle.align }}
        >
          {parse(subtitleText)}
        </h4>
      )}
      {!isLoading && !error && canGoBack && (
        <button type="button" className="btn btn-link p-0" onClick={goBack}>
          ◀ Back
        </button>
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
};

export default Chart;
