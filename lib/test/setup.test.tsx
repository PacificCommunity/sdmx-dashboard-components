// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { init } from 'echarts/core';
import '../components/chart/register';

describe('jsdom test setup', () => {
  it('lets ECharts initialise and draw on a canvas', () => {
    const { container } = render(<div style={{ width: 400, height: 300 }} />);
    const chart = init(container.firstChild as HTMLDivElement, undefined, { width: 400, height: 300 });
    chart.setOption({ xAxis: { type: 'category', data: ['a', 'b'] }, yAxis: {}, series: [{ type: 'bar', data: [1, 2] }] });
    expect(container.querySelector('canvas')).not.toBeNull();
    chart.dispose();
  });

  it('provides a ResizeObserver', () => {
    expect(typeof window.ResizeObserver).toBe('function');
  });
});
