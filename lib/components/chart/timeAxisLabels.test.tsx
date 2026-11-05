// @vitest-environment jsdom
import { describe, it, expect, onTestFinished } from 'vitest';
import type { EChartsType } from 'echarts/core';
import { echarts } from './register';
import { platformApi, setPlatformAPI } from 'zrender/lib/core/platform';
import type { ParsedDataset } from '../../utils/chartHelpers';
import { buildChartOptionFromDatasets } from './options';
import type { SDMXChartConfig } from '../types';

type TextElement = {
    style?: { text?: unknown },
    getBoundingRect: () => { clone: () => { applyTransform: (m: unknown) => void, x: number, y: number, width: number, height: number } },
    updateTransform?: () => void,
    transform?: unknown,
};

// the drawn box of the text element showing `text`, in canvas pixels
const textBox = (chart: EChartsType, text: string) => {
    const zr = chart.getZr() as unknown as { storage: { getDisplayList: (update: boolean) => TextElement[] } };
    const element = zr.storage.getDisplayList(true).find((el) => el.style?.text === text);
    if (!element) throw new Error(`no text element "${text}"`);
    const rect = element.getBoundingRect().clone();
    element.updateTransform?.();
    if (element.transform) rect.applyTransform(element.transform);
    return { left: rect.x, right: rect.x + rect.width, top: rect.y, bottom: rect.y + rect.height };
};

// the canvas mock measures every font alike; size text by its font, as a
// browser does, so labels have real widths. zrender keeps one measuring
// context across tests, so swap its measurer
const measureTextByFontSize = () => {
    const originalMeasure = platformApi.measureText;
    setPlatformAPI({
        measureText: (text: string, font?: string) => {
            const size = Number(/(\d+(?:\.\d+)?)px/.exec(font ?? '')?.[1] ?? 12);
            return { width: text.length * size * 0.6 };
        },
    });
    onTestFinished(() => setPlatformAPI({ measureText: originalMeasure }));
};

describe('time axis labels', () => {
    const daily = (freq: string, from: string, days: number): ParsedDataset => {
        const start = Date.parse(`${from}T00:00:00Z`);
        const periods = Array.from({ length: days }, (_, i) => new Date(start + i * 86400000).toISOString().slice(0, 10))
            .filter((period) => freq !== 'B' || ![0, 6].includes(new Date(`${period}T00:00:00Z`).getUTCDay()));
        return {
            datasetIndex: 0,
            dimensions: [
                { id: 'FREQ', name: 'Frequency', keyPosition: 0, values: [{ id: freq, name: freq }] },
                { id: 'SERIES', name: 'Series', keyPosition: 1, values: [{ id: 'S', name: 'Rate' }] },
                { id: 'TIME_PERIOD', name: 'Time', keyPosition: 2, values: periods.map((p) => ({ id: p, name: p })) },
            ],
            data: periods.map((period, index) => ({ FREQ: freq, SERIES: 'Rate', TIME_PERIOD: period, value: 1 + (index % 7) / 10 })),
        };
    };
    const monthly = (): ParsedDataset => {
        const periods = Array.from({ length: 14 }, (_, i) => `${2024 + Math.floor((i + 10) / 12)}-${String(((i + 10) % 12) + 1).padStart(2, '0')}`);
        return {
            datasetIndex: 0,
            dimensions: [
                { id: 'FREQ', name: 'Frequency', keyPosition: 0, values: [{ id: 'M', name: 'Monthly' }] },
                { id: 'SERIES', name: 'Series', keyPosition: 1, values: [{ id: 'S', name: 'Rate' }] },
                { id: 'TIME_PERIOD', name: 'Time', keyPosition: 2, values: periods.map((p) => ({ id: p, name: p })) },
            ],
            data: periods.map((period) => ({ FREQ: 'M', SERIES: 'Rate', TIME_PERIOD: period, value: 2 })),
        };
    };

    // x positions of the x axis labels ECharts draws, left to right
    const drawnLabels = (dataset: ParsedDataset, width: number) => {
        const config: SDMXChartConfig = { id: 'time', type: 'line', xAxisConcept: 'TIME_PERIOD', legend: { concept: 'SERIES' }, data: 'x' };
        const option = buildChartOptionFromDatasets(config, 'en', [dataset]).option;
        const chart = echarts.init(document.createElement('div'), undefined, { width, height: 300 });
        chart.setOption({ ...option, animation: false });
        const zr = chart.getZr() as unknown as { storage: { getDisplayList: (update: boolean) => TextElement[] } };
        const labels = zr.storage.getDisplayList(true)
            .filter((el) => typeof el.style?.text === 'string' && /^(\d{4}-\d{2}-\d{2}|[A-Z][a-z]{2} \d{4})$/.test(el.style.text))
            .map((el) => ({ text: String(el.style?.text), ...textBox(chart, String(el.style?.text)) }))
            .sort((a, b) => a.left - b.left);
        chart.dispose();
        return labels;
    };

    it.each([
        ['daily', () => daily('D', '2026-06-10', 140), 700],
        ['business-day', () => daily('B', '2026-06-10', 140), 700],
        ['monthly in a narrow column', monthly, 300],
    ])('draws %s labels without overlap', (_, dataset, width) => {
        measureTextByFontSize();
        const labels = drawnLabels(dataset(), width);
        expect(labels.length).toBeGreaterThan(1);
        labels.slice(1).forEach((label, i) => expect(label.left).toBeGreaterThanOrEqual(labels[i].right));
    });
});
