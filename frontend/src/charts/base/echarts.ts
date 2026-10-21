/**
 * ECharts, registered once with exactly the pieces this site draws with.
 *
 * Imported by component rather than wholesale — the full bundle is ~1MB
 * (docs/adr/0006). Every chart module imports `echarts` from here, so a
 * component added for one chart is available to all and registered once.
 */

import * as echarts from "echarts/core";
import { LineChart, ScatterChart } from "echarts/charts";
import {
  AxisPointerComponent,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  MarkPointComponent,
  TooltipComponent,
} from "echarts/components";
import { LabelLayout } from "echarts/features";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([
  LineChart,
  ScatterChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  AxisPointerComponent,
  MarkAreaComponent,
  MarkLineComponent,
  MarkPointComponent,
  // The live futures contracts end on the same week, a hundred yuan apart:
  // their end labels are moved apart rather than drawn over each other.
  LabelLayout,
  CanvasRenderer,
]);

export { echarts };
