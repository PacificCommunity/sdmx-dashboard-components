/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useRef, useState } from 'react';
import parse from 'html-react-parser';
import { Button } from 'react-bootstrap';
import { InfoCircle } from 'react-bootstrap-icons';
import { loadDatasets } from '../chart/options';
import { parseTextExpr } from '../../utils/parseTextExpr';
import type { ParsedDataset } from '../../utils/chartHelpers';
import type { SDMXChartConfig, SDMXTableConfig } from '../types';
import { buildTableModel, type TableModel } from './model';
import styles from './styles.module.css';

interface TableProps extends React.HTMLAttributes<HTMLDivElement> {
  config: SDMXTableConfig;
  language: string;
  placeholder?: React.JSX.Element;
  callback?: (table: React.JSX.Element) => void;
}

const alignClass = (align?: string): string =>
  align === 'center' ? 'text-center' : align === 'right' ? 'text-end' : 'text-start';

const resolveText = (
  text: SDMXChartConfig['title'],
  dimensions: any[],
  language: string
): string => {
  if (!text) return '';
  if (typeof text === 'string') return parseTextExpr(text, dimensions);
  if (typeof text.text === 'string') return parseTextExpr(text.text, dimensions);
  return parseTextExpr(text.text[language] ?? '', dimensions);
};

const renderTable = (model: TableModel, config: SDMXTableConfig): React.JSX.Element => {
  const table = (
    <table className={styles.table}>
      <thead>
        <tr>
          <th scope="col" className={styles.headerCell}>{model.categoryLabel}</th>
          {model.columns.map((name, index) => (
            <th key={`${name}-${index}`} scope="col" className={styles.headerCell}>{name}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {model.rows.map((row) => (
          <tr key={row.category}>
            <th scope="row" className={styles.categoryCell}>{row.category}</th>
            {row.values.map((value, index) => (
              <td key={index} className={styles.valueCell}>{value}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="table-responsive">
      {config.dataLink ? (
        <a href={config.dataLink} target="_blank" rel="noreferrer">{table}</a>
      ) : table}
    </div>
  );
};

const Table = ({ config, language, placeholder, callback, className, style, ...props }: TableProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadedData, setLoadedData] = useState<{
    key: string;
    datasets: ParsedDataset[];
  } | null>(null);
  const [model, setModel] = useState<TableModel | null>(null);
  const [titleText, setTitleText] = useState('');
  const [subtitleText, setSubtitleText] = useState('');
  const [noteText, setNoteText] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(callback);
  const configRef = useRef(config);

  const dataKey = JSON.stringify(config.data);
  const loadKey = `${dataKey}|${language}|${config.xAxisConcept ?? ''}`;

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    configRef.current = config;
  });

  useEffect(() => {
    let cancelled = false;
    const { data, xAxisConcept } = configRef.current;
    setError(null);
    loadDatasets(data, xAxisConcept, language)
      .then((datasets) => {
        if (cancelled) return;
        setLoadedData({ key: loadKey, datasets });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        setError('Failed to load table.');
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadKey, language]);

  useEffect(() => {
    if (!loadedData || loadedData.key !== loadKey) return;
    try {
      const nextModel = buildTableModel(config, language, loadedData.datasets);
      const dimensions = loadedData.datasets[0]?.dimensions ?? [];
      setModel(nextModel);
      setTitleText(resolveText(config.title, dimensions, language));
      setSubtitleText(resolveText(config.subtitle, dimensions, language));
      setNoteText(resolveText(config.note, dimensions, language));
      setIsLoading(false);
      setError(null);
      callbackRef.current?.(renderTable(nextModel, config));
    } catch (err) {
      console.error(err);
      setError('Failed to load table.');
      setIsLoading(false);
    }
  }, [config, language, loadKey, loadedData]);

  const content = (
    <>
      {!isLoading && !error && config.metadataLink && (
        <div className="d-inline-block mb-1">
          <Button variant="link" onClick={() => window.open(config.metadataLink, '_blank')}>
            <InfoCircle />
          </Button>
        </div>
      )}
      {!isLoading && !error && titleText && (
        <h2
          className={`${config.title?.weight ? `fw-${config.title.weight}` : ''} ${alignClass(config.title?.align)}`}
          style={{
            fontSize: config.title?.size,
            color: config.title?.color,
            fontFamily: config.title?.font,
            fontStyle: config.title?.style,
            fontWeight: config.title?.weight,
          }}
        >
          {config.title?.link
            ? <a href={config.title.link} target={config.title.target ?? 'blank'} rel="noreferrer">{parse(titleText)}</a>
            : parse(titleText)}
        </h2>
      )}
      {!isLoading && !error && subtitleText && (
        <h4
          className={`${config.subtitle?.weight ? `fw-${config.subtitle.weight}` : ''} ${alignClass(config.subtitle?.align)}`}
          style={{
            fontSize: config.subtitle?.size,
            color: config.subtitle?.color,
            fontFamily: config.subtitle?.font,
            fontStyle: config.subtitle?.style,
          }}
        >
          {config.subtitle?.link
            ? <a href={config.subtitle.link} target={config.subtitle.target ?? 'blank'} rel="noreferrer">{parse(subtitleText)}</a>
            : parse(subtitleText)}
        </h4>
      )}
      {!isLoading && !error && noteText && (
        <p
          className={`${config.note?.weight ? `fw-${config.note.weight}` : ''} ${alignClass(config.note?.align)}`}
          style={{
            fontSize: config.note?.size,
            color: config.note?.color,
            fontFamily: config.note?.font,
            fontStyle: config.note?.style,
          }}
        >
          {parse(noteText)}
        </p>
      )}
      {!isLoading && !error && model && renderTable(model, config)}
    </>
  );

  return (
    <div
      ref={containerRef}
      className={`${className || ''} ${styles.container} ${config.frame ? 'border' : ''}`}
      style={{ width: '100%', ...(style || {}) }}
      {...props}
    >
      {isLoading
        ? placeholder || (
          <div className="opacity-50 d-flex align-items-center justify-content-center" style={{ minHeight: 200 }}>
            <span>Loading...</span>
          </div>
        )
        : error
          ? <div className="text-danger">{error}</div>
          : content}
    </div>
  );
};

export default Table;
