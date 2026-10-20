import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart, TreemapChart, ScatterChart } from 'echarts/charts';
import {
  AriaComponent,
  GridComponent,
  ToolboxComponent,
  TooltipComponent,
  LegendComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  TreemapChart,
  ScatterChart,
  AriaComponent,
  GridComponent,
  ToolboxComponent,
  TooltipComponent,
  LegendComponent,
  CanvasRenderer,
]);

export { echarts };
